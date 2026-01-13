import React from "react";
import {
    Radio,
    Terminal,
    Zap,
    Moon,
    Sun,
    Layout,
    CheckCircle2,
    Loader2,
    XCircle,
    AlertCircle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/httpClient";

const EventRemoteControl: React.FC = () => {
    const queryClient = useQueryClient();

    // Fetch Current Event Config
    const eventConfigQuery = useQuery({
        queryKey: ["event-config"],
        queryFn: async () => {
            const { data } = await adminApi.get("/admin/api/vault-programs/default");
            return data;
        },
    });

    // Update Config Mutation
    const updateMutation = useMutation({
        mutationFn: async (vars: { key: string; value: any }) => {
            const programKey = (eventConfigQuery.data as any)?.key as string | undefined;
            if (!programKey) throw new Error("Missing program key");

            if (vars.key === "golden_hour_active") {
                const { data } = await adminApi.post(`/admin/api/vault-programs/${programKey}/golden-hour`, {
                    enabled: true,
                    manual_override: vars.value ? "FORCE_ON" : "FORCE_OFF",
                });
                return data;
            }

            const { data } = await adminApi.put(`/admin/api/vault-programs/${programKey}/config`, {
                config_json: { [vars.key]: vars.value },
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["event-config"] });
        }
    });

    const handleModalOverride = (modalName: string | null) => {
        updateMutation.mutate({ key: "active_modal_override", value: modalName });
    };

    const currentConfig = eventConfigQuery.data?.config_json || {};
    const isGoldenHour = currentConfig?.golden_hour_config?.manual_override === "FORCE_ON";

    return (
        <div className="admin-card overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-admin-border bg-admin-sidebar/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-admin-brand/20 text-admin-brand">
                        <Radio size={24} className="animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-admin-subtitle text-admin-text-primary">이벤트 리모트 컨트롤</h3>
                        <p className="text-admin-meta text-admin-text-muted">Real-time Event Overrides</p>
                    </div>
                </div>
                {eventConfigQuery.isLoading ? (
                    <Loader2 size={18} className="animate-spin text-admin-brand" />
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-admin-accent/10 border border-admin-accent/20">
                        <div className="w-2 h-2 rounded-full bg-admin-accent animate-ping" />
                        <span className="text-[10px] font-black text-admin-accent uppercase tracking-widest">Connected</span>
                    </div>
                )}
            </div>

            <div className="p-8 space-y-8">
                {/* Section 1: Golden Hour Control */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-admin-meta font-bold text-admin-text-primary">
                            <Zap size={16} className="text-admin-warning" />
                            골든아워 강제 조정 (Golden Hour)
                        </div>
                        <span className="text-[10px] text-admin-text-muted">보상 1.5x 배율 적용</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => updateMutation.mutate({ key: "golden_hour_active", value: true })}
                            disabled={updateMutation.isPending || isGoldenHour}
                            className={`
                p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-300
                ${isGoldenHour
                                    ? "bg-admin-warning/20 border-admin-warning text-admin-warning shadow-admin-glow"
                                    : "bg-admin-bg border-admin-border text-admin-text-muted hover:border-admin-warning/40 hover:text-admin-text-secondary"}
              `}
                        >
                            <Sun size={24} />
                            <span className="text-admin-meta font-black uppercase tracking-widest">Activate</span>
                        </button>
                        <button
                            onClick={() => updateMutation.mutate({ key: "golden_hour_active", value: false })}
                            disabled={updateMutation.isPending || !isGoldenHour}
                            className={`
                p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-300
                ${!isGoldenHour
                                    ? "bg-admin-sidebar border-admin-border text-admin-text-secondary"
                                    : "bg-admin-bg border-admin-border text-admin-text-muted hover:border-admin-text-primary"}
              `}
                        >
                            <Moon size={24} />
                            <span className="text-admin-meta font-black uppercase tracking-widest">Standby</span>
                        </button>
                    </div>
                </section>

                {/* Section 2: Modal UI Switch */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-admin-meta font-bold text-admin-text-primary">
                            <Layout size={16} className="text-admin-brand" />
                            전역 팝업 모달 제어 (Modal Override)
                        </div>
                        <span className="text-[10px] text-admin-text-muted">모든 유저 실시간 적용</span>
                    </div>

                    <div className="space-y-2">
                        {[
                            { id: "STREAK_ATTENDANCE", label: "연속 출석 체크 모달", icon: <CheckCircle2 size={14} /> },
                            { id: "SEASON_PASS_PROMO", label: "시즌패스 홍보 모달", icon: <AlertCircle size={14} /> },
                            { id: "LIMITED_OFFER", label: "한정 판매 알림", icon: <Zap size={14} /> },
                            { id: null, label: "강제 오버라이드 해제 (Default)", icon: <XCircle size={14} /> }
                        ].map((modal) => {
                            const isActive = currentConfig.active_modal_override === modal.id;
                            return (
                                <button
                                    key={String(modal.id)}
                                    onClick={() => handleModalOverride(modal.id)}
                                    disabled={updateMutation.isPending}
                                    className={`
                    w-full px-5 py-3.5 rounded-xl border flex items-center justify-between transition-all duration-200
                    ${isActive
                                            ? "bg-admin-brand/10 border-admin-brand/50 text-admin-brand"
                                            : "bg-admin-sidebar/40 border-admin-border text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary"}
                  `}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={isActive ? "text-admin-brand" : "text-admin-text-muted"}>
                                            {modal.icon}
                                        </span>
                                        <span className="text-admin-body font-bold">{modal.label}</span>
                                    </div>
                                    {isActive && <div className="w-2 h-2 rounded-full bg-admin-brand shadow-admin-glow" />}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Security Warning */}
                <div className="p-4 rounded-xl bg-admin-brand/5 border border-admin-brand/10 flex gap-3 items-start">
                    <Terminal size={16} className="text-admin-brand mt-0.5" />
                    <p className="text-[11px] text-admin-text-muted leading-relaxed">
                        리모트 컨트롤 명령은 대시보드 웹소켓을 통해 접속 중인 모든 사용자에게 즉각 전파됩니다. 대규모 트래픽 상황에서는 오버라이드 실시간 전환에 따른 서버 부하가 발생할 수 있습니다.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EventRemoteControl;

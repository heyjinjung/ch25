import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    AlertTriangle,
    ArrowRight,
    Bell,
    ChevronRight,
    Clock,
    AlertOctagon
} from "lucide-react";
import {
    getDailyOverview,
    nudgeRiskGroup,
    fetchMetricDetails,
    MetricDetailItem
} from "../../api/adminDashboardApi";
import { useToast } from "../../../components/common/ToastProvider";
import { useNavigate } from "react-router-dom";

const PendingActionsWidget: React.FC = () => {
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [detailKey, setDetailKey] = useState<"churn_risk" | "streak_risk" | null>(null);

    const { data: overview, isLoading } = useQuery({
        queryKey: ["admin", "dashboard", "daily-overview"],
        queryFn: getDailyOverview,
        refetchInterval: 60000,
    });

    const nudgeMutation = useMutation({
        mutationFn: nudgeRiskGroup,
        onSuccess: (data) => {
            addToast(`${data.nudged_count}명에�??��?�?발송?�습?�다.`, "success");
            // ?�역 ?�기?? ?�?�보??관??쿼리�???번에 갱신
            queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
        },
        onError: (error) => {
            addToast(`?��? 발송 ?�패: ${error instanceof Error ? error.message : String(error)}`, "error");
        }
    });

    const detailsQuery = useQuery<MetricDetailItem[]>({
        queryKey: ["admin", "dashboard", "details", detailKey],
        queryFn: () => fetchMetricDetails(detailKey!),
        enabled: detailKey !== null,
        staleTime: 30000,
    });

    const detailTitle = useMemo(() => {
        if (detailKey === "churn_risk") return "?�탈 ?�험 ?�?�자";
        if (detailKey === "streak_risk") return "?�트�?중단 ?�기 ?�?�자";
        return "?�세";
    }, [detailKey]);

    if (isLoading) {
        return (
            <div className="admin-card-premium p-6 flex items-center justify-center min-h-[200px]">
                <Clock className="h-6 w-6 text-admin-brand animate-spin" />
            </div>
        );
    }

    const riskCount = overview?.risk_count || 0;
    const streakRiskCount = overview?.streak_risk_count || 0;
    const totalRisks = riskCount + streakRiskCount;

    return (
        <div className="admin-card-premium h-full flex flex-col">
            <div className="p-6 border-b border-admin-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {totalRisks > 0 ? (
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-admin-warning opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-admin-warning"></span>
                        </div>
                    ) : (
                        <div className="h-3 w-3 rounded-full bg-admin-accent/50"></div>
                    )}
                    <h2 className="text-admin-subtitle text-admin-text-primary">조치 ??��</h2>
                </div>

            </div>

            <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
                {/* Risk Alerts */}
                {riskCount > 0 && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-admin-danger/10 to-transparent border border-admin-danger/20 flex flex-col gap-3 group hover:border-admin-danger/40 transition-all">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-admin-danger/20 text-admin-danger">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-admin-body font-bold text-white">?�탈 ?�험 감�?</h3>
                                    <p className="text-xs text-admin-text-secondary">
                                        <span className="text-admin-danger font-mono font-bold text-sm">
                                            {riskCount}명
                                        </span>
                                        의 회원이 이탈 징후를 보입니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => setDetailKey("churn_risk")}
                                className="mr-2 text-xs flex items-center gap-1 text-admin-text-secondary hover:text-white px-3 py-1.5 rounded-lg hover:bg-admin-hover transition-all font-bold"
                            >
                                ?�?�자 보기 <ChevronRight className="h-3 w-3" />
                            </button>
                            <button
                                onClick={() => {
                                    nudgeMutation.mutate();
                                }}
                                disabled={nudgeMutation.isPending}
                                className="text-xs flex items-center gap-1 text-admin-danger hover:text-white px-3 py-1.5 rounded-lg hover:bg-admin-danger transition-all font-bold"
                            >
                                {nudgeMutation.isPending ? "처리 �?.." : "즉시 ?��? 발송"} <ArrowRight className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Streak Alerts */}
                {streakRiskCount > 0 && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-admin-warning/10 to-transparent border border-admin-warning/20 flex flex-col gap-3 group hover:border-admin-warning/40 transition-all">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-admin-warning/20 text-admin-warning">
                                    <AlertOctagon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-admin-body font-bold text-white">?�트�?중단 ?�기</h3>
                                    <p className="text-xs text-admin-text-secondary">
                                        <span className="text-admin-warning font-mono font-bold text-sm">{streakRiskCount}�?/span>???�원???�늘 ?�트�?�� ?�칠 ???�습?�다.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => setDetailKey("streak_risk")}
                                className="text-xs flex items-center gap-1 text-admin-warning hover:text-white px-3 py-1.5 rounded-lg hover:bg-admin-warning transition-all font-bold"
                            >
                                ?�?�자 보기 <ChevronRight className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                )}

                {/* System Notice or Placeholder */}
                <button
                    type="button"
                    onClick={() => navigate("/admin/messages")}
                    className="w-full p-4 rounded-xl bg-admin-sidebar/50 border border-admin-border flex items-center justify-between hover:bg-admin-sidebar transition-colors cursor-pointer group text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-admin-brand/10 text-admin-brand group-hover:bg-admin-brand group-hover:text-white transition-colors">
                            <Bell className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-admin-text-primary group-hover:text-white">?�스??공�? ?�성</h3>
                            <p className="text-[10px] text-admin-text-secondary">?�체 ?�원 ?�???�시 메시지</p>
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-admin-text-muted group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Details Modal */}
            {detailKey !== null ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-admin-border bg-admin-bg shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-admin-border flex items-center justify-between">
                            <div>
                                <h3 className="text-admin-subtitle text-admin-text-primary">{detailTitle}</h3>
                                <p className="text-xs text-admin-text-muted">?�?�자 목록(최�? 50)</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetailKey(null)}
                                className="btn-admin-secondary"
                            >
                                ?�기
                            </button>
                        </div>

                        <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {detailsQuery.isLoading ? (
                                <div className="text-sm text-admin-text-muted">불러?�는 �?..</div>
                            ) : detailsQuery.isError ? (
                                <div className="text-sm text-admin-danger">불러?�기 ?�패</div>
                            ) : (detailsQuery.data ?? []).length === 0 ? (
                                <div className="text-sm text-admin-text-muted">?�?�자가 ?�습?�다.</div>
                            ) : (
                                <div className="space-y-2">
                                    {(detailsQuery.data ?? []).map((it) => (
                                        <div
                                            key={`${it.id}-${it.label}`}
                                            className="p-3 rounded-xl bg-admin-sidebar/50 border border-admin-border/60"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold text-admin-text-primary truncate">{it.label}</div>
                                                    <div className="text-[11px] text-admin-text-muted truncate">{it.sub_label}</div>
                                                </div>
                                                <div className="text-[11px] font-mono text-admin-text-secondary whitespace-nowrap">{it.value}</div>
                                            </div>
                                            {it.tags?.length ? (
                                                <div className="mt-2 flex gap-1 flex-wrap">
                                                    {it.tags.slice(0, 4).map((t) => (
                                                        <span
                                                            key={t}
                                                            className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 border border-admin-border/40 text-admin-text-muted"
                                                        >
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-admin-border flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => {
                                    if (detailKey === "churn_risk") {
                                        setDetailKey("churn_risk");
                                    }
                                    if (detailKey === "streak_risk") {
                                        setDetailKey("streak_risk");
                                    }
                                    queryClient.invalidateQueries({ queryKey: ["admin", "dashboard", "details", detailKey] });
                                }}
                                className="btn-admin-secondary"
                            >
                                ?�로고침
                            </button>
                            <button type="button" onClick={() => setDetailKey(null)} className="btn-admin-primary">
                                ?�인
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default PendingActionsWidget;

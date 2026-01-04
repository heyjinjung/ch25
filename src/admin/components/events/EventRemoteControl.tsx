import React, { useState, useEffect } from "react";
import { Zap, Bell, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { getVaultDefaultProgram, updateVaultConfig, VaultProgramResponse } from "../../api/adminVaultApi";

const EventRemoteControl: React.FC = () => {
    const [program, setProgram] = useState<VaultProgramResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            setErrorMessage(null);
            const data = await getVaultDefaultProgram();
            setProgram(data);
        } catch (err) {
            console.error("Failed to fetch vault config", err);
            const detail = (err as any)?.response?.data?.detail;
            setErrorMessage(detail ? String(detail) : "설정을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (key: string, value: any) => {
        if (!program) return;
        try {
            setUpdating(true);
            setErrorMessage(null);
            const baseConfig = (program.config_json && typeof program.config_json === "object") ? program.config_json : {};
            const newConfig = { ...baseConfig, [key]: value };
            const updated = await updateVaultConfig(program.key, newConfig);
            setProgram(updated);
        } catch (err) {
            console.error("Update failed", err);
            const detail = (err as any)?.response?.data?.detail;
            setErrorMessage(detail ? String(detail) : "업데이트에 실패했습니다.");
        } finally {
            setUpdating(false);
        }
    };

    const handleGHOverride = (override: string) => {
        const ghConfig = { ...program?.config_json?.golden_hour_config };
        ghConfig.manual_override = override;
        handleUpdate("golden_hour_config", ghConfig);
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-figma-primary" /></div>;

    const currentGH = program?.config_json?.golden_hour_config?.manual_override || "AUTO";
    const currentModal = program?.config_json?.show_modal_override || null;

    return (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                    <Zap className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-white">이벤트 및 팝업 원격 제어</h3>
                    <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Event Remote Control</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Golden Hour Control */}
                <section>
                    <label className="text-xs font-black text-white/60 uppercase tracking-widest mb-3 block">골든 아워 전역 설정</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: "AUTO", label: "자동 (시간기준)", icon: <Loader2 className="w-3 h-3" /> },
                            { id: "FORCE_ON", label: "강제 활성화", icon: <CheckCircle2 className="w-3 h-3" /> },
                            { id: "FORCE_OFF", label: "강제 비활성화", icon: <AlertCircle className="w-3 h-3" /> },
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                disabled={updating}
                                onClick={() => handleGHOverride(btn.id)}
                                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${currentGH === btn.id
                                    ? "bg-figma-primary border-figma-primary text-white shadow-lg shadow-emerald-900/40"
                                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                                    }`}
                            >
                                {btn.icon}
                                <span className="text-[10px] font-black">{btn.label}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {errorMessage ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs font-bold text-red-100">
                        {errorMessage}
                    </div>
                ) : null}

                {/* Global Modal Trigger */}
                <section>
                    <label className="text-xs font-black text-white/60 uppercase tracking-widest mb-3 block flex items-center gap-2">
                        <Bell className="w-3 h-3" /> 전역 팝업 강제 트리거
                    </label>
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                disabled={updating}
                                onClick={() => handleUpdate("show_modal_override", "GOLDEN_HOUR")}
                                className={`py-3 rounded-xl border text-[10px] font-black transition-all ${currentModal === "GOLDEN_HOUR" ? "bg-amber-500 border-amber-500 text-white" : "bg-white/5 border-white/10 text-white/60"
                                    }`}
                            >
                                골든아워 안내 팝업
                            </button>
                            <button
                                disabled={updating}
                                onClick={() => handleUpdate("show_modal_override", "STREAK_ATTENDANCE")}
                                className={`py-3 rounded-xl border text-[10px] font-black transition-all ${currentModal === "STREAK_ATTENDANCE" ? "bg-purple-500 border-purple-500 text-white" : "bg-white/5 border-white/10 text-white/60"
                                    }`}
                            >
                                7일 스트릭 출석부
                            </button>
                        </div>
                        <button
                            disabled={updating}
                            onClick={() => handleUpdate("show_modal_override", null)}
                            className={`w-full py-2.5 rounded-xl border text-[10px] font-black transition-all ${currentModal === null ? "bg-white/20 border-white/30 text-white" : "bg-white/5 border-white/10 text-white/40"
                                }`}
                        >
                            트리거 해제 (OFF)
                        </button>
                    </div>
                    <p className="mt-2 text-[9px] text-white/30 font-bold leading-tight">
                        * '트리거' 설정 시 유저들이 다음 API 갱신(30초 내외) 때 해당 팝업을 한 번 보게 됩니다.
                    </p>
                </section>
            </div>

            {updating && (
                <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-figma-primary animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" /> 서버 설정 동기화 중...
                </div>
            )}
        </div>
    );
};

export default EventRemoteControl;

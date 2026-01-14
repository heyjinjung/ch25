import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Settings,
    ShieldCheck,
    Zap,
    Save,
    RefreshCw,
    ToggleLeft,
    ToggleRight,
    Clock,
    Target,
    ExternalLink
} from "lucide-react";
import { adminApi } from "../../api/httpClient";

interface VaultConfig {
    enable_game_earn_events: boolean;
    eligibility_mode: "all" | "allowlist" | "blocklist";
    eligibility_segment_allow?: string;
    game_earn_config: {
        [key: string]: {
            WIN?: number;
            DRAW?: number;
            LOSE?: number;
            BASE?: number;
            [key: string]: number | undefined;
        };
    };
    golden_hour_config: {
        enabled: boolean;
        start_time_kst: string;
        end_time_kst: string;
        multiplier: number;
        manual_override: "AUTO" | "FORCE_ON" | "FORCE_OFF";
    };
}

interface VaultProgram {
    key: string;
    name: string;
    is_active: boolean;
    config_json: VaultConfig;
}

export const VaultRulesEditor: React.FC = () => {
    const [program, setProgram] = useState<VaultProgram | null>(null);
    const [activeDiceConfig, setActiveDiceConfig] = useState<{ win: number; draw: number; lose: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    const formatSignedAmount = (value: number | undefined) => {
        const n = Number(value || 0);
        const sign = n >= 0 ? "+" : "";
        return `${sign}${n.toLocaleString()}`;
    };

    const fetchProgram = async () => {
        setLoading(true);
        try {
            const res = await adminApi.get("/admin/api/vault-programs/default");
            setProgram(res.data);
        } catch (err) {
            console.error("Failed to fetch vault program:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProgram(); }, []);

    useEffect(() => {
        // DICE rewards are sourced from DiceConfig (Admin Dice page) for NORMAL gameplay.
        // This prevents the Vault page from drifting due to unrelated VaultProgram defaults.
        const fetchDice = async () => {
            try {
                const res = await adminApi.get("/admin/api/dice-config/");
                const configs = Array.isArray(res.data) ? res.data : [];
                const active = configs.find((c: any) => Boolean(c?.is_active)) || configs[0];
                if (active) {
                    setActiveDiceConfig({
                        win: Number(active?.win_reward_amount ?? 0),
                        draw: Number(active?.draw_reward_amount ?? 0),
                        lose: Number(active?.lose_reward_amount ?? 0),
                    });
                } else {
                    setActiveDiceConfig(null);
                }
            } catch (err) {
                console.error("Failed to fetch dice config:", err);
                setActiveDiceConfig(null);
            }
        };

        fetchDice();
    }, []);

    const handleConfigChange = (patch: Partial<VaultConfig>) => {
        if (!program) return;
        setProgram({
            ...program,
            config_json: { ...program.config_json, ...patch }
        });
    };

    const handleGoldenHourChange = (field: keyof VaultConfig['golden_hour_config'], value: any) => {
        if (!program) return;
        const newGoldenHour = { ...program.config_json.golden_hour_config, [field]: value };
        handleConfigChange({ golden_hour_config: newGoldenHour });
    };

    const handleSave = async () => {
        if (!program) return;
        setSaving(true);
        try {
            await Promise.all([
                adminApi.put(`/admin/api/vault-programs/${program.key}/config`, { config_json: program.config_json }),
            ]);
            alert("설정이 성공적으로 저장되었습니다.");
            fetchProgram();
        } catch (e) {
            console.error(e);
            alert("설장 저장 중 오류가 발생했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const handleGameClick = (game: string) => {
        const target = game.toLowerCase();
        if (target === "dice") navigate("/admin/dice");
        else if (target === "roulette") navigate("/admin/roulette");
    };

    const isDiceKey = (game: string) => String(game || "").toUpperCase() === "DICE" || String(game || "").toLowerCase() === "dice";

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="h-8 w-8 text-admin-brand animate-spin" />
            <span className="text-admin-meta text-admin-text-secondary text-[14px]">분석 중...</span>
        </div>
    );

    if (!program) return null;

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <Settings className="h-5 w-5 text-admin-brand" />
                        <h3 className="text-admin-subtitle font-black text-admin-text-primary text-[15px]">자산 적립 엔진</h3>
                    </div>
                    <div className="admin-card-premium p-6 rounded-2xl space-y-6">
                        <div className="flex items-center justify-between p-4 bg-admin-bg/40 rounded-xl border border-admin-border">
                            <div className="flex items-center gap-3">
                                <Zap className={`h-5 w-5 ${program.config_json.enable_game_earn_events ? "text-admin-brand" : "text-admin-text-muted"}`} />
                                <div>
                                    <div className="text-admin-body font-bold text-admin-text-primary text-[14px]">전역 적립 활성화</div>
                                    <div className="text-admin-meta text-admin-text-secondary italic text-[14px]">게임 플레이 시 실시간 금고 적립 허용</div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleConfigChange({ enable_game_earn_events: !program.config_json.enable_game_earn_events })}
                                className="transition-transform active:scale-95"
                                aria-label="전역 적립 활성화 토글"
                                title="전역 적립 활성화 토글"
                            >
                                {program.config_json.enable_game_earn_events ? <ToggleRight className="h-6 w-6 text-admin-brand" /> : <ToggleLeft className="h-6 w-6 text-admin-text-muted" />}
                            </button>
                        </div>
                        <div className="space-y-4">
                            <label className="text-admin-meta text-admin-text-muted font-bold uppercase tracking-wider flex items-center gap-2 px-1 text-[14px]"><Target className="h-3 w-3" /> 게임별 보상 규격</label>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(program.config_json.game_earn_config).map(([game, values]) => (
                                    <div
                                        key={game}
                                        onClick={() => handleGameClick(game)}
                                        className="p-4 bg-admin-bg/40 border border-admin-border rounded-xl cursor-pointer hover:border-admin-brand hover:bg-admin-brand/5 transition-all group/card"
                                    >
                                        <div className="text-admin-meta font-black text-admin-brand mb-3 uppercase flex items-center justify-between">
                                            {String(game).toUpperCase() === "ROULETTE" || game === "roulette"
                                                ? "룰렛 (Roulette)"
                                                : isDiceKey(game)
                                                    ? "주사위 (Dice)"
                                                    : game}
                                            <ExternalLink className="h-3 w-3 opacity-30 group-hover/card:opacity-100 group-hover/card:text-admin-brand transition-opacity" />
                                        </div>
                                        <div className="space-y-2">
                                            {isDiceKey(game) ? (
                                                [
                                                    ["WIN", activeDiceConfig?.win],
                                                    ["DRAW", activeDiceConfig?.draw],
                                                    ["LOSE", activeDiceConfig?.lose],
                                                ].map(([type, val]) => (
                                                    <div key={String(type)} className="flex items-center justify-between text-admin-mono text-[14px]">
                                                        <span className="text-admin-text-muted">
                                                            {type === "WIN" ? "승리" : type === "LOSE" ? "패배" : type === "DRAW" ? "무승부" : String(type)}
                                                        </span>
                                                        <span className="text-admin-text-primary font-bold">{formatSignedAmount(Number(val ?? 0))}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                Object.entries(values).map(([type, val]) => (
                                                    <div key={type} className="flex items-center justify-between text-admin-mono text-[14px]">
                                                        <span className="text-admin-text-muted">
                                                            {type === "WIN" ? "승리" : type === "LOSE" ? "패배" : type === "DRAW" ? "무승부" : type === "BASE" ? "기본" : type}
                                                        </span>
                                                        <span className="text-admin-text-primary font-bold">{formatSignedAmount(val as any)}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-2 mt-10">
                        <ShieldCheck className="h-5 w-5 text-admin-brand" />
                        <h3 className="text-admin-subtitle font-black text-admin-text-primary text-[15px]">적격 유저 필터링</h3>
                    </div>
                    <div className="admin-card-premium p-6 rounded-2xl group overflow-hidden">
                        <div className="space-y-4 pt-4 border-t border-admin-border">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-admin-accent" />
                                <label className="text-admin-label mb-0 text-[14px]">대상자 통제 (Eligibility Mode)</label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="text-[14px] text-admin-text-muted font-bold uppercase tracking-widest pl-1">접근 모드</div>
                                    <select
                                        className="admin-input h-9 w-full text-[14px]"
                                        value={program.config_json.eligibility_mode}
                                        onChange={(e) => handleConfigChange({ eligibility_mode: e.target.value as VaultConfig['eligibility_mode'] })}
                                        aria-label="대상자 통제 접근 모드(Eligibility Mode)"
                                        title="대상자 통제 접근 모드(Eligibility Mode)"
                                    >
                                        <option value="all">전체 허용 (All Mode)</option>
                                        <option value="allowlist">Allowlist Only</option>
                                        <option value="blocklist">Blocklist Enforced</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[14px] text-admin-text-muted font-bold uppercase tracking-widest pl-1">대상 세그먼트 (Dynamic)</div>
                                    <select
                                        className="admin-input h-9 w-full text-[14px]"
                                        value={program.config_json.eligibility_segment_allow || ""}
                                        onChange={(e) => handleConfigChange({ eligibility_segment_allow: e.target.value || undefined })}
                                        aria-label="대상 세그먼트(Eligibility Segment)"
                                        title="대상 세그먼트(Eligibility Segment)"
                                    >
                                        <option value="">전체 (No Segment Filter)</option>
                                        <option value="VIP">VIP 유저</option>
                                        <option value="ACTIVE">활동 유저 (ACTIVE)</option>
                                        <option value="NEW">신규 유저 (NEW)</option>
                                        <option value="AT_RISK">이탈 징후 (AT_RISK)</option>
                                        <option value="DORMANT">휴면 (DORMANT)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 pt-2">
                                <button
                                    onClick={() => navigate("/admin/user-segments")}
                                    className="btn-admin-primary flex-1 py-2 h-auto justify-center bg-admin-sidebar border border-admin-border hover:bg-admin-hover text-admin-text-secondary text-[14px]"
                                >
                                    대상자 명단 관리 (Segments)
                                </button>
                                <div className="flex-1 text-[14px] text-admin-text-muted leading-relaxed">
                                    * <span className="font-bold text-admin-text-secondary">명단 관리</span> 버튼을 눌러 각 세그먼트별 유저 명단을 확인하거나, 자동 분류 규칙을 설정할 수 있습니다.
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <Clock className="h-5 w-5 text-admin-brand" />
                        <h3 className="text-admin-subtitle font-black text-admin-text-primary text-[15px]">골든아워 자동화</h3>
                    </div>
                    <div className="admin-card-premium p-6 rounded-2xl space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="vault-golden-hour-start" className="text-admin-meta text-admin-text-muted font-bold text-[14px]">시작 (KST)</label>
                                <input
                                    id="vault-golden-hour-start"
                                    type="text"
                                    value={program.config_json.golden_hour_config.start_time_kst}
                                    onChange={(e) => handleGoldenHourChange("start_time_kst", e.target.value)}
                                    className="admin-input"
                                    aria-label="골든아워 시작 시간(KST)"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="vault-golden-hour-end" className="text-admin-meta text-admin-text-muted font-bold text-[14px]">종료 (KST)</label>
                                <input
                                    id="vault-golden-hour-end"
                                    type="text"
                                    value={program.config_json.golden_hour_config.end_time_kst}
                                    onChange={(e) => handleGoldenHourChange("end_time_kst", e.target.value)}
                                    className="admin-input"
                                    aria-label="골든아워 종료 시간(KST)"
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-admin-brand/5 border border-admin-brand/20 rounded-xl flex items-center justify-between">
                            <span className="text-admin-meta font-bold text-admin-text-primary text-[14px]">적용 배수</span>
                            <div className="flex items-center gap-2">
                                <span className="text-admin-title text-2xl font-black text-admin-brand">x</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={program.config_json.golden_hour_config.multiplier}
                                    onChange={(e) => handleGoldenHourChange("multiplier", parseFloat(e.target.value))}
                                    className="admin-input w-24 text-right text-[14px] font-bold"
                                    aria-label="골든아워 적용 배수"
                                    title="골든아워 적용 배수"
                                />
                            </div>
                        </div>
                    </div>

                </section>
            </div>

            <div className="flex justify-end pt-6 border-t border-admin-border/30">
                <button
                    className="btn-admin-primary px-6 py-2 text-white shadow-admin-glow flex items-center gap-2 text-[14px] font-bold"
                    disabled={saving}
                    onClick={handleSave}
                >
                    {saving ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    설정 완료 및 저장
                </button>
            </div>
        </div>
    );
};

export default VaultRulesEditor;

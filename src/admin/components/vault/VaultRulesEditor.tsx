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
            alert("?§Ï†ï???±Í≥µ?ÅÏúºÎ°??Ä?•Îêò?àÏäµ?àÎã§.");
            fetchProgram();
        } catch (e) {
            console.error(e);
            alert("?§Ïû• ?Ä??Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.");
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
            <span className="text-admin-meta text-admin-text-secondary text-[14px]">Î∂ÑÏÑù Ï§?..</span>
        </div>
    );

    if (!program) return null;

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <Settings className="h-5 w-5 text-admin-brand" />
                        <h3 className="text-admin-subtitle font-black text-admin-text-primary text-[15px]">?êÏÇ∞ ?ÅÎ¶Ω ?îÏßÑ</h3>
                    </div>
                    <div className="admin-card-premium p-6 rounded-2xl space-y-6">
                        <div className="flex items-center justify-between p-4 bg-admin-bg/40 rounded-xl border border-admin-border">
                            <div className="flex items-center gap-3">
                                <Zap className={`h-5 w-5 ${program.config_json.enable_game_earn_events ? "text-admin-brand" : "text-admin-text-muted"}`} />
                                <div>
                                    <div className="text-admin-body font-bold text-admin-text-primary text-[14px]">?ÑÏó≠ ?ÅÎ¶Ω ?úÏÑ±??/div>
                                    <div className="text-admin-meta text-admin-text-secondary italic text-[14px]">Í≤åÏûÑ ?åÎ†à?????§ÏãúÍ∞?Í∏àÍ≥† ?ÅÎ¶Ω ?àÏö©</div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleConfigChange({ enable_game_earn_events: !program.config_json.enable_game_earn_events })}
                                className="transition-transform active:scale-95"
                                aria-label="?ÑÏó≠ ?ÅÎ¶Ω ?úÏÑ±???†Í?"
                                title="?ÑÏó≠ ?ÅÎ¶Ω ?úÏÑ±???†Í?"
                            >
                                {program.config_json.enable_game_earn_events ? <ToggleRight className="h-6 w-6 text-admin-brand" /> : <ToggleLeft className="h-6 w-6 text-admin-text-muted" />}
                            </button>
                        </div>
                        <div className="space-y-4">
                            <label className="text-admin-meta text-admin-text-muted font-bold uppercase tracking-wider flex items-center gap-2 px-1 text-[14px]"><Target className="h-3 w-3" /> Í≤åÏûÑÎ≥?Î≥¥ÏÉÅ Í∑úÍ≤©</label>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(program.config_json.game_earn_config).map(([game, values]) => (
                                    <div
                                        key={game}
                                        onClick={() => handleGameClick(game)}
                                        className="p-4 bg-admin-bg/40 border border-admin-border rounded-xl cursor-pointer hover:border-admin-brand hover:bg-admin-brand/5 transition-all group/card"
                                    >
                                        <div className="text-admin-meta font-black text-admin-brand mb-3 uppercase flex items-center justify-between">
                                            {String(game).toUpperCase() === "ROULETTE" || game === "roulette"
                                                ? "Î£∞Î†õ (Roulette)"
                                                : isDiceKey(game)
                                                    ? "Ï£ºÏÇ¨??(Dice)"
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
                                                            {type === "WIN" ? "?πÎ¶¨" : type === "LOSE" ? "?®Î∞∞" : type === "DRAW" ? "Î¨¥ÏäπÎ∂Ä" : String(type)}
                                                        </span>
                                                        <span className="text-admin-text-primary font-bold">{formatSignedAmount(Number(val ?? 0))}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                Object.entries(values).map(([type, val]) => (
                                                    <div key={type} className="flex items-center justify-between text-admin-mono text-[14px]">
                                                        <span className="text-admin-text-muted">
                                                            {type === "WIN" ? "?πÎ¶¨" : type === "LOSE" ? "?®Î∞∞" : type === "DRAW" ? "Î¨¥ÏäπÎ∂Ä" : type === "BASE" ? "Í∏∞Î≥∏" : type}
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
                        <h3 className="text-admin-subtitle font-black text-admin-text-primary text-[15px]">?ÅÍ≤© ?†Ï? ?ÑÌÑ∞Îß?/h3>
                    </div>
                    <div className="admin-card-premium p-6 rounded-2xl group overflow-hidden">
                        <div className="space-y-4 pt-4 border-t border-admin-border">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-admin-accent" />
                                <label className="text-admin-label mb-0 text-[14px]">?Ä?ÅÏûê ?µÏ†ú (Eligibility Mode)</label>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="text-[14px] text-admin-text-muted font-bold uppercase tracking-widest pl-1">?ëÍ∑º Î™®Îìú</div>
                                    <select
                                        className="admin-input h-9 w-full text-[14px]"
                                        value={program.config_json.eligibility_mode}
                                        onChange={(e) => handleConfigChange({ eligibility_mode: e.target.value as VaultConfig['eligibility_mode'] })}
                                        aria-label="?Ä?ÅÏûê ?µÏ†ú ?ëÍ∑º Î™®Îìú(Eligibility Mode)"
                                        title="?Ä?ÅÏûê ?µÏ†ú ?ëÍ∑º Î™®Îìú(Eligibility Mode)"
                                    >
                                        <option value="all">?ÑÏ≤¥ ?àÏö© (All Mode)</option>
                                        <option value="allowlist">Allowlist Only</option>
                                        <option value="blocklist">Blocklist Enforced</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[14px] text-admin-text-muted font-bold uppercase tracking-widest pl-1">?Ä???∏Í∑∏Î®ºÌä∏ (Dynamic)</div>
                                    <select
                                        className="admin-input h-9 w-full text-[14px]"
                                        value={program.config_json.eligibility_segment_allow || ""}
                                        onChange={(e) => handleConfigChange({ eligibility_segment_allow: e.target.value || undefined })}
                                        aria-label="?Ä???∏Í∑∏Î®ºÌä∏(Eligibility Segment)"
                                        title="?Ä???∏Í∑∏Î®ºÌä∏(Eligibility Segment)"
                                    >
                                        <option value="">?ÑÏ≤¥ (No Segment Filter)</option>
                                        <option value="VIP">VIP ?†Ï?</option>
                                        <option value="ACTIVE">?úÎèô ?†Ï? (ACTIVE)</option>
                                        <option value="NEW">?†Í∑ú ?†Ï? (NEW)</option>
                                        <option value="AT_RISK">?¥ÌÉà ÏßïÌõÑ (AT_RISK)</option>
                                        <option value="DORMANT">?¥Î©¥ (DORMANT)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 pt-2">
                                <button
                                    onClick={() => navigate("/admin/user-segments")}
                                    className="btn-admin-primary flex-1 py-2 h-auto justify-center bg-admin-sidebar border border-admin-border hover:bg-admin-hover text-admin-text-secondary text-[14px]"
                                >
                                    ?Ä?ÅÏûê Î™ÖÎã® Í¥ÄÎ¶?(Segments)
                                </button>
                                <div className="flex-1 text-[14px] text-admin-text-muted leading-relaxed">
                                    * <span className="font-bold text-admin-text-secondary">Î™ÖÎã® Í¥ÄÎ¶?/span> Î≤ÑÌäº???åÎü¨ Í∞??∏Í∑∏Î®ºÌä∏Î≥??†Ï? Î™ÖÎã®???ïÏù∏?òÍ±∞?? ?êÎèô Î∂ÑÎ•ò Í∑úÏπô???§Ï†ï?????àÏäµ?àÎã§.
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="space-y-6">
                    <div className="flex items-center gap-3 px-2">
                        <Clock className="h-5 w-5 text-admin-brand" />
                        <h3 className="text-admin-subtitle font-black text-admin-text-primary text-[15px]">Í≥®Îì†?ÑÏõå ?êÎèô??/h3>
                    </div>
                    <div className="admin-card-premium p-6 rounded-2xl space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="vault-golden-hour-start" className="text-admin-meta text-admin-text-muted font-bold text-[14px]">?úÏûë (KST)</label>
                                <input
                                    id="vault-golden-hour-start"
                                    type="text"
                                    value={program.config_json.golden_hour_config.start_time_kst}
                                    onChange={(e) => handleGoldenHourChange("start_time_kst", e.target.value)}
                                    className="admin-input"
                                    aria-label="Í≥®Îì†?ÑÏõå ?úÏûë ?úÍ∞Ñ(KST)"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="vault-golden-hour-end" className="text-admin-meta text-admin-text-muted font-bold text-[14px]">Ï¢ÖÎ£å (KST)</label>
                                <input
                                    id="vault-golden-hour-end"
                                    type="text"
                                    value={program.config_json.golden_hour_config.end_time_kst}
                                    onChange={(e) => handleGoldenHourChange("end_time_kst", e.target.value)}
                                    className="admin-input"
                                    aria-label="Í≥®Îì†?ÑÏõå Ï¢ÖÎ£å ?úÍ∞Ñ(KST)"
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-admin-brand/5 border border-admin-brand/20 rounded-xl flex items-center justify-between">
                            <span className="text-admin-meta font-bold text-admin-text-primary text-[14px]">?ÅÏö© Î∞∞Ïàò</span>
                            <div className="flex items-center gap-2">
                                <span className="text-admin-title text-2xl font-black text-admin-brand">x</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={program.config_json.golden_hour_config.multiplier}
                                    onChange={(e) => handleGoldenHourChange("multiplier", parseFloat(e.target.value))}
                                    className="admin-input w-24 text-right text-[14px] font-bold"
                                    aria-label="Í≥®Îì†?ÑÏõå ?ÅÏö© Î∞∞Ïàò"
                                    title="Í≥®Îì†?ÑÏõå ?ÅÏö© Î∞∞Ïàò"
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
                    ?§Ï†ï ?ÑÎ£å Î∞??Ä??
                </button>
            </div>
        </div>
    );
};

export default VaultRulesEditor;

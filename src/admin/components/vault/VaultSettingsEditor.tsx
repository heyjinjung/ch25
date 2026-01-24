import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { VaultProgramResponse, updateVaultConfig } from "../../api/adminVaultApi";
import { Save, Zap, HelpCircle, Plus, Trash2 } from "lucide-react";

type Props = {
    program: VaultProgramResponse;
};

const VaultSettingsEditor: React.FC<Props> = ({ program }) => {
    const queryClient = useQueryClient();

    const trialPayoutEnabled = Boolean(program.enable_trial_payout_to_vault);

    // 1. Multiplier
    const [multiplier, setMultiplier] = useState<number>(program.config_json?.accrual_multiplier || 1.0);

    // 2. Valuation (RewardID -> Amount)
    const initialValuation = Object.entries(program.config_json?.trial_reward_valuation || {}).map(([id, amt]) => ({
        rewardId: id,
        amount: amt as number
    }));
    const [valuations, setValuations] = useState<any[]>(initialValuation);

    // 3. Game Earn Config (Game -> Outcome -> Amount)
    // Flattened for UI: [{ game: "ROULETTE", outcome: "WIN", amount: 500 }]
    const initialGameEarn = [];
    if (program.config_json?.game_earn_config) {
        for (const [game, outcomes] of Object.entries(program.config_json.game_earn_config)) {
            if (typeof outcomes === 'object' && outcomes !== null) {
                for (const [outcome, amount] of Object.entries(outcomes)) {
                    initialGameEarn.push({ game, outcome, amount: amount as number });
                }
            }
        }
    }
    const [gameEarn, setGameEarn] = useState<any[]>(initialGameEarn);

    const mutation = useMutation({
        mutationFn: (json: any) => updateVaultConfig(program.key, json),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "vault", "program"] });
            alert("?¥ÏòÅ ?§Ï†ï???Ä?•Îêò?àÏäµ?àÎã§.");
        }
    });

    const addValuation = () => {
        setValuations([...valuations, { rewardId: "", amount: 0 }]);
    };

    const removeValuation = (idx: number) => {
        setValuations(valuations.filter((_, i) => i !== idx));
    };

    const updateValuation = (idx: number, field: string, value: any) => {
        const next = [...valuations];
        next[idx] = { ...next[idx], [field]: value };
        setValuations(next);
    };

    const addGameEarn = () => {
        setGameEarn([...gameEarn, { game: "ROULETTE", outcome: "WIN", amount: 0 }]);
    };

    const removeGameEarn = (idx: number) => {
        setGameEarn(gameEarn.filter((_, i) => i !== idx));
    };

    const updateGameEarn = (idx: number, field: string, value: any) => {
        const next = [...gameEarn];
        next[idx] = { ...next[idx], [field]: value };
        setGameEarn(next);
    };

    const saveConfig = () => {
        const newValuation: Record<string, number> = {};
        valuations.forEach(v => {
            if (v.rewardId.trim()) newValuation[v.rewardId.trim()] = v.amount;
        });

        // Re-structure flattened gameEarn back to nested object
        const newGameEarn: Record<string, Record<string, number>> = {};
        gameEarn.forEach(g => {
            if (g.game.trim() && g.outcome.trim()) {
                const gameKey = g.game.trim().toUpperCase();
                if (!newGameEarn[gameKey]) newGameEarn[gameKey] = {};
                newGameEarn[gameKey][g.outcome.trim().toUpperCase()] = g.amount;
            }
        });

        // Preserve existing DICE config block (managed in Admin Dice page / event params).
        // This prevents accidental removal when saving unrelated vault settings.
        const existingDice = (program.config_json?.game_earn_config as any)?.DICE;
        if (existingDice && typeof existingDice === "object") {
            newGameEarn["DICE"] = { ...existingDice };
        }

        const json = {
            ...program.config_json,
            accrual_multiplier: multiplier,
            trial_reward_valuation: newValuation,
            game_earn_config: newGameEarn
        };
        mutation.mutate(json);
    };

    const inputClass = "admin-input w-full";

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-admin-subtitle text-admin-text-primary flex items-center gap-2">
                        <Zap className="h-5 w-5 text-admin-warning" />
                        Í∏àÍ≥† ?¥ÏòÅ ?åÎùºÎØ∏ÌÑ∞
                    </h3>
                    <p className="text-admin-body text-admin-text-secondary">?ÅÎ¶Ω Î∞∞Ïàò, Í≤åÏûÑ ?ÅÎ¶ΩÍ∏? Ï≤¥Ìóò ?∞Ïºì Î≥¥ÏÉÅ Í∞ÄÏπòÎ? ?§Ï†ï?©Îãà??</p>
                </div>
                <button onClick={saveConfig} disabled={mutation.isPending} className="btn-admin-primary">
                    <Save className="h-4 w-4" />
                    ?§Ï†ï ?Ä??
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="admin-card p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-admin-body font-bold text-admin-text-primary">?¥Î≤§???ÅÎ¶Ω Î∞∞Ïàò (Multiplier)</h4>
                        <div className="flex items-center gap-2 text-admin-text-muted text-xs">
                            <HelpCircle className="h-4 w-4" />
                            <span>?ÑÏó≠ Î∞∞Ïàò</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <input
                                type="number"
                                step="0.1"
                                className={inputClass}
                                value={multiplier}
                                onChange={e => setMultiplier(parseFloat(e.target.value) || 1.0)}
                                aria-label="?ÅÎ¶Ω Î∞∞Ïàò"
                                title="?ÅÎ¶Ω Î∞∞Ïàò"
                            />
                        </div>
                        <div className="text-2xl font-black text-admin-text-primary">x</div>
                    </div>
                    <p className="text-admin-meta text-admin-text-secondary leading-relaxed">
                        Î™®Îì† Í∏àÍ≥† ?ÅÎ¶Ω(Í≤åÏûÑ/?∞Ïºì/Ï≤¥Ìóò)???ÅÏö©?òÎäî ?ÑÏó≠ Î∞∞Ïàò?ÖÎãà?? Í∏∞Î≥∏Í∞íÏ? 1.0?¥Î©∞, ?¥Î≤§??Í∏∞Í∞Ñ?êÎßå Ï°∞Ï†ï?òÎäî Í≤ÉÏùÑ Í∂åÏû•?©Îãà??
                    </p>
                </div>

                <div className="admin-card overflow-hidden">
                    <div className="p-4 border-b border-admin-border bg-admin-sidebar/80 flex items-center justify-between">
                        <h4 className="text-admin-body font-bold text-admin-text-primary">Í≤åÏûÑ ?ÅÎ¶Ω ?§Ï†ï (Game Earn)</h4>
                        <button onClick={addGameEarn} className="btn-admin-ghost p-2" aria-label="Í≤åÏûÑ ?ÅÎ¶Ω ??™© Ï∂îÍ?" title="Í≤åÏûÑ ?ÅÎ¶Ω ??™© Ï∂îÍ?">
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        <table className="admin-table">
                            <thead className="bg-admin-sidebar/60 sticky top-0">
                                <tr>
                                    <th className="admin-th">Game</th>
                                    <th className="admin-th">Outcome</th>
                                    <th className="admin-th">Amount</th>
                                    <th className="admin-th"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {gameEarn.map((g, i) => {
                                    const isDice = String(g.game || "").toUpperCase() === "DICE";
                                    return (
                                        <tr key={i}>
                                            <td className="admin-td">
                                                <select
                                                    className={inputClass}
                                                    value={g.game}
                                                    onChange={e => updateGameEarn(i, "game", e.target.value)}
                                                    aria-label={`Í≤åÏûÑ Ï¢ÖÎ•ò ${i + 1}`}
                                                    title="Í≤åÏûÑ Ï¢ÖÎ•ò"
                                                    disabled={isDice}
                                                >
                                                    <option value="ROULETTE">ROULETTE</option>
                                                    <option value="DICE">DICE (Í¥ÄÎ¶? Ï£ºÏÇ¨???§Ï†ï)</option>
                                                    <option value="LOTTERY">LOTTERY</option>
                                                </select>
                                            </td>
                                            <td className="admin-td">
                                                <input
                                                    className={inputClass}
                                                    value={g.outcome}
                                                    onChange={e => updateGameEarn(i, "outcome", e.target.value)}
                                                    placeholder="WIN, LOSE, SEGMENT_0..."
                                                    aria-label={`Í≤∞Í≥º(outcome) ${i + 1}`}
                                                    title="Outcome"
                                                    disabled={isDice}
                                                />
                                            </td>
                                            <td className="admin-td">
                                                <input
                                                    type="number"
                                                    className={inputClass}
                                                    value={g.amount}
                                                    onChange={e => updateGameEarn(i, "amount", parseInt(e.target.value) || 0)}
                                                    aria-label={`Í∏àÏï°(amount) ${i + 1}`}
                                                    title="Amount"
                                                    disabled={isDice}
                                                />
                                            </td>
                                            <td className="admin-td text-right">
                                                {isDice ? (
                                                    <span className="text-[11px] text-admin-text-muted">DICE??/admin/dice?êÏÑú Í¥ÄÎ¶?/span>
                                                ) : (
                                                    <button
                                                        onClick={() => removeGameEarn(i)}
                                                        className="btn-admin-ghost p-2 text-admin-danger"
                                                        aria-label={`Í≤åÏûÑ ?ÅÎ¶Ω ??™© ??†ú ${i + 1}`}
                                                        title="??†ú"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {gameEarn.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-admin-text-secondary italic">?§Ï†ï??Í≤åÏûÑ ?ÅÎ¶Ω ??™©???ÜÏäµ?àÎã§.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {trialPayoutEnabled && (
                <div className="admin-card overflow-hidden">
                    <div className="p-4 border-b border-admin-border bg-admin-sidebar/80 flex items-center justify-between">
                        <h4 className="text-admin-body font-bold text-admin-text-primary">Ï≤¥Ìóò ?∞Ïºì Î≥¥ÏÉÅ Í∞ÄÏπ??§Ï†ï (Valuation)</h4>
                        <button
                            onClick={addValuation}
                            className="btn-admin-ghost p-2"
                            aria-label="Valuation ??™© Ï∂îÍ?"
                            title="Valuation ??™© Ï∂îÍ?"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                        <table className="admin-table">
                            <thead className="bg-admin-sidebar/60 sticky top-0">
                                <tr>
                                    <th className="admin-th">Reward ID</th>
                                    <th className="admin-th">Valuation (KRW)</th>
                                    <th className="admin-th"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {valuations.map((v, i) => (
                                    <tr key={i}>
                                        <td className="admin-td">
                                            <input
                                                className={inputClass}
                                                value={v.rewardId}
                                                onChange={e => updateValuation(i, "rewardId", e.target.value)}
                                                placeholder="?? POINT:1000"
                                                aria-label={`Reward ID ${i + 1}`}
                                                title="Reward ID"
                                            />
                                        </td>
                                        <td className="admin-td">
                                            <input
                                                type="number"
                                                className={inputClass}
                                                value={v.amount}
                                                onChange={e => updateValuation(i, "amount", parseInt(e.target.value) || 0)}
                                                aria-label={`Valuation Í∏àÏï° ${i + 1}`}
                                                title="Valuation"
                                            />
                                        </td>
                                        <td className="admin-td text-right">
                                            <button
                                                onClick={() => removeValuation(i)}
                                                className="btn-admin-ghost p-2 text-admin-danger"
                                                aria-label={`Valuation ??™© ??†ú ${i + 1}`}
                                                title="??†ú"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {valuations.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-admin-text-secondary italic">?§Ï†ï??Í∞ÄÏπ???™©???ÜÏäµ?àÎã§.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VaultSettingsEditor;

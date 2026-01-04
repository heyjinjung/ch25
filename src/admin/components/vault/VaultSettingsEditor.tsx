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
            alert("운영 설정이 저장되었습니다.");
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

        const json = {
            ...program.config_json,
            accrual_multiplier: multiplier,
            trial_reward_valuation: newValuation,
            game_earn_config: newGameEarn
        };
        mutation.mutate(json);
    };

    const inputClass = "w-full rounded-md border border-[#333] bg-[#0A0A0A] px-3 py-2 text-sm text-gray-200 focus:border-[#91F402] focus:outline-none";

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-400" />
                        금고 운영 파라미터
                    </h3>
                    <p className="text-sm text-gray-400">적립 배수, 게임별 적립액, 체험 플레이 보상 가치를 설정합니다.</p>
                </div>
                <button
                    onClick={saveConfig}
                    disabled={mutation.isPending}
                    className="flex items-center gap-2 rounded-md bg-[#2D6B3B] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#91F402] hover:text-black transition-all shadow-lg active:scale-95"
                >
                    <Save className="h-4 w-4" />
                    설정 저장
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="rounded-xl border border-[#333] bg-[#111] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-white">이벤트 적립 배수 (Multiplier)</h4>
                            <span className="px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 text-[10px] font-bold uppercase tracking-widest border border-yellow-400/20">Active Policy</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <input
                                        type="number"
                                        step="0.1"
                                        className={inputClass}
                                        value={multiplier}
                                        onChange={e => setMultiplier(parseFloat(e.target.value) || 1.0)}
                                    />
                                </div>
                                <div className="text-2xl font-black text-white">x</div>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                모든 금고 적립(게임 플레이/체험) 시 적용되는 전역 배수입니다.
                                기본값은 1.0이며, 이벤트 기간 동안만 상향 조정을 권장합니다.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-[#333] bg-[#111] p-6">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                            <HelpCircle className="h-4 w-4 text-blue-400" />
                            운영 설정 가이드
                        </h4>
                        <div className="space-y-3 text-xs text-gray-400 leading-relaxed">
                            <p>• <b>게임 적립액:</b> 게임 종류(ROULETTE, DICE)와 결과(WIN, LOSE, SEGMENT_N)별로 금고에 쌓일 기본 포인트를 설정합니다.</p>
                            <p>• <b>RewardID 형식:</b> <code>[Type]:[Amount]</code> (예: <code>POINT:1000</code>). 체험 플레이 결과 매칭 시 적립됩니다.</p>
                            <p>• <b>누락 시:</b> 해당 보상은 금고 적립에서 스킵됩니다 (Discord 알림 발송).</p>
                        </div>
                    </div>
                </div>

                {/* Game Earn Config Section */}
                <div className="rounded-xl border border-[#333] bg-[#111] overflow-hidden">
                    <div className="p-4 border-b border-[#222] bg-[#1a1a1a] flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">게임 플레이 적립 설정 (Game Earn)</h4>
                        <button
                            onClick={addGameEarn}
                            className="p-1.5 rounded-md hover:bg-[#333] text-[#91F402] transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#0a0a0a] text-gray-500 sticky top-0 uppercase text-[10px] tracking-widest">
                                <tr>
                                    <th className="px-4 py-2">Game</th>
                                    <th className="px-4 py-2">Outcome</th>
                                    <th className="px-4 py-2">Amount</th>
                                    <th className="px-4 py-2"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#222]">
                                {gameEarn.map((g, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-2">
                                            <select
                                                className={inputClass}
                                                value={g.game}
                                                onChange={e => updateGameEarn(i, "game", e.target.value)}
                                            >
                                                <option value="ROULETTE">ROULETTE</option>
                                                <option value="DICE">DICE</option>
                                                <option value="LOTTERY">LOTTERY</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                className={inputClass}
                                                value={g.outcome}
                                                onChange={e => updateGameEarn(i, "outcome", e.target.value)}
                                                placeholder="WIN, LOSE, SEGMENT_0..."
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="number"
                                                className={inputClass}
                                                value={g.amount}
                                                onChange={e => updateGameEarn(i, "amount", parseInt(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <button onClick={() => removeGameEarn(i)} className="p-2 text-gray-600 hover:text-red-500">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {gameEarn.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-600 italic">설정된 게임 적립 데이터가 없습니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {trialPayoutEnabled && (
                <div className="rounded-xl border border-[#333] bg-[#111] overflow-hidden">
                    <div className="p-4 border-b border-[#222] bg-[#1a1a1a] flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">체험 플레이 보상 가치 설정 (Valuation)</h4>
                        <button
                            onClick={addValuation}
                            className="p-1.5 rounded-md hover:bg-[#333] text-[#91F402] transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#0a0a0a] text-gray-500 sticky top-0 uppercase text-[10px] tracking-widest">
                                <tr>
                                    <th className="px-6 py-3">Reward ID</th>
                                    <th className="px-6 py-3">Valuation (KRW)</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#222]">
                                {valuations.map((v, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-3">
                                            <input
                                                className={inputClass}
                                                value={v.rewardId}
                                                onChange={e => updateValuation(i, "rewardId", e.target.value)}
                                                placeholder="예: POINT:1000"
                                            />
                                        </td>
                                        <td className="px-6 py-3">
                                            <input
                                                type="number"
                                                className={inputClass}
                                                value={v.amount}
                                                onChange={e => updateValuation(i, "amount", parseInt(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button onClick={() => removeValuation(i)} className="p-2 text-gray-600 hover:text-red-500">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {valuations.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-gray-600 italic">설정된 가치 데이터가 없습니다.</td>
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

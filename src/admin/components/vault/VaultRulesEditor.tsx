import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { VaultProgramResponse, updateVaultUnlockRules } from "../../api/adminVaultApi";
import { Save, Plus, Trash2, ShieldCheck, Clock } from "lucide-react";

type Props = {
    program: VaultProgramResponse;
};

const VaultRulesEditor: React.FC<Props> = ({ program }) => {
    const queryClient = useQueryClient();

    // 1. Phase 1 Deposit Unlock Tiers
    const initialTiers = program.unlock_rules_json?.phase1_deposit_unlock?.tiers || [
        { min_deposit_delta: 10000, unlock_amount: 5000 },
        { min_deposit_delta: 50000, unlock_amount: 10000 }
    ];
    const [tiers, setTiers] = useState<any[]>(initialTiers);

    // 2. Grace Period
    const [graceHours, setGraceHours] = useState<number>(program.unlock_rules_json?.available_grace_hours || 0);

    const mutation = useMutation({
        mutationFn: (json: any) => updateVaultUnlockRules(program.key, json),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "vault", "program"] });
            alert("해금 규칙이 저장되었습니다.");
        }
    });

    const addTier = () => {
        setTiers([...tiers, { min_deposit_delta: 0, unlock_amount: 0 }]);
    };

    const removeTier = (index: number) => {
        setTiers(tiers.filter((_, i) => i !== index));
    };

    const updateTier = (index: number, field: string, value: number) => {
        const newTiers = [...tiers];
        newTiers[index] = { ...newTiers[index], [field]: value };
        setTiers(newTiers);
    };

    const saveRules = () => {
        const json = {
            ...program.unlock_rules_json,
            available_grace_hours: graceHours,
            phase1_deposit_unlock: {
                trigger: "EXTERNAL_RANKING_DEPOSIT_INCREASE",
                tiers: tiers.sort((a, b) => a.min_deposit_delta - b.min_deposit_delta)
            }
        };
        mutation.mutate(json);
    };

    const inputClass = "w-full rounded-md border border-[#333] bg-[#0A0A0A] px-3 py-2 text-sm text-gray-200 focus:border-[#91F402] focus:outline-none";
    const labelClass = "mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wider";

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-[#91F402]" />
                        Phase 1 해금 정책 (충전 연동)
                    </h3>
                    <p className="text-sm text-gray-400">외부 사이트(씨씨카지노) 충전 금액에 따라 금고가 자동으로 해금되는 규칙입니다.</p>
                </div>
                <button
                    onClick={saveRules}
                    disabled={mutation.isPending}
                    className="flex items-center gap-2 rounded-md bg-[#2D6B3B] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#91F402] hover:text-black transition-all shadow-lg active:scale-95"
                >
                    <Save className="h-4 w-4" />
                    해금 규칙 저장
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                    <div className="rounded-xl border border-[#333] bg-[#111] overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#1a1a1a] text-gray-400">
                                <tr>
                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider">충전 증가액 (Delta)</th>
                                    <th className="px-6 py-3 font-semibold uppercase tracking-wider">해금 가능액 (Cash)</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#222]">
                                {tiers.map((tier, idx) => (
                                    <tr key={idx} className="hover:bg-[#1a1a1a] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    className={inputClass}
                                                    value={tier.min_deposit_delta}
                                                    onChange={e => updateTier(idx, "min_deposit_delta", parseInt(e.target.value) || 0)}
                                                />
                                                <span className="text-gray-500">원</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    className={inputClass}
                                                    value={tier.unlock_amount}
                                                    onChange={e => updateTier(idx, "unlock_amount", parseInt(e.target.value) || 0)}
                                                />
                                                <span className="text-gray-500">원</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => removeTier(idx)}
                                                className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {tiers.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                            정의된 티어가 없습니다. 버튼을 눌러 추가하세요.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <div className="p-4 bg-[#0a0a0a] border-t border-[#222]">
                            <button
                                onClick={addTier}
                                className="flex items-center gap-2 text-sm font-bold text-[#91F402] hover:text-white transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                새로운 티어 추가
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-xl border border-[#333] bg-[#111] p-6">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                            <Clock className="h-4 w-4 text-orange-400" />
                            해금 후 만료 유예 (Grace)
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>만료 유예 시간 (단위: 시)</label>
                                <input
                                    type="number"
                                    className={inputClass}
                                    value={graceHours}
                                    onChange={e => setGraceHours(parseInt(e.target.value) || 0)}
                                />
                                <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                                    금고가 AVAILABLE 상태가 된 후, 유저가 수령하지 않을 경우 해당 시간 후에 소멸됩니다. (0이면 소멸되지 않음)
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-amber-500/10 bg-amber-950/5 p-6 border-dashed">
                        <h4 className="text-xs font-bold text-amber-500/80 uppercase tracking-widest mb-2">운영상 참고</h4>
                        <p className="text-xs text-amber-200/50 leading-relaxed">
                            실제 해금 시 적용되는 금액은 유저의 '잠긴 금고' 잔액을 초과할 수 없으며,
                            시스템이 <code>min(locked, unlock_target)</code>로 자동 적용합니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VaultRulesEditor;

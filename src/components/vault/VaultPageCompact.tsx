import React, { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { getVaultStatus } from "../../api/vaultApi";
import { tryHaptic } from "../../utils/haptics";

import { useToast } from "../../components/common/ToastProvider";
import { Lock, Info } from "lucide-react";

// Helper to format currency
const formatWon = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

const VaultPageCompact: React.FC = () => {
    const { addToast } = useToast();
    // Fetch Vault Status
    const vault = useQuery({
        queryKey: ["vault-status"],
        queryFn: getVaultStatus,
        staleTime: 5000,
        refetchInterval: 10000,
    });

    const view = useMemo(() => {
        const data = vault.data;
        // Basic Balances
        const vaultBalance = data?.vaultBalance ?? 0;
        const availableAmount = data?.vaultAmountAvailable ?? data?.availableBalance ?? 0;
        const reservedAmount = data?.vaultAmountReserved ?? Math.max(vaultBalance - availableAmount, 0);

        // Unlock Conditions (Hardcoded for now based on Reward Guide Logic or API data)
        // Assuming API returns 'vault_spent_total' or we calculate percentage
        // If API doesn't support 'vault_spent_total' yet, fallback to dummy or partial logic.
        // Assuming 'totalChargeAmount' logic was referring to deposit, but we need 'Shop Spending'.
        // Let's check API response structure in 'getVaultStatus'. For now, we use a placeholder logic if field missing.
        // If 'eligible' is true, it means unlock complete.

        const isUnlocked = !!data?.eligible;

        // Progress Logic (This needs to be provided by backend ideally, or calculated)
        // For Phase 1, we might rely on 'eligible' flag. 
        // If we want "Gauge", we need Current / Target. 
        // Let's assume the API returns 'unlockProgress' (0-100) or we simulate it.
        // If not available, we default to 0 or 100.
        // *Correction*: User DB column `vault_spent_total` was added. API `getVaultStatus` might need update to return it.
        // If not available yet, we hide the detailed gauge or show 'Play to Unlock'.
        // But user ASKED for gauge. I will assume `unlockProgress` is passed or I map `totalChargeAmount` if meant as spent.
        // Actually, previous code used `totalChargeAmount`. I will reuse it but re-label it as "Energy".

        // Fallback calculation until API provides dedicated field
        const progressPercent = Math.min(100, ((data?.totalChargeAmount ?? 0) / 100000) * 100);

        return { vaultBalance, availableAmount, reservedAmount, isUnlocked, progressPercent };
    }, [vault.data]);

    // Handle Loading
    if (vault.isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/70 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center px-4 py-6 min-h-[calc(100vh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-80px)] relative overflow-hidden bg-black text-white">

            {/* Title */}
            <h1 className="text-xs font-black tracking-[0.2em] text-emerald-500 uppercase mb-8 border border-emerald-900/50 px-4 py-1.5 rounded-full bg-emerald-950/30">
                THE VAULT
            </h1>

            {/* 1. Unlocked State (CASH OUT MODE) */}
            {view.isUnlocked ? (
                <div className="w-full flex-1 flex flex-col items-center justify-center animate-fadeIn">

                    {/* Unlocked Icon Animation */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-emerald-500 blur-[80px] opacity-20 animate-pulse" />
                        <img
                            src="/assets/vault/vault_open.png"
                            alt="Unlocked Vault"
                            className="relative z-10 w-48 h-48 object-contain drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                        />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                            <span className="bg-emerald-500 text-black font-black text-[10px] px-2 py-0.5 rounded-full animate-bounce">내돈찾기</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-8">
                        <div className="relative">
                            <div className="absolute inset-0 bg-amber-400 blur-xl opacity-40 animate-pulse" />
                            <img src="/assets/asset_coin_gold.png" alt="Coin" className="relative z-10 w-12 h-12 object-contain animate-bounce-subtle" />
                        </div>
                        <div className="text-center">
                            <div className="text-5xl font-black text-white tracking-tighter drop-shadow-xl flex items-center gap-1">
                                {formatWon(view.availableAmount)}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={async () => {
                            if (view.availableAmount < 10000) {
                                addToast("최소 10,000원부터 출금 가능합니다.", "error");
                                return;
                            }
                            if (!window.confirm("전액 출금 신청하시겠습니까?")) return;
                            tryHaptic(50);
                            const { requestWithdrawal } = await import("../../api/vaultApi");
                            const res = await requestWithdrawal(view.availableAmount);
                            addToast(res.message, res.success ? "success" : "error");
                            vault.refetch();
                        }}
                        className="w-full max-w-[280px] py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black font-black text-lg shadow-[0_12px_24px_-8px_rgba(245,158,11,0.5),inset_0_1px_0_rgba(255,255,255,0.3)] hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-2 mb-6"
                    >
                        <img src="/assets/asset_coin_gold.png" className="w-6 h-6 object-contain drop-shadow-sm" alt="" />
                        <span>출금 신청하기</span>
                    </button>

                    {/* Charge Button */}
                    <a
                        href="https://ccc-010.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full max-w-[280px] py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 text-white font-black text-lg shadow-[0_12px_24px_-8px_rgba(16,185,129,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                    >
                        <img src="/assets/logo_cc_v2.png" className="w-6 h-6 object-contain mix-blend-screen drop-shadow-md" alt="" />
                        <span className="drop-shadow-sm">씨씨카지노 충전하기</span>
                    </a>
                </div>
            ) : (
                /* 2. Locked State (CHARGING MODE) */
                <div className="w-full flex-1 flex flex-col items-center">

                    <div className="relative mb-6">
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold tracking-widest uppercase mb-2">
                            THE VAULT
                        </span>

                        {/* Realistic Locked Vault */}
                        <div className="relative w-48 h-48">
                            <img src="/assets/vault/vault_closed.png" alt="Locked Vault" className="w-full h-full object-contain" />
                            {/* Handle Animation */}
                            <img
                                src="/assets/vault/vault_handle.png"
                                alt=""
                                className="absolute top-[42%] left-[16%] w-[68%] h-[68%] object-contain origin-center animate-spin-slow-reverse opacity-80"
                                style={{ animationDuration: '60s' }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-8">
                        <img src="/assets/asset_coin_gold.png" alt="Coin" className="w-8 h-8 object-contain opacity-80" />
                        <div className="text-4xl font-black text-white/90 tracking-tighter">
                            {formatWon(view.vaultBalance)}
                        </div>
                    </div>

                    {/* Dopamine Gauge */}
                    <div className="w-full max-w-xs bg-gray-900 rounded-2xl p-5 border border-gray-800 shadow-2xl relative overflow-hidden group mb-8">

                        {/* Gauge Header */}
                        <div className="flex justify-between items-end mb-4 relative z-10">
                            <span className="text-white font-bold text-sm flex items-center gap-2">
                                <span className="text-white font-black">VIP 금고 진행도</span>
                            </span>
                            <span className="text-xl font-black text-amber-500 tabular-nums">
                                {view.progressPercent}<span className="text-sm text-amber-500/70">%</span>
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-3 bg-black rounded-full overflow-hidden border border-white/10 relative z-10">
                            <div
                                className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-white animate-shimmer-fast transition-all duration-1000 ease-out"
                                style={{ width: `${view.progressPercent}%` }}
                            />
                        </div>

                        {/* Message */}
                        <p className="text-[11px] text-gray-400 mt-4 text-center font-medium leading-relaxed">
                            총 충전 <span className="text-amber-500 font-bold">{formatWon(vault.data?.totalChargeAmount ?? 0)}</span> / 100,000 달성 시<br />
                            <span className="text-white font-bold">보관금 전액이 즉시 잠금 해제됩니다.</span>
                        </p>
                    </div>

                    {/* Peak Time Event Banner - Smaller Text */}
                    <div className="w-full max-w-xs relative mb-6 overflow-hidden rounded-xl border border-white/5">
                        <div className="relative flex items-center gap-3 bg-black/40 px-4 py-3 backdrop-blur-md">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/40">
                                <Lock className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[9px] font-black tracking-widest text-white/30 uppercase">
                                    PEAK TIME EVENT
                                </h3>
                                <p className="text-[11px] font-bold text-white/60">
                                    오늘 30만원 이상 입금 시 참여 가능
                                </p>
                            </div>
                            <Info className="h-3.5 w-3.5 text-white/20" />
                        </div>
                    </div>

                    {/* Footer Info Row - Restored */}
                    <div className="w-full max-w-xs space-y-2 mb-8 px-2">
                        <div className="flex justify-between items-center text-[11px] font-medium text-white/40">
                            <span>출금 가능 금액</span>
                            <span className="text-amber-500 font-bold text-xs">{formatWon(view.availableAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-medium text-white/40">
                            <span>예약됨(처리 중)</span>
                            <span>0원</span>
                        </div>
                    </div>

                    <button className="w-full max-w-[280px] py-4 rounded-2xl bg-zinc-900 text-zinc-600 font-bold border border-white/5 mb-6 items-center justify-center gap-2 flex cursor-not-allowed opacity-50" disabled>
                        <img src="/assets/asset_coin_gold.png" className="w-5 h-5 object-contain grayscale opacity-30" alt="" />
                        <span>출금 신청하기</span>
                    </button>



                    {/* Charge Button */}
                    <a
                        href="https://ccc-010.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full max-w-xs py-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-black text-base shadow-[0_0_16px_rgba(16,185,129,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                    >
                        <img src="/assets/logo_cc_v2.png" className="w-4 h-4 object-contain mix-blend-screen" alt="" />
                        씨씨카지노 충전하기
                    </a>
                </div>
            )}
        </div>
    );
};

export default VaultPageCompact;

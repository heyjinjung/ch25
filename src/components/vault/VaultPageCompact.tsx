import React, { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { getVaultStatus, requestWithdrawal, VaultStatusResponse } from "../../api/vaultApi";
import { tryHaptic } from "../../utils/haptics";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedNumber from "../common/AnimatedNumber";
import { useToast } from "../../components/common/ToastProvider";
import { Lock, ListChecks } from "lucide-react";
import WithdrawalConditionsModal from "../modal/WithdrawalConditionsModal";
import WithdrawalProgressModal from "../modal/WithdrawalProgressModal";
import { useSound } from "../../hooks/useSound";



const SparkleDust: React.FC = () => {
    // Generate 25 random sparkles for a cleaner "Falling Stars" effect
    const sparkles = useMemo(() => Array.from({ length: 25 }).map(() => ({
        left: Math.random() * 100, // Random horizontal position 0-100%
        scale: Math.random() * 1.0 + 0.5, // 0.5 ~ 1.5 size variation
        duration: Math.random() * 10 + 12, // 12~22 seconds fall duration (Slower & Smoother)
        delay: -Math.random() * 20 // Negative delay for instant coverage
    })), []);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {sparkles.map((s, i) => (
                <motion.img
                    key={i}
                    src="/assets/sparkle.png"
                    className="absolute w-6 h-6 object-contain opacity-50"
                    style={{
                        left: `${s.left}%`,
                        top: "-10%", // Start above screen
                    }}
                    animate={{
                        y: ["0vh", "120vh"], // Fall down relative to viewport height
                        opacity: [0, 0.8, 0.8, 0], // Subtle fade interaction
                        rotate: [0, 180, 360]
                    }}
                    transition={{
                        duration: s.duration,
                        repeat: Infinity,
                        delay: s.delay,
                        ease: "linear"
                    }}
                />
            ))}
        </div>
    );
};

const VaultPageCompact: React.FC = () => {
    const { addToast, addToastNode } = useToast();
    const { playVaultJingle } = useSound();
    const [showConditionsModal, setShowConditionsModal] = React.useState(false);
    const [showProgressModal, setShowProgressModal] = React.useState(false);

    // Fetch Vault Status
    const vault = useQuery<VaultStatusResponse>({
        queryKey: ["vault-status"],
        queryFn: getVaultStatus,
        staleTime: 5000,
        retry: false,
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

        // Progress Logic based on Condition Targets (Backend driven)
        // Average of: Play Count Progress + Vault Spent Progress
        const playTarget = data?.dailyPlayTarget || 1;
        const spentTarget = data?.dailyVaultSpentTarget || 1;

        const playProg = Math.min(100, ((data?.dailyPlayCount ?? 0) / playTarget) * 100);
        const spentProg = Math.min(100, ((data?.dailyVaultSpent ?? 0) / spentTarget) * 100);
        const depositProg = (data?.dailyDepositConfirmed) ? 100 : 0;

        const progressPercent = Math.floor((playProg + spentProg + depositProg) / 3);

        const isPlayMet = (data?.dailyPlayCount ?? 0) >= (data?.dailyPlayTarget ?? 0);
        const isSpentMet = (data?.dailyVaultSpent ?? 0) >= (data?.dailyVaultSpentTarget ?? 0);
        const isDepositMet = !!data?.dailyDepositConfirmed;

        // Unlocked ONLY if Eligible AND All Conditions Met
        const isUnlocked = !!data?.eligible && isPlayMet && isSpentMet && isDepositMet;

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
        <div className="flex flex-col items-center mx-auto w-full max-w-lg relative min-h-[50vh]">
            <SparkleDust />

            {/* Header */}
            <div className="w-full mb-8 flex items-center justify-between">
                <h1 className="text-xs font-black tracking-[0.2em] text-emerald-500 uppercase border border-emerald-900/50 px-4 py-1.5 rounded-full bg-emerald-950/30">
                    THE VAULT
                </h1>
                <button
                    type="button"
                    onClick={() => {
                        tryHaptic(10);
                        addToastNode(
                            <div className="text-center space-y-1">
                                <p>배민 2만부터 지급가능</p>
                                <p>씨씨코인 하루 1개 지급가능</p>
                                <p>컴포즈 아아 1만부터 지급가능</p>
                            </div>,
                            { tone: "info" }
                        );
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-white/70 active:scale-[0.98] transition-transform"
                >
                    <img src="/assets/logo_cc_v2.png" className="w-3.5 h-3.5 object-contain" alt="" />
                    안내
                </button>
            </div>

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
                            <button
                                onClick={() => setShowProgressModal(true)}
                                className="bg-emerald-500 text-black font-black text-[10px] px-2 py-0.5 rounded-full animate-bounce hover:scale-110 active:scale-95 transition-transform"
                            >
                                내돈찾기
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-8">
                        <div className="relative">
                            <div className="absolute inset-0 bg-amber-400 blur-xl opacity-40 animate-pulse" />
                            <img src="/assets/asset_coin_gold.png" alt="Coin" className="relative z-10 w-12 h-12 object-contain animate-bounce-subtle" />
                        </div>
                        <div className="text-center">
                            <div className="text-5xl font-black text-white tracking-tighter drop-shadow-xl flex items-center gap-1">
                                <AnimatedNumber
                                    value={view.availableAmount}
                                    onAnimationStart={playVaultJingle}
                                />
                                <span className="text-2xl ml-[-2px]">원</span>
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
                            try {
                                const res = await requestWithdrawal(view.availableAmount);
                                addToast(res.message, res.success ? "success" : "error");
                                vault.refetch();
                            } catch {
                                addToast("신청 중 오류가 발생했습니다.", "error");
                            }
                        }}
                        className="w-full max-w-[200px] h-[48px] rounded-2xl bg-emerald-500/80 backdrop-blur-md border border-white/20 text-white font-bold text-[14px] shadow-[0_8px_16px_-4px_rgba(16,185,129,0.5)] hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 mb-3"
                    >
                        <img src="/assets/asset_coin_gold.png" className="w-5 h-5 object-contain drop-shadow-sm" alt="" />
                        <span>출금 신청하기</span>
                    </button>

                    {/* Charge Button */}
                    <a
                        href="https://ccc-010.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full max-w-[200px] h-[48px] rounded-2xl bg-emerald-500/80 backdrop-blur-md border border-white/20 text-white font-bold text-[14px] shadow-[0_8px_16px_-4px_rgba(16,185,129,0.5)] hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 mb-3"
                    >
                        <img src="/assets/logo_cc_v2.png" className="w-5 h-5 object-contain mix-blend-screen drop-shadow-md" alt="" />
                        <span className="drop-shadow-sm">씨씨카지노 충전하기</span>
                    </a>

                    {/* Secondary Info Link for Unlocked state */}
                    <button
                        onClick={() => setShowConditionsModal(true)}
                        className="w-full max-w-[200px] h-[48px] rounded-2xl bg-white/5 border border-white/10 text-white/70 font-bold text-[14px] hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <ListChecks size={14} />
                        출금 조건 및 규정 확인
                    </button>
                </div>
            ) : (
                /* 2. Locked State (CHARGING MODE) */
                <div className="w-full flex-1 flex flex-col items-center animate-fadeIn">

                    <div className="relative mb-6">
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold tracking-widest uppercase mb-2">
                            THE VAULT
                        </span>

                        {/* Realistic Locked Vault */}
                        <div className="relative w-48 h-48">
                            <img src="/assets/vault/vault_closed.png" alt="Locked Vault" className="w-full h-full object-contain" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-8">
                        <img src="/assets/asset_coin_gold.png" alt="Coin" className="w-8 h-8 object-contain opacity-80" />
                        <div className="text-4xl font-black text-white/90 tracking-tighter">
                            <AnimatedNumber value={view.vaultBalance} />원
                        </div>
                    </div>

                    {/* Dopamine Gauge */}
                    <div className="w-full max-w-xs bg-gray-900 rounded-2xl p-5 border border-gray-800 shadow-2xl relative overflow-hidden group mb-8">

                        {/* Gauge Header */}
                        <div className="flex justify-between items-end mb-4 relative z-10">
                            <span className="text-white font-bold text-sm flex items-center gap-2">
                                <span className="text-white font-black">출금 조건 현황</span>
                            </span>
                            <button
                                onClick={() => setShowProgressModal(true)}
                                className="text-xl font-black text-amber-500 tabular-nums hover:scale-105 active:scale-95 transition-transform"
                            >
                                {view.progressPercent}<span className="text-sm text-amber-500/70">%</span>
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-3 bg-black rounded-full overflow-hidden border border-white/10 relative z-10">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${view.progressPercent}%` }}
                                className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-white animate-shimmer-fast transition-all duration-1000 ease-out"
                            />
                        </div>

                        {/* Message */}
                        <p className="text-[11px] text-gray-400 mt-4 text-center font-medium leading-relaxed">
                            매일 주어지는 <span className="text-amber-500 font-bold">출금 미션</span>(플레이/사용) 달성 시<br />
                            <span className="text-white font-bold">보관금 전액이 즉시 출금 가능해집니다.</span>
                        </p>
                    </div>


                    {/* Footer Info Row - Restored */}
                    <div className="w-full max-w-xs space-y-2 mb-8 px-2">
                        <button
                            onClick={() => setShowConditionsModal(true)}
                            className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-xs font-black tracking-wide hover:bg-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <ListChecks size={16} />
                            <span>출금 조건 확인하기</span>
                        </button>
                    </div>

                    <button className="w-full max-w-[200px] h-[48px] rounded-2xl bg-emerald-500/80 backdrop-blur-md border border-white/20 text-white font-bold text-[14px] shadow-[0_8px_16px_-4px_rgba(16,185,129,0.5)] mb-6 items-center justify-center gap-1.5 flex cursor-not-allowed opacity-50" disabled>
                        <Lock size={16} className="opacity-30" />
                        <span>출금 신청하기</span>
                    </button>



                    {/* Charge Button */}
                    <a
                        href="https://ccc-010.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full max-w-[200px] h-[48px] rounded-2xl bg-emerald-500/80 backdrop-blur-md border border-white/20 text-white font-bold text-[14px] shadow-[0_8px_16px_-4px_rgba(16,185,129,0.5)] hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                        <img src="/assets/logo_cc_v2.png" className="w-4 h-4 object-contain mix-blend-screen" alt="" />
                        씨씨카지노 충전하기
                    </a>
                </div>
            )}

            <AnimatePresence>
                {showConditionsModal && (
                    <WithdrawalConditionsModal
                        onClose={() => setShowConditionsModal(false)}
                        vaultBalance={view.availableAmount}
                        dailyPlayCount={vault.data?.dailyPlayCount ?? 0}
                        dailyPlayTarget={vault.data?.dailyPlayTarget ?? 30}
                        dailyVaultSpent={vault.data?.dailyVaultSpent ?? 0}
                        dailyVaultSpentTarget={vault.data?.dailyVaultSpentTarget ?? 10000}
                        dailyDepositConfirmed={vault.data?.dailyDepositConfirmed ?? false}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showProgressModal && (
                    <WithdrawalProgressModal
                        onClose={() => setShowProgressModal(false)}
                        vaultBalance={view.availableAmount}
                        dailyPlayCount={vault.data?.dailyPlayCount ?? 0}
                        dailyPlayTarget={vault.data?.dailyPlayTarget ?? 30}
                        dailyVaultSpent={vault.data?.dailyVaultSpent ?? 0}
                        dailyVaultSpentTarget={vault.data?.dailyVaultSpentTarget ?? 10000}
                        dailyDepositConfirmed={vault.data?.dailyDepositConfirmed ?? false}
                        withdrawalCount={vault.data?.withdrawalCount ?? 0}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default VaultPageCompact;

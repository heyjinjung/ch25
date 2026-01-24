import React from "react";
import { X, Lock, Gamepad2, Coins, Wallet, Landmark, ChevronRight, Zap } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface WithdrawalProgressModalProps {
    onClose: () => void;
    vaultBalance: number;
    dailyPlayCount: number;
    dailyPlayTarget: number;
    dailyVaultSpent: number;
    dailyVaultSpentTarget: number;
    dailyDepositConfirmed: boolean;
    withdrawalCount: number;
}

const WithdrawalProgressModal: React.FC<WithdrawalProgressModalProps> = ({
    onClose,
    vaultBalance,
    dailyPlayCount,
    dailyPlayTarget,
    dailyVaultSpent,
    dailyVaultSpentTarget,
    dailyDepositConfirmed,
    withdrawalCount
}) => {
    // Determine target based on withdrawal steps
    // Backend enforces 10k -> 10k -> 30k -> 50k (vault_service.py)
    // 0: 10,000
    // 1: 10,000
    // 2: 30,000
    // 3+: 50,000
    let minWithdrawal = 10000;
    if (withdrawalCount === 0) minWithdrawal = 10000;
    else if (withdrawalCount === 1) minWithdrawal = 10000;
    else if (withdrawalCount === 2) minWithdrawal = 30000;
    else minWithdrawal = 50000;

    // Condition Checks
    const isBalanceMet = vaultBalance >= minWithdrawal;
    const isPlayMet = dailyPlayCount >= dailyPlayTarget;
    const isSpentMet = dailyVaultSpent >= dailyVaultSpentTarget;
    const isDepositMet = dailyDepositConfirmed;

    const allConditionsMet = isBalanceMet && isPlayMet && isSpentMet && isDepositMet;

    // Overall Progress Calculation (Average of 4 conditions)
    const p1 = Math.min(100, (vaultBalance / minWithdrawal) * 100);
    const p2 = isDepositMet ? 100 : 0;
    const p3 = Math.min(100, (dailyPlayCount / dailyPlayTarget) * 100);
    const p4 = Math.min(100, (dailyVaultSpent / dailyVaultSpentTarget) * 100);
    const totalProgress = Math.floor((p1 + p2 + p3 + p4) / 4);

    const conditions = [
        {
            id: "min-balance",
            title: "최소 출금??,
            target: `${minWithdrawal.toLocaleString()}??,
            current: `${vaultBalance.toLocaleString()}??,
            status: isBalanceMet,
            icon: Wallet
        },
        {
            id: "plays",
            title: "?�레???�수",
            target: `${dailyPlayTarget}??,
            current: `${dailyPlayCount}??,
            status: isPlayMet,
            icon: Gamepad2
        },
        {
            id: "spent",
            title: "금고 ?�일 ?�용",
            target: `${dailyVaultSpentTarget.toLocaleString()}??,
            current: `${dailyVaultSpent.toLocaleString()}??,
            status: isSpentMet,
            icon: Coins
        },
        {
            id: "deposit",
            title: "?�일 ?�금",
            target: "기록?�요",
            current: isDepositMet ? "?�인?? : "미확??,
            status: isDepositMet,
            icon: Landmark
        }
    ];

    // Haptic interaction (vibrate if supported)
    const handleButtonClick = () => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(20);
        }
        if (allConditionsMet) {
            // Action for withdrawal
            onClose();
        } else {
            // Placeholder: Navigate to exchange or stay
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Glassmorphism Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/40 backdrop-blur-xl"
            />

            {/* Modal Container */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-[360px] bg-[#1a1a1e]/80 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Visual Accent */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/10 rounded-full mt-3" />

                {/* Header */}
                <div className="pt-10 pb-6 px-8 flex flex-col items-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-400/20 to-yellow-600/20 rounded-3xl flex items-center justify-center mb-4 border border-amber-500/20 shadow-lg shadow-amber-900/20">
                        <Lock className="text-amber-400" size={32} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tighter mb-1">출금조건</h2>
                    <p className="text-zinc-500 text-xs font-semibold">게이지가 ??차면 출금가??/p>

                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Main Gauge Section */}
                <div className="px-8 mb-8">
                    <div className="relative group">
                        {/* Legend */}
                        <div className="flex justify-between items-end mb-3 px-1">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                                <Zap size={10} className="text-amber-400 fill-amber-400" />
                                ENERGY STATUS
                            </span>
                            <span className="text-xl font-black text-white font-mono tracking-tighter">
                                {totalProgress}%
                            </span>
                        </div>

                        {/* Thick Cylinder Gauge */}
                        <div className="relative h-14 bg-zinc-800/50 rounded-2xl overflow-hidden border border-white/5 p-1 backdrop-blur-md">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${totalProgress}%` }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                                className="relative h-full rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 flex items-center justify-end px-3 shadow-[0_0_25px_rgba(251,191,36,0.2)]"
                            >
                                {/* End Glow & Pulse */}
                                <motion.div
                                    animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.05, 0.95] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="absolute right-[-8px] w-4 h-full bg-white/40 blur-md rounded-full"
                                />

                                <span className="relative text-[11px] font-black text-amber-950 font-mono">
                                    CHARGING
                                </span>
                            </motion.div>

                            {/* Inner Glass Reflection */}
                            <div className="absolute inset-0 top-0 h-1/2 bg-white/5 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Checklist Section */}
                <div className="px-8 pb-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        {conditions.map((c) => (
                            <div key={c.id} className={clsx(
                                "p-3 rounded-2xl border transition-all duration-300 flex flex-col gap-2",
                                c.status ? "bg-amber-400/5 border-amber-400/20" : "bg-white/[0.02] border-white/5"
                            )}>
                                <div className="flex items-center gap-2">
                                    <div className={clsx(
                                        "p-1.5 rounded-lg",
                                        c.status ? "bg-amber-400 text-amber-950" : "bg-zinc-800 text-zinc-500"
                                    )}>
                                        <c.icon size={14} strokeWidth={2.5} />
                                    </div>
                                    <span className={clsx(
                                        "text-[11px] font-black tracking-tight",
                                        c.status ? "text-amber-400" : "text-zinc-500"
                                    )}>{c.title}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">Current</span>
                                    <span className={clsx(
                                        "text-xs font-black",
                                        c.status ? "text-white" : "text-zinc-500"
                                    )}>{c.current}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-8 pt-4">
                    <button
                        onClick={handleButtonClick}
                        className={clsx(
                            "w-full h-16 rounded-2xl font-black text-base tracking-tighter transition-all flex items-center justify-center gap-2 active:scale-95",
                            allConditionsMet
                                ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 shadow-[0_8px_30px_rgba(245,158,11,0.3)]"
                                : "bg-zinc-800 text-zinc-500 border border-white/5 shadow-inner"
                        )}
                    >
                        {allConditionsMet ? (
                            <motion.div
                                className="flex items-center gap-2"
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                            >
                                <span>지�?바로 출금?�기</span>
                                <ChevronRight size={20} />
                            </motion.div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <span className="text-sm opacity-50">?�너지 충전 �?..</span>
                                <span className="text-[10px] font-bold tracking-widest text-amber-500/60 uppercase">Keep Playing</span>
                            </div>
                        )}
                    </button>

                    {!allConditionsMet && (
                        <p className="text-center mt-4 text-[10px] font-bold text-zinc-600 tracking-tighter">
                            출금 ?�수: {withdrawalCount}??| 최소 {minWithdrawal.toLocaleString()}?��???가??
                        </p>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default WithdrawalProgressModal;

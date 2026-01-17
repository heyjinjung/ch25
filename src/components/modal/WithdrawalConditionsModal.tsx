import React from "react";
import { X, CheckCircle2, Circle, Gamepad2, Coins, Wallet, Landmark, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface WithdrawalConditionsModalProps {
    onClose: () => void;
    vaultBalance: number;
    dailyPlayCount: number;
    dailyPlayTarget: number;
    dailyVaultSpent: number;
    dailyVaultSpentTarget: number;
    dailyDepositConfirmed: boolean;
}

const WithdrawalConditionsModal: React.FC<WithdrawalConditionsModalProps> = ({
    onClose,
    vaultBalance,
    dailyPlayCount,
    dailyPlayTarget,
    dailyVaultSpent,
    dailyVaultSpentTarget,
    dailyDepositConfirmed
}) => {
    const minWithdrawal = 10000;
    const isBalanceMet = vaultBalance >= minWithdrawal;
    const isPlayMet = dailyPlayCount >= dailyPlayTarget;
    const isSpentMet = dailyVaultSpent >= dailyVaultSpentTarget;
    const isDepositMet = dailyDepositConfirmed;

    const allConditionsMet = isBalanceMet && isPlayMet && isSpentMet && isDepositMet;

    const conditions = [
        {
            id: "min-balance",
            title: "최소 출금 가능액",
            description: "보유 금액 10,000원 이상",
            status: isBalanceMet,
            icon: Wallet,
            progress: `${vaultBalance.toLocaleString()} / ${minWithdrawal.toLocaleString()}`,
            percent: Math.min(100, (vaultBalance / minWithdrawal) * 100)
        },
        // [New Condition] Lifetime Deposit > 0 check is implied by 'deposit' status from server
        // but explicit UI can be added if backend sends 'hasLifetimeDeposit' flag. 
        // For now, adhere to 4 main conditions displayed.
        
        {
            id: "deposit",
            title: "금일 입금 내역",
            description: "당일 입금 기록 필요",
            status: isDepositMet,
            icon: Landmark,
            progress: isDepositMet ? "완료" : "미완료",
            percent: isDepositMet ? 100 : 0
        },
        {
            id: "plays",
            title: "게임 플레이",
            // [MODIFIED] Dynamic text for 7-day window and variable target
            description: `최근 3일 이내 게임 ${dailyPlayTarget}회 이상 플레이`,
            status: isPlayMet,
            icon: Gamepad2,
            progress: `${dailyPlayCount} / ${dailyPlayTarget}회`,
            percent: Math.min(100, (dailyPlayCount / dailyPlayTarget) * 100)
        },
        {
            id: "spent",
            title: "금고 사용 실적",
            description: `금고 일일 사용액 ${dailyVaultSpentTarget.toLocaleString()}원 이상`,
            status: isSpentMet,
            icon: Coins,
            progress: `${dailyVaultSpent.toLocaleString()} / ${dailyVaultSpentTarget.toLocaleString()}원`,
            percent: Math.min(100, (dailyVaultSpent / dailyVaultSpentTarget) * 100)
        }
    ];

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-lg"
            />

            {/* Modal Content */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                className="relative w-full max-w-[340px] overflow-hidden rounded-[32px] border border-white/10 bg-[#0f0f11] flex flex-col max-h-[85vh] shadow-[0_0_40px_rgba(163,230,53,0.05)]"
            >
                {/* Background Details */}
                <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-lime-500/10 to-transparent pointer-events-none" />

                {/* Header */}
                <div className="relative pt-8 pb-5 px-6 text-center">

                    <h2 className="text-lg font-black text-white tracking-tight mb-1">
                        출금 신청 조건
                    </h2>
                    <p className="text-white/40 text-xs font-medium">
                        금고 잔액을 출금하기 위한 필수 조건입니다.
                    </p>

                    <button
                        onClick={onClose}
                        title="닫기"
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3 custom-scrollbar">
                    {conditions.map((item) => (
                        <div key={item.id} className="relative group">
                            {/* Card Background */}
                            <div className={clsx(
                                "flex flex-col p-4 rounded-2xl border transition-all duration-300",
                                item.status
                                    ? "bg-lime-500/[0.03] border-lime-500/30 shadow-[inset_0_0_20px_rgba(163,230,53,0.05)]"
                                    : "bg-white/[0.02] border-white/5"
                            )}>
                                {/* Top Row */}
                                <div className="flex items-center gap-3.5 mb-3">
                                    <div className={clsx(
                                        "w-9 h-9 rounded-xl flex items-center justify-center shadow-inner",
                                        item.status
                                            ? "bg-lime-500/10 text-lime-400"
                                            : "bg-black/40 text-zinc-500"
                                    )}>
                                        <item.icon size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className={clsx(
                                                "text-sm font-bold truncate pr-2",
                                                item.status ? "text-white" : "text-white/70"
                                            )}>{item.title}</span>
                                            {item.status ? (
                                                <div className="flex items-center gap-1 text-lime-400">
                                                    <span className="text-[10px] font-bold">완료</span>
                                                    <CheckCircle2 size={14} className="fill-lime-500/20" />
                                                </div>
                                            ) : (
                                                <Circle size={14} className="text-white/10" />
                                            )}
                                        </div>
                                        <div className="text-[11px] text-white/30 truncate mt-0.5">{item.description}</div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-1">
                                    <div className="flex justify-between items-center text-[10px] font-bold mb-1.5">
                                        <span className={item.status ? "text-lime-500/70" : "text-zinc-600"}>
                                            PROGRESS
                                        </span>
                                        <span className={item.status ? "text-lime-400" : "text-zinc-500"}>
                                            {item.progress}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.percent}%` }}
                                            className={clsx(
                                                "h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(163,230,53,0.6)]",
                                                item.status ? "bg-lime-500" : "bg-white/10"
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Action */}
                <div className="p-5 pt-0 mt-2">
                    <button
                        onClick={onClose}
                        className={clsx(
                            "w-full py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2",
                            allConditionsMet
                                ? "bg-lime-400 text-black shadow-[0_0_20px_rgba(163,230,53,0.4)] hover:brightness-110 active:scale-[0.98]"
                                : "bg-zinc-800 text-zinc-500 cursor-default"
                        )}
                    >
                        <span>{allConditionsMet ? "지금 바로 출금하기" : "조건 달성 시 출금 가능"}</span>
                        {allConditionsMet && <ChevronRight size={16} />}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default WithdrawalConditionsModal;

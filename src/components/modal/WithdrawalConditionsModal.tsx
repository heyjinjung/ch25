import React from "react";
import { X, CheckCircle2, Circle, Gamepad2, Coins, Wallet, Landmark } from "lucide-react";
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

    const conditions = [
        {
            id: "min-balance",
            title: "최소 출금액",
            description: `${minWithdrawal.toLocaleString()}원 이상`,
            status: isBalanceMet,
            icon: Wallet,
            progress: `${vaultBalance.toLocaleString()} / ${minWithdrawal.toLocaleString()}`,
            percent: Math.min(100, (vaultBalance / minWithdrawal) * 100)
        },
        {
            id: "deposit",
            title: "오늘의 입금",
            description: "오늘 입금 내역 확인",
            status: isDepositMet,
            icon: Landmark,
            progress: isDepositMet ? "확인됨" : "확인 안됨",
            percent: isDepositMet ? 100 : 0
        },
        {
            id: "plays",
            title: "게임 플레이",
            description: "일일 게임 플레이 횟수",
            status: isPlayMet,
            icon: Gamepad2,
            progress: `${dailyPlayCount} / ${dailyPlayTarget}회`,
            percent: Math.min(100, (dailyPlayCount / dailyPlayTarget) * 100)
        },
        {
            id: "spent",
            title: "금고 소비",
            description: "보관금 소진(잠금해제)액",
            status: isSpentMet,
            icon: Coins,
            progress: `${dailyVaultSpent.toLocaleString()} / ${dailyVaultSpentTarget.toLocaleString()}원`,
            percent: Math.min(100, (dailyVaultSpent / dailyVaultSpentTarget) * 100)
        }
    ];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Content */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-[360px] bg-white/[0.03] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-2xl"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-white/40 hover:text-white transition-colors z-10"
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="pt-8 pb-4 px-6 text-center border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                    <h2 className="text-xl font-black text-white italic tracking-tight mb-1">WITHDRAWAL CONDITIONS</h2>
                    <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest">출금 신청 조건 상세</p>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {conditions.map((item) => (
                        <div key={item.id} className="relative group">
                            <div className={clsx(
                                "p-4 rounded-2xl border transition-all duration-300",
                                item.status
                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                    : "bg-white/[0.02] border-white/5"
                            )}>
                                <div className="flex items-center gap-4 mb-3">
                                    <div className={clsx(
                                        "w-10 h-10 rounded-xl flex items-center justify-center border transition-colors",
                                        item.status
                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                            : "bg-white/5 border-white/10 text-white/20"
                                    )}>
                                        <item.icon size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-sm font-bold text-white/90">{item.title}</span>
                                            {item.status ? (
                                                <CheckCircle2 size={16} className="text-emerald-400" />
                                            ) : (
                                                <Circle size={16} className="text-white/10" />
                                            )}
                                        </div>
                                        <div className="text-[11px] text-white/40 font-medium">{item.description}</div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-black tabular-nums">
                                        <span className={item.status ? "text-emerald-400/60" : "text-white/20"}>PROGRESS</span>
                                        <span className={item.status ? "text-emerald-400" : "text-white/60"}>{item.progress}</span>
                                    </div>
                                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 p-0.5">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.percent}%` }}
                                            className={clsx(
                                                "h-full rounded-full transition-all duration-500",
                                                item.status ? "bg-emerald-500" : "bg-white/10"
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 bg-black/20 border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-2xl bg-white text-black font-black text-base active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                    >
                        <span>확인했습니다</span>
                    </button>
                    <p className="text-center mt-3 text-[10px] text-white/30 font-bold">
                        * 모든 조건 충족 시 출금 버튼이 활성화됩니다.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default WithdrawalConditionsModal;

import React from "react";
import { X, Heart, Zap, ArrowRight, Coins, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { tryHaptic } from "../../utils/haptics";
import { requestTrialGrant } from "../../api/trialGrantApi";
import { useToast } from "../common/ToastProvider";
import { useNavigate } from "react-router-dom";

interface BailoutModalProps {
    onClose: () => void;
    vaultBalance: number;
    onSuccess?: () => void;
}

const BailoutModal: React.FC<BailoutModalProps> = ({ onClose, vaultBalance, onSuccess }) => {
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [isGranting, setIsGranting] = React.useState(false);
    const hasVaultBalance = vaultBalance > 0;

    const handleVaultClick = () => {
        tryHaptic(30);
        navigate("/vault");
        onClose();
    };

    const handleTrialGrant = async () => {
        tryHaptic(50);
        setIsGranting(true);
        try {
            // Defaulting to ROULETTE_COIN for trial, or we could randomize
            const res = await requestTrialGrant({ token_type: "ROULETTE_COIN" });
            if (res.result === "OK") {
                addToast(`${res.granted}개의 체험 티켓이 지급되었습니다!`, "success");
                onSuccess?.();
                onClose();
            } else {
                addToast("이미 오늘 지원금을 받으셨거나 지급 대상이 아닙니다.", "error");
                onClose();
            }
        } catch (err) {
            addToast("지원금 지급 중 오류가 발생했습니다.", "error");
        } finally {
            setIsGranting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
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
                className="relative w-full max-w-sm rounded-[32px] overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl shadow-emerald-500/20"
            >
                {/* Visual Header */}
                <div className="relative h-48 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 to-transparent" />
                    <div className="absolute top-0 left-0 w-full h-full opacity-30">
                        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.4)_0%,transparent_70%)] animate-pulse" />
                    </div>

                    <motion.div
                        animate={{
                            scale: [1, 1.05, 1],
                            rotate: [0, -3, 3, 0]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="relative z-10"
                    >
                        <img
                            src={hasVaultBalance ? "/assets/asset_coin_gold.png" : "/assets/asset_ticket_trial.png"}
                            alt="Rescue"
                            className="w-32 h-32 object-contain drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                        />
                    </motion.div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="닫기"
                        title="닫기"
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 pb-8 pt-4 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-widest uppercase mb-4">
                        <Heart size={12} className="fill-current" />
                        Rescue Mission
                    </div>

                    <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                        {hasVaultBalance ? "보관금이 남아있어요!" : "에너지가 바닥났어요!"}
                    </h2>
                    <p className="text-sm font-medium text-white/50 mb-8 leading-relaxed">
                        {hasVaultBalance
                            ? "티켓이 부족하지만 보관된 금액으로\n즉시 게임을 계속할 수 있습니다."
                            : "심폐소생술 들어갑니다! ⚡\n오늘의 구제 지원금을 받고 다시 도전하세요."}
                    </p>

                    <div className="flex flex-col gap-3">
                        {hasVaultBalance ? (
                            <button
                                onClick={handleVaultClick}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black text-lg shadow-[0_12px_24px_-8px_rgba(16,185,129,0.4)] active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                            >
                                <Coins size={20} />
                                <span>금고에서 티켓 채우기</span>
                                <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button
                                disabled={isGranting}
                                onClick={handleTrialGrant}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black text-lg shadow-[0_12px_24px_-8px_rgba(245,158,11,0.4)] active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                            >
                                {isGranting ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} className="fill-current" />}
                                <span>체험 티켓 3장 받기</span>
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-bold text-sm hover:text-white transition-colors"
                        >
                            다음에 하기
                        </button>
                    </div>
                </div>

                {/* Bottom Deco */}
                <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
            </motion.div>
        </div>
    );
};

export default BailoutModal;

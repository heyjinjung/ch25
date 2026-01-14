import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, ArrowRight, Wallet, Ticket, HeartCrack } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { requestTrialGrant } from "../../api/trialGrantApi";
import { tryHaptic } from "../../utils/haptics";
import { useToast } from "../common/ToastProvider";

interface BailoutModalProps {
    onClose: () => void;
    vaultBalance: number;
}

const BailoutModal: React.FC<BailoutModalProps> = ({ onClose, vaultBalance }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const [isClaiming, setIsClaiming] = useState(false);

    // If user has vault balance, guide them to exchange.
    // If user has NO vault balance, offer free trial grant.
    const isBroke = vaultBalance === 0;

    const handleClaimTrial = async () => {
        if (isClaiming) return;
        tryHaptic(50);
        setIsClaiming(true);

        try {
            // Request ROULETTE_COIN by default for bailout
            const res = await requestTrialGrant({ token_type: "ROULETTE_COIN" });
            if (res.result === "OK" && res.granted > 0) {
                addToast(`체험용 티켓 ${res.granted}개를 받았습니다!`, "success");
                await queryClient.invalidateQueries({ queryKey: ["vault-status"] });
                onClose();
            } else {
                addToast("지금은 체험 티켓을 받을 수 없습니다.", "error");
            }
        } catch (error: any) {
            // 429 or other errors
            // Using generic error handling effectively
            const msg = error?.response?.data?.detail || "오류가 발생했습니다.";
            addToast(msg, "error");
        } finally {
            setIsClaiming(false);
        }
    };

    const handleGoToVault = () => {
        tryHaptic(20);
        onClose();
        navigate("/vault");
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-sm overflow-hidden rounded-[32px] border border-white/10 bg-zinc-900 shadow-2xl"
            >
                {/* Decorative Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none" />

                <div className="relative p-6 flex flex-col items-center text-center">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full text-white/30 hover:text-white/80 hover:bg-white/5 transition-colors"
                        aria-label="모달 닫기"
                    >
                        <X size={20} />
                    </button>

                    {/* Icon */}
                    <div className="mb-6 relative">
                        <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center relative z-10 border border-indigo-500/20">
                            {isBroke ? <HeartCrack size={40} className="text-indigo-400" /> : <Wallet size={40} className="text-indigo-400" />}
                        </div>
                        <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
                    </div>

                    {/* Content */}
                    <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                        {isBroke ? "티켓이 부족하신가요?" : "티켓을 충전해보세요!"}
                    </h2>
                    <p className="text-white/60 text-sm mb-8 leading-relaxed">
                        {isBroke
                            ? "보유한 금고 잔액도 없습니다.\n체험판 티켓으로 다시 도전해보세요!"
                            : `금고에 보관된 ${vaultBalance.toLocaleString()}원으로\n티켓을 구매하고 게임을 즐겨보세요!`}
                    </p>

                    {/* Actions */}
                    <div className="w-full space-y-3">
                        {isBroke ? (
                            <button
                                onClick={handleClaimTrial}
                                disabled={isClaiming}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                            >
                                {isClaiming ? "지급 받는 중..." : "체험 티켓 받기 (무료)"}
                                {!isClaiming && <Ticket size={18} className="group-hover:rotate-12 transition-transform" />}
                            </button>
                        ) : (
                            <button
                                onClick={handleGoToVault}
                                className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-base shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                금고에서 충전하기
                                <ArrowRight size={18} />
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-2xl bg-white/5 text-white/50 font-bold text-sm hover:bg-white/10 hover:text-white transition-colors"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default BailoutModal;

import React from "react";
import { X, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface VipPromotionModalProps {
    onClose: () => void;
}

const VipPromotionModal: React.FC<VipPromotionModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal Content */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-[340px] bg-zinc-950 border border-amber-500/30 rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5),0_0_20px_rgba(217,119,6,0.2)]"
            >
                {/* Background Textures */}
                <div className="absolute inset-0 bg-[url('/assets/pattern_noise.png')] opacity-[0.03] pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    aria-label="VIP 모달 닫기"
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-colors z-30 border border-white/5"
                >
                    <X size={18} />
                </button>

                {/* Hero Header */}
                <div className="relative pt-10 pb-6 flex flex-col items-center text-center overflow-hidden border-b border-white/5">
                    {/* Radial Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 blur-[60px] rounded-full" />

                    <motion.div
                        initial={{ rotate: -10, scale: 0.8 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: "spring", damping: 12, stiffness: 120, delay: 0.1 }}
                        className="relative p-5 rounded-full bg-gradient-to-b from-white/10 to-transparent mb-4 backdrop-blur-md border border-white/20 shadow-2xl"
                    >
                        <img src="/images/crown2.png" alt="VIP Crown" className="w-16 h-16 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.8, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute -top-1 -right-1 text-amber-300"
                        >
                            <Sparkles size={20} />
                        </motion.div>
                    </motion.div>

                    <h2 className="text-xl font-black text-amber-400 uppercase tracking-[0.2em] mb-1">
                        VIP LOUNGE
                    </h2>
                    <p className="text-white font-bold text-base leading-snug">
                        회장님, 귀하를<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">최고 등급 라운지</span>로 모십니다
                    </p>
                </div>

                {/* Reward Section */}
                <div className="p-6 flex flex-col items-center gap-5">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="w-full flex flex-col items-center gap-1.5 p-5 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 relative overflow-hidden group"
                    >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                        <div className="flex items-center gap-2 text-amber-500/60 mb-0.5">
                            <TrendingUp size={12} />
                            <span className="text-[9px] font-black tracking-widest uppercase">Whale 패스트트랙 보너스</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-black text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">+500</span>
                            <span className="text-lg font-black text-amber-500/50">XP</span>
                        </div>
                        <p className="text-[10px] text-white/30 font-medium">시즌 패스 레벨이 상승했습니다</p>
                    </motion.div>

                    <motion.button
                        whileHover={{ scale: 1.02, brightness: 1.1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-black font-black text-lg shadow-[0_8px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all outline-none"
                    >
                        혜택 수령하기
                    </motion.button>

                    <p className="text-[9px] text-white/20 font-bold uppercase tracking-[0.3em] text-center">
                        Premium Service Only
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default VipPromotionModal;

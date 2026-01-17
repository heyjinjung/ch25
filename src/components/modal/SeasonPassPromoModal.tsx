import React from "react";
import { X, Crown, TrendingUp, Zap, Gem } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface SeasonPassPromoModalProps {
    onClose: () => void;
}

const SeasonPassPromoModal: React.FC<SeasonPassPromoModalProps> = ({ onClose }) => {
    const navigate = useNavigate();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            {/* Backdrop */}
            <div
                className="absolute inset-0"
                onClick={onClose}
            />

            {/* Content */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="relative w-full max-w-[360px] bg-[#121212] border border-amber-500/30 rounded-[32px] overflow-hidden shadow-2xl shadow-amber-900/40"
            >
                {/* Background FX */}
                <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-amber-600/20 to-transparent pointer-events-none" />
                <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-amber-500/30 blur-[60px] rounded-full" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    aria-label="닫기"
                    className="absolute top-5 right-5 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white/50 hover:bg-black/60 hover:text-white transition-all backdrop-blur-md"
                >
                    <X size={18} />
                </button>

                {/* Hero Section */}
                <div className="relative pt-10 pb-6 text-center px-6">
                     <motion.div 
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-400 to-orange-600 rounded-3xl flex items-center justify-center shadow-[0_10px_30px_rgba(245,158,11,0.4)] mb-6 rotate-3 border border-white/20"
                    >
                        <Crown size={40} className="text-white drop-shadow-md" strokeWidth={2.5} />
                    </motion.div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black tracking-widest uppercase mb-3">
                        <Zap size={12} className="fill-current" />
                        Limited Offer
                    </div>

                    <h2 className="text-2xl font-black text-white leading-tight mb-2">
                        시즌패스로<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">초고속 레벨업!</span>
                    </h2>
                    
                    <p className="text-zinc-500 text-xs font-medium">
                        레벨 시스템을 모르셔도 괜찮아요.<br/>
                        그냥 혜택만 받아가세요!
                    </p>
                </div>

                {/* Level Progress Visualize */}
                <div className="px-6 mb-6">
                    <div className="relative p-5 rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
                        {/* Progress Bar Animation */}
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-500 mb-2">
                            <span>Lv.1</span>
                            <span className="text-amber-500 animate-pulse">Lv.10 Easy!</span>
                        </div>
                        <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: "10%" }}
                                animate={{ width: "60%" }}
                                transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                            />
                            {/* Particles */}
                            <div className="absolute top-0 right-[40%] text-[8px]">✨</div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
                            <TrendingUp size={12} className="text-amber-500" />
                            <span>남들보다 <b className="text-white">3배</b> 더 빨리 성장합니다.</span>
                        </div>
                    </div>
                </div>

                {/* Rewards Compact */}
                <div className="px-6 grid grid-cols-2 gap-3 mb-8">
                    <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Gem size={16} className="text-blue-400" />
                         </div>
                         <div className="text-center">
                            <div className="text-[10px] text-zinc-500 font-bold mb-0.5">매일 지급</div>
                            <div className="text-xs font-bold text-white">다이아몬드 키</div>
                         </div>
                    </div>
                    
                    <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <Crown size={16} className="text-amber-500" />
                         </div>
                         <div className="text-center">
                            <div className="text-[10px] text-zinc-500 font-bold mb-0.5">VIP 혜택</div>
                            <div className="text-xs font-bold text-white">전용 프로필</div>
                         </div>
                    </div>
                </div>

                {/* Action Section */}
                <div className="p-6 pt-0">
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                            navigate("/vault");
                            onClose();
                        }}
                        className="relative w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black text-lg shadow-[0_8px_20px_-8px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2 overflow-hidden group"
                    >
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                        <span>시즌패스 확인하기</span>
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
};

export default SeasonPassPromoModal;

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
            <div
                className="absolute inset-0"
                onClick={onClose}
            />

            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="relative w-[90%] max-w-[320px] bg-[#121212] border border-amber-500/30 rounded-[28px] overflow-hidden shadow-2xl shadow-amber-900/40"
            >
                {/* Background FX */}
                <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-amber-600/20 to-transparent pointer-events-none" />
                <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-amber-500/30 blur-[60px] rounded-full" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    aria-label="닫기"
                    className="absolute top-4 right-4 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-black/40 text-white/50 hover:bg-black/60 hover:text-white transition-all backdrop-blur-md"
                >
                    <X size={16} />
                </button>

                {/* Hero Section */}
                <div className="relative pt-6 pb-3 text-center px-5">
                     <motion.div 
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-[0_8px_24px_rgba(245,158,11,0.4)] mb-3 rotate-3 border border-white/20"
                    >
                        <Crown size={32} className="text-white drop-shadow-md" strokeWidth={2.5} />
                    </motion.div>

                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black tracking-widest uppercase mb-1.5">
                        <Zap size={10} className="fill-current" />
                        Limited Offer
                    </div>

                    <h2 className="text-lg font-black text-white leading-tight">
                        시즌패스로<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">초고속 레벨업!</span>
                    </h2>
                </div>

                {/* Level Progress Visualize */}
                <div className="px-5 mb-4">
                    <div className="relative p-3 rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden">
                        {/* Progress Bar Animation */}
                        <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 mb-1.5">
                            <span>Lv.1</span>
                            <span className="text-amber-500 animate-pulse">Lv.10 Easy!</span>
                        </div>
                        <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: "10%" }}
                                animate={{ width: "60%" }}
                                transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                            />
                            {/* Particles */}
                            <div className="absolute top-0 right-[40%] text-[8px]">✨</div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-400 font-medium">
                            <TrendingUp size={12} className="text-amber-500" />
                            <span>남들보다 <b className="text-white">3배</b> 더 빨리 성장합니다.</span>
                        </div>
                    </div>
                </div>

                {/* Rewards Compact */}
                <div className="px-5 grid grid-cols-2 gap-2 mb-5">
                    <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center gap-1">
                         <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Gem size={12} className="text-blue-400" />
                         </div>
                         <div className="text-center leading-tight">
                            <div className="text-[9px] text-zinc-500 font-bold mb-0.5">매일 지급</div>
                            <div className="text-[10px] font-bold text-white">다이아몬드 키</div>
                         </div>
                    </div>
                    
                    <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center gap-1">
                         <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <Crown size={12} className="text-amber-500" />
                         </div>
                         <div className="text-center leading-tight">
                            <div className="text-[9px] text-zinc-500 font-bold mb-0.5">VIP 혜택</div>
                            <div className="text-[10px] font-bold text-white">전용 프로필</div>
                         </div>
                    </div>
                </div>

                {/* Action Section */}
                <div className="px-5 pb-5">
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                            navigate("/vault");
                            onClose();
                        }}
                        className="relative w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black text-sm shadow-[0_8px_20px_-8px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2 overflow-hidden group"
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

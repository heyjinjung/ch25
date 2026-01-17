import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
// import { useNavigate } from "react-router-dom";

interface LimitedOfferModalProps {
    onClose: () => void;
}

const LimitedOfferModal: React.FC<LimitedOfferModalProps> = ({ onClose }) => {
    // const navigate = useNavigate();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0"
                onClick={onClose}
            />

            {/* Content */}
            <div className="relative w-full max-w-sm rounded-3xl border border-emerald-500/30 bg-[#070D0A] p-1 shadow-[0_0_60px_rgba(16,185,129,0.25)] overflow-hidden animate-zoom-in">

                {/* Animated Background Rays */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent,rgba(16,185,129,0.3),transparent)] animate-spin-slow" />
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
                >
                    <X className="w-5 h-5 text-white/40" />
                </button>

                <div className="relative rounded-[1.3rem] bg-gradient-to-b from-emerald-500/10 to-transparent overflow-hidden">
                    {/* Hero Section with Glassmorphism */}
                    <div className="relative p-8 flex flex-col items-center text-center pt-12 pb-10 backdrop-blur-xl bg-gradient-to-br from-emerald-500/20 via-lime-500/10 to-transparent border-b border-emerald-500/20">

                        {/* Glass overlay for depth */}
                        <div className="absolute inset-0 bg-white/[0.02] mix-blend-overlay" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.15),transparent_70%)]" />

                        {/* LIMITED badge */}
                        <div className="absolute top-4 left-4 px-3 py-1 bg-red-500/90 backdrop-blur-md text-white text-[10px] font-black rounded-full animate-pulse shadow-lg shadow-red-500/50">
                            LIMITED TIME
                        </div>

                        {/* Icon with multiple layers for depth */}
                        <div className="relative mb-5">
                            <motion.div
                                className="absolute inset-0 rounded-full border-2 border-emerald-400/40 blur-sm"
                                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <motion.div
                                className="absolute inset-0 rounded-full bg-emerald-500/40 blur-xl"
                                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.8, 0.4] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <motion.div
                                className="relative p-5 rounded-full bg-gradient-to-br from-emerald-400/30 via-lime-400/30 to-emerald-500/30 backdrop-blur-md border-2 border-white/30 shadow-[0_10px_40px_rgba(16,185,129,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]"
                                animate={{
                                    scale: [1, 1.05, 1],
                                    boxShadow: [
                                        "0 10px 40px rgba(16,185,129,0.4), inset 0 1px 0 rgba(255,255,255,0.3)",
                                        "0 15px 50px rgba(16,185,129,0.6), inset 0 1px 0 rgba(255,255,255,0.4)",
                                        "0 10px 40px rgba(16,185,129,0.4), inset 0 1px 0 rgba(255,255,255,0.3)"
                                    ]
                                }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <motion.img
                                    src="/assets/icons/gift-dynamic-color.png"
                                    alt="Gift"
                                    className="h-16 w-16 object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]"
                                    animate={{ y: [0, -6, 0], rotate: [0, -5, 5, 0] }}
                                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                />
                            </motion.div>
                        </div>

                        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-lime-200 to-emerald-300 uppercase tracking-wider mb-3 drop-shadow-[0_2px_10px_rgba(16,185,129,0.5)]">
                            준비중
                        </h2>
                        <p className="text-emerald-100/80 font-bold leading-relaxed max-w-[220px] text-sm drop-shadow-md">
                            곧 만날 수 있는<br />특별한 패키지를 준비중입니다!
                        </p>
                    </div>

                    {/* Action Section */}
                    <div className="p-6 space-y-3 bg-gradient-to-b from-transparent to-black/40">
                        {/* Coming soon indicator with glass effect */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-lime-500/10 backdrop-blur-md border border-emerald-500/30 flex items-center justify-center shadow-[0_4px_20px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]">
                            <span className="text-sm font-black text-emerald-300 tracking-wider uppercase">Coming Soon</span>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-400 via-lime-400 to-emerald-500 text-black font-black text-lg shadow-[0_10px_30px_rgba(16,185,129,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] active:scale-95 transition-all hover:shadow-[0_15px_40px_rgba(16,185,129,0.5)]"
                        >
                            알림 신청하기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LimitedOfferModal;

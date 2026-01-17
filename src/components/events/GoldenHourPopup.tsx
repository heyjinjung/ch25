import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import Button from "../common/Button";
import { tryHaptic } from "../../utils/haptics";

interface GoldenHourPopupProps {
    onClose: () => void;
    multiplier: number;
}

const GoldenHourPopup: React.FC<GoldenHourPopupProps> = ({ onClose, multiplier }) => {
    const displayMultiplier = Number.isFinite(multiplier) ? multiplier : 2;
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-sm rounded-3xl border border-emerald-500/30 bg-[#070D0A] p-1 shadow-[0_0_60px_rgba(16,185,129,0.25)] overflow-hidden animate-zoom-in">

                {/* Animated Background Rays */}
                <div className="absolute inset-0 opacity-30 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent,rgba(16,185,129,0.4),transparent)] animate-spin-slow" />
                </div>

                <div className="relative rounded-[1.3rem] bg-gradient-to-b from-emerald-500/10 to-transparent p-6 flex flex-col items-center text-center">

                    {/* Header Banner */}
                    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 mb-5">
                        <img
                            src="/assets/welcome/header_2026_newyear.webp"
                            alt=""
                            className="w-full h-20 object-cover"
                        />
                    </div>

                    <button
                        onClick={() => { tryHaptic(10); onClose(); }}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-white/40" />
                    </button>

                    {/* Icon Section */}
                    <div className="relative mb-6">
                        <motion.div
                            className="absolute inset-0 rounded-full border border-emerald-400/40"
                            animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0.6, 0.2] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <motion.div
                            className="absolute inset-0 rounded-full blur-2xl bg-emerald-500/50"
                            animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.7, 0.3] }}
                            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <motion.div
                            className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 via-emerald-400 to-lime-400 shadow-[0_0_40px_rgba(16,185,129,0.6)]"
                            animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <motion.img
                                src="/assets/icons/bomb-dynamic-color.png"
                                alt=""
                                className="h-12 w-12 object-contain drop-shadow-[0_0_12px_rgba(0,0,0,0.6)]"
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                            />
                        </motion.div>
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">
                            HIGH-STAKE DICE
                        </div>
                    </div>

                    <h2 className="text-2xl font-black italic tracking-tight text-white uppercase drop-shadow-lg mb-2 inline-flex items-center justify-center gap-2">
                        <img src="/assets/icons/clock-dynamic-color.png" alt="" className="h-6 w-6 object-contain" />
                        GOLDEN HOUR
                    </h2>
                    <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 mb-5">
                        <span className="text-xs font-black text-emerald-300 animate-pulse">LIVE NOW</span>
                    </div>

                    <p className="text-base font-semibold text-white/80 leading-tight mb-2">
                        지금부터 1시간 동안
                    </p>
                    <p className="text-xl font-black text-white leading-tight mb-6">
                        <span className="text-emerald-300">고액 주사위</span> 적립
                        <span className="ml-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-lime-300 to-emerald-500">
                            {displayMultiplier}배
                        </span>
                        <span className="text-emerald-200"> 폭발</span>
                    </p>

                    <p className="-mt-4 mb-6 text-[11px] font-bold text-white/50">
                        배율은 <span className="text-emerald-300">금고 적립(POINT/CC_POINT)</span>에만 적용됩니다.
                    </p>

                    <Button
                        variant="figma-primary"
                        fullWidth
                        className="rounded-xl py-3.5 bg-gradient-to-r from-emerald-400 via-lime-400 to-emerald-500 border-none shadow-[0_10px_30px_rgba(16,185,129,0.35)] text-base text-black font-black"
                        onClick={() => { tryHaptic(30); onClose(); }}
                    >
                        적립하러 가기
                    </Button>

                    <p className="mt-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                        Limited Time Only
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GoldenHourPopup;

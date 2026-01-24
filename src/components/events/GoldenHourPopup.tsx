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

                    </div>

                    <h2 className="text-2xl font-black italic tracking-tight text-white uppercase drop-shadow-lg mb-2">
                        Í≥®Îì†?ÑÏõå
                    </h2>
                    
                    {displayMultiplier > 1 ? (
                        <>
                            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 mb-5">
                                <span className="text-xs font-black text-emerald-300 animate-pulse">LIVE NOW</span>
                            </div>

                            <p className="text-base font-semibold text-white/80 leading-tight mb-2">
                                ÏßÄÍ∏àÎ???1?úÍ∞Ñ ?ôÏïà
                            </p>
                            <p className="text-xl font-black text-white leading-tight mb-6">
                                <span className="text-emerald-300">Í≥†Ïï° Ï£ºÏÇ¨??/span> ?ÅÎ¶Ω
                                <span className="ml-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-lime-300 to-emerald-500">
                                    {displayMultiplier}Î∞?                                </span>
                                <span className="text-emerald-200"> ??∞ú</span>
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/5 border border-white/10 mb-5">
                                <span className="text-xs font-black text-white/40">WAITING</span>
                            </div>
                            <p className="text-lg font-bold text-white/60 leading-tight mb-10 mt-2">
                                ÏßÄÍ∏àÏ? Í≥®Îì†?ÑÏõå ?úÍ∞Ñ???ÑÎãô?àÎã§
                            </p>
                        </>
                    )}



                    <Button
                        variant="figma-primary"
                        fullWidth
                        className="rounded-xl py-3.5 bg-emerald-950 border border-emerald-800 shadow-none text-base text-emerald-50 font-bold hover:bg-emerald-900 active:scale-[0.98] transition-all"
                        onClick={() => { tryHaptic(30); onClose(); }}
                    >
                        ?ÅÎ¶Ω?òÎü¨ Í∞ÄÍ∏?                    </Button>


                </div>
            </div>
        </div>
    );
};

export default GoldenHourPopup;

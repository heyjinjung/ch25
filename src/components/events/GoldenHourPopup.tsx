import React from "react";
import { Zap, X } from "lucide-react";
import Button from "../common/Button";
import { tryHaptic } from "../../utils/haptics";

interface GoldenHourPopupProps {
    onClose: () => void;
    multiplier: number;
}

const GoldenHourPopup: React.FC<GoldenHourPopupProps> = ({ onClose, multiplier }) => {
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-sm rounded-3xl border border-amber-500/30 bg-[#0A0A0A] p-1 shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden animate-zoom-in">

                {/* Animated Background Rays */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent,rgba(245,158,11,0.3),transparent)] animate-spin-slow" />
                </div>

                <div className="relative rounded-[1.3rem] bg-gradient-to-b from-amber-500/10 to-transparent p-6 flex flex-col items-center text-center">

                    <button
                        onClick={() => { tryHaptic(10); onClose(); }}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-white/40" />
                    </button>

                    {/* Icon Section */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 blur-2xl bg-amber-500/40 animate-pulse" />
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/50">
                            <Zap className="h-8 w-8 text-white fill-white" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase drop-shadow-lg mb-1">
                        Golden Hour
                    </h2>
                    <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 mb-5">
                        <span className="text-xs font-black text-amber-400 animate-pulse">LIVE NOW</span>
                    </div>

                    <p className="text-base font-bold text-white/90 leading-tight mb-6">
                        지금부터 1시간 동안<br />
                        <span className="text-amber-400 text-xl font-black">금고 적립 {multiplier}배</span> 보너스!
                    </p>

                    <Button
                        variant="figma-primary"
                        fullWidth
                        className="rounded-xl py-3.5 bg-gradient-to-r from-amber-400 to-amber-600 border-none shadow-amber-500/30 text-base"
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

import React from "react";
import { Zap } from "lucide-react";

interface DiceEventBannerProps {
    active: boolean;
}

const DiceEventBanner: React.FC<DiceEventBannerProps> = ({ active }) => {
    if (!active) return null;

    return (
        <div className="relative mb-6 overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 p-[1px]">
            <div className="relative flex items-center justify-between overflow-hidden rounded-[11px] bg-black/60 px-4 py-3 backdrop-blur-md">

                {/* Animated Background Glow */}
                <div className="absolute inset-0 animate-pulse-slow bg-amber-500/10" />

                <div className="relative flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                        <Zap className="h-6 w-6 fill-current animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black italic tracking-wider text-white uppercase drop-shadow-md">
                            PEAK TIME EVENT
                        </h3>
                        <p className="text-xs font-bold text-amber-400">
                            Win up to 7,777 Points!
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1">
                        <span className="text-[10px] font-bold text-amber-300 animate-pulse">
                            LIVE NOW
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DiceEventBanner;

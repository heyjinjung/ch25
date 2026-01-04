import React, { useEffect, useState } from "react";
import { Zap, Timer } from "lucide-react";

interface GoldenHourTimerProps {
    remainingSeconds: number;
    multiplier: number;
}

const GoldenHourTimer: React.FC<GoldenHourTimerProps> = ({
    remainingSeconds,
    multiplier,
}) => {
    const [seconds, setSeconds] = useState(remainingSeconds);

    useEffect(() => {
        setSeconds(remainingSeconds);
    }, [remainingSeconds]);

    useEffect(() => {
        if (seconds <= 0) return;

        const timer = setInterval(() => {
            setSeconds((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [seconds]);

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    if (seconds <= 0) return null;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 shadow-lg shadow-emerald-500/5 transition-all animate-in fade-in duration-500">
            <div className="relative">
                <div className="absolute inset-0 bg-emerald-400 blur-sm opacity-50 animate-pulse" />
                <Zap size={14} className="text-emerald-400 relative animate-bounce" fill="currentColor" />
            </div>

            <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">
                    {multiplier}x BOOST
                </span>
                <div className="flex items-center gap-1 text-white font-mono text-xs tabular-nums">
                    <Timer size={12} className="text-white/40" />
                    <span className="font-bold opacity-90">{formatTime(seconds)}</span>
                </div>
            </div>
        </div>
    );
};

export default GoldenHourTimer;

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
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950 border border-emerald-800 shadow-none transition-all animate-in fade-in duration-500">
            <div className="relative">
                <Zap size={14} className="text-emerald-400 relative animate-bounce" fill="currentColor" />
            </div>

            <div className="flex items-center gap-1.5 border-l border-emerald-800 pl-2">
                <span className="text-[10px] font-black text-emerald-100 uppercase tracking-tighter">
                    {multiplier}x 금고
                </span>
                <div className="flex items-center gap-1 text-emerald-50 font-mono text-xs tabular-nums">
                    <Timer size={12} className="text-emerald-400/70" />
                    <span className="font-bold opacity-90">{formatTime(seconds)}</span>
                </div>
            </div>
        </div>
    );
};

export default GoldenHourTimer;

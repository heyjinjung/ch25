import React, { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import clsx from "clsx";

interface GoldenHourTimerProps {
    remainingSeconds: number;
    className?: string;
}

const GoldenHourTimer: React.FC<GoldenHourTimerProps> = ({ remainingSeconds, className }) => {
    const [seconds, setSeconds] = useState(remainingSeconds);

    useEffect(() => {
        setSeconds(remainingSeconds);
    }, [remainingSeconds]);

    useEffect(() => {
        if (seconds <= 0) return;
        const interval = setInterval(() => {
            setSeconds((prev) => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [seconds]);

    if (seconds <= 0) return null;

    const mm = Math.floor(seconds / 60);
    const ss = seconds % 60;
    const timeStr = `${mm}:${ss.toString().padStart(2, "0")}`;

    return (
        <div className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 animate-pulse-slow",
            className
        )}>
            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-[10px] font-black text-amber-300 tracking-tighter tabular-nums">
                GOLDEN HOUR {timeStr}
            </span>
        </div>
    );
};

export default GoldenHourTimer;

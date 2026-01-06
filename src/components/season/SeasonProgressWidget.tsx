import React from "react";
import { useSeasonPassStatus } from "../../hooks/useSeasonPass";
import AnimatedNumber from "../common/AnimatedNumber";

const SeasonProgressWidget: React.FC = () => {
    const { data, isLoading } = useSeasonPassStatus();

    if (isLoading || !data) {
        return (
            <div className="w-full h-24 bg-slate-800/50 rounded-2xl animate-pulse" />
        );
    }

    const {
        current_xp: currentXp = 0,
        next_level_xp: nextLevelXp = 1,
        current_level: currentLevel = 0,
        max_level: maxLevel = 0,
    } = data;

    const atMaxLevel = maxLevel > 0 && currentLevel >= maxLevel;
    const safeNext = Math.max(1, nextLevelXp);
    const percent = atMaxLevel ? 100 : Math.min(100, Math.max(0, (currentXp / safeNext) * 100));

    return (
        <div className="relative w-full overflow-hidden rounded-[20px] bg-gradient-to-r from-indigo-900 to-slate-900 border border-indigo-500/30 shadow-lg mb-6">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

            <div className="relative z-10 p-5 flex items-center gap-5">

                {/* Level Badge */}
                <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 shrink-0">
                    <span className="text-[10px] font-bold text-white/80 uppercase tracking-tight">Level</span>
                    <span className="text-3xl font-black text-white leading-none">{currentLevel}</span>
                </div>

                {/* Progress Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <h3 className="text-white font-bold text-lg leading-none mb-1">Season Pass</h3>
                            <p className="text-indigo-200 text-xs font-medium">
                                {atMaxLevel ? "최대 레벨 달성" : "Keep growing to unlock rewards"}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-white font-black text-lg">
                                <AnimatedNumber value={currentXp} />
                            </span>
                            <span className="text-white/40 font-bold text-xs mx-1">/</span>
                            <span className="text-white/60 font-bold text-xs">{safeNext} XP</span>
                        </div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">

                        {/* Fill */}
                        <div
                            className="h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 relative transition-all duration-700 ease-out"
                            style={{ width: `${percent}%` }}
                        >
                            {/* Shimmer Effect */}
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer" />
                        </div>

                    </div>

                    <div className="mt-1 text-right">
                        <span className="text-[10px] font-bold text-indigo-300">{percent.toFixed(1)}% Completed</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeasonProgressWidget;

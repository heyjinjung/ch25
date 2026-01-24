import React from "react";
import { motion } from "framer-motion";
import { Gift, CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import { useMissionStore } from "../../stores/missionStore";
import { tryHaptic } from "../../utils/haptics";

const StreakTrack: React.FC = () => {
    const { streakInfo, streakRules, setStreakModalOpen } = useMissionStore();

    if (!streakInfo || !streakRules) return null;

    const currentStreak = streakInfo.streak_days;
    const claimableDay = streakInfo.claimable_day;
    const sortedRules = [...streakRules].sort((a, b) => a.day - b.day);

    const handleTrackClick = () => {
        tryHaptic(20);
        setStreakModalOpen(true);
    };

    return (
        <div
            onClick={handleTrackClick}
            className="w-full mb-6 cursor-pointer group"
        >
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-1.5">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-wider">
                        <img src="/assets/icons/fire-dynamic-color.png" className="w-4 h-4 object-contain" alt="" />
                        Streak
                    </div>
                    <span className="text-sm font-black text-white glow-gold">
                        Day {currentStreak}
                    </span>
                </div>
                <div className="text-[10px] font-bold text-white/50 group-hover:text-white/80 transition-colors">
                    ?∞Ïπò?¥ÏÑú ?êÏÑ∏??Î≥¥Í∏∞ &gt;
                </div>
            </div>

            {/* Horizontal Scroll Track */}
            <div className="relative w-full overflow-hidden rounded-2xl bg-zinc-900/80 border border-white/5 p-3 shadow-inner">
                {/* Progress Line */}
                <div className="absolute top-1/2 left-3 right-3 h-1 bg-zinc-800 -translate-y-1/2 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, ((currentStreak) / 7) * 100)}%` }}
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
                    />
                </div>

                <div className="relative flex justify-between items-center z-10">
                    {sortedRules.map((rule) => {
                        const day = rule.day;
                        const isPast = currentStreak >= day;
                        // Let's use logic: isPast = currentStreak >= day.
                        // isClaimable = claimableDay === day.

                        const isClaimable = claimableDay === day;
                        const isCurrentTarget = day === (claimableDay || (currentStreak < 7 ? currentStreak + 1 : 7));

                        return (
                            <div key={day} className="flex flex-col items-center gap-2">
                                <div className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shadow-lg",
                                    isPast ? "bg-amber-500 border-amber-400 text-white" :
                                        isClaimable ? "bg-white border-white text-amber-500 animate-bounce" :
                                            isCurrentTarget ? "bg-zinc-800 border-amber-500/50 text-white/50 animate-pulse" :
                                                "bg-zinc-900 border-zinc-800 text-white/20"
                                )}>
                                    {isPast ? (
                                        <CheckCircle2 size={14} />
                                    ) : (
                                        <Gift size={14} className={clsx(isClaimable && "fill-current")} />
                                    )}
                                </div>
                                <span className={clsx(
                                    "text-[9px] font-bold",
                                    isCurrentTarget || isClaimable ? "text-amber-500" : "text-zinc-600"
                                )}>
                                    {day}??
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default StreakTrack;

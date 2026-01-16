// src/components/streak/StreakCard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { CheckCircle2, Gift } from 'lucide-react';
import { StreakRule } from '../../api/streakApi';

interface StreakCardProps {
    day: number;
    rule?: StreakRule;
    currentStreak: number;
    claimableDay?: number | null;
    onClick: () => void;
}

const StreakCard: React.FC<StreakCardProps> = ({ day, rule, currentStreak, claimableDay, onClick }) => {
    const isPast = currentStreak > day;
    const isTarget = day === claimableDay; // Claimable
    
    // Simplified icon logic from AttendanceStreakModal
    const getIcon = () => {
        if (!rule || !rule.grants.length) return <Gift className="text-white/20 w-8 h-8" />;
        const g = rule.grants[0];
        // Multi-reward
        if (rule.grants.length > 1) return <img src="/assets/lottery/icon_gift.png" alt="Gift" className="w-8 h-8 object-contain" />;
        
        // Single Reward
        if (g.token_type === "ROULETTE_COIN") return <span className="text-3xl">🎯</span>;
        if (g.token_type === "DICE_TOKEN") return <span className="text-3xl">🎲</span>;
        if (g.item_type === "DIAMOND" || g.token_type === "DIAMOND") {
            return <img src="/assets/icon_diamond.png" alt="Diamond" className="w-8 h-8 object-contain" />;
        }
        return <img src="/assets/lottery/icon_gift.png" alt="Reward" className="w-8 h-8 object-contain" />;
    };

    return (
        <motion.div
            onClick={onClick}
            whileTap={{ scale: 0.95 }}
            className={clsx(
                "relative flex-shrink-0 w-32 h-40 rounded-[2rem] border p-4 flex flex-col items-center justify-center gap-3 snap-center transition-all duration-300",
                isPast ? "bg-white/5 border-white/5 opacity-60" :
                isTarget ? "bg-gradient-to-br from-amber-500/20 to-orange-600/20 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]" :
                "bg-zinc-900 border-white/10"
            )}
        >
            {/* Status Badge */}
            <div className="absolute top-3 right-3">
                {isPast ? <CheckCircle2 size={16} className="text-emerald-500" /> :
                 isTarget ? <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> :
                 <span className="w-2 h-2 rounded-full bg-white/10" />}
            </div>

            {/* Day Label */}
            <span className={clsx(
                "text-xs font-black uppercase tracking-wider",
                isTarget ? "text-amber-500" : "text-white/40"
            )}>
                Day {day}
            </span>

            {/* Icon */}
            <div className={clsx(
                "w-12 h-12 flex items-center justify-center rounded-xl",
                isTarget ? "bg-amber-500/10" : "bg-white/5"
            )}>
                {getIcon()}
            </div>

            {/* Reward Text */}
            <div className="text-center">
                {rule?.grants.length === 1 && (
                    <p className="text-[10px] font-bold text-white/70">
                        x{rule.grants[0].amount}
                    </p>
                )}
                {(!rule || rule.grants.length > 1) && (
                    <p className="text-[10px] font-bold text-white/70">
                        Bonus
                    </p>
                )}
            </div>
        </motion.div>
    );
};

export default StreakCard;

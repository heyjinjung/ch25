import React from "react";
import { Check, Flame } from "lucide-react";
import { cn } from "../../lib/utils";
import { motion } from "framer-motion";

interface DailyStreakBoardProps {
  currentStreak: number;
  maxStreak?: number; // usually 7
}

export const DailyStreakBoard: React.FC<DailyStreakBoardProps> = ({
  currentStreak,
  maxStreak = 7,
}) => {
  const days = Array.from({ length: maxStreak }, (_, i) => i + 1);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-[#18181B]/60 p-5 backdrop-blur-xl border border-white/5 shadow-2xl">
      {/* Background Accent */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500 fill-orange-500 animate-pulse" />
            Daily Streak
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            매일 접속하고 추가 보상을 획득하세요
          </p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-white tracking-tight">
            {currentStreak}
          </span>
          <span className="text-sm text-zinc-500 font-bold ml-1 uppercase">
            Days
          </span>
        </div>
      </div>

      {/* Streak Grid */}
      <div className="grid grid-cols-7 gap-2 relative z-10">
        {days.map((day) => {
          const isCompleted = day <= currentStreak;
          const isToday = day === currentStreak + 1; // Assuming next logic is strictly sequential

          return (
            <div key={day} className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "w-full aspect-square rounded-xl flex items-center justify-center border transition-all duration-300 relative overflow-hidden group",
                  isCompleted
                    ? "bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : isToday
                      ? "bg-white/5 border-white/20 animate-pulse"
                      : "bg-white/[0.02] border-white/5"
                )}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
                  </motion.div>
                ) : (
                  <span
                    className={cn(
                      "text-xs font-bold",
                      isToday ? "text-white" : "text-zinc-700"
                    )}
                  >
                    {day}
                  </span>
                )}
                
                {/* Shine Effect for completed */}
                {isCompleted && (
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-y-full group-hover:translate-y-[-200%] transition-transform duration-700" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

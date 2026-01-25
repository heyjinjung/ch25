import React from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp } from "lucide-react";

interface VaultStatsProps {
  userRank?: number; // percentile rank (e.g., 10 means top 10%)
  averageComparison?: number; // percentage above average (e.g., 15 means 15% more than average)
  className?: string;
}

export const VaultStats: React.FC<VaultStatsProps> = ({
  userRank = 25,
  averageComparison = 12,
  className = "",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6 }}
      className={`w-full px-4 ${className}`}
    >
      <div className="grid grid-cols-2 gap-3">
        {/* Top percentile card */}
        <div className="relative bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 overflow-hidden">
          {/* Glow effect */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/10 rounded-full blur-3xl" />
          
          <div className="relative space-y-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-xs text-white/50">상위</p>
              <p className="text-2xl font-black text-amber-400">
                {userRank}%
              </p>
            </div>
            <p className="text-[10px] text-white/40 leading-tight">
              사용자입니다
            </p>
          </div>
        </div>

        {/* Above average card */}
        <div className="relative bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 overflow-hidden">
          {/* Glow effect */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl" />
          
          <div className="relative space-y-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-xs text-white/50">평균보다</p>
              <p className="text-2xl font-black text-emerald-400">
                +{averageComparison}%
              </p>
            </div>
            <p className="text-[10px] text-white/40 leading-tight">
              더 벌었어요
            </p>
          </div>
        </div>
      </div>

      {/* Motivational message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mt-3 text-center text-xs text-white/40"
      >
        💡 매일 플레이하면 <span className="text-emerald-400 font-semibold">더 많이 쌓여요</span>
      </motion.p>
    </motion.div>
  );
};

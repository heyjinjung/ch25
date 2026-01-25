import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { Target } from "lucide-react";

interface VaultProgressProps {
  currentAmount: number;
  goalAmount: number;
  className?: string;
}

export const VaultProgress: React.FC<VaultProgressProps> = ({
  currentAmount,
  goalAmount,
  className = "",
}) => {
  const progressRef = useRef<HTMLDivElement>(null);
  const percentage = Math.min((currentAmount / goalAmount) * 100, 100);
  const remaining = Math.max(goalAmount - currentAmount, 0);

  useEffect(() => {
    if (progressRef.current) {
      gsap.to(progressRef.current, {
        width: `${percentage}%`,
        duration: 1.5,
        ease: "power3.out",
      });
    }
  }, [percentage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={`w-full px-4 ${className}`}
    >
      {/* Progress card */}
      <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 pointer-events-none" />

        <div className="relative space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-semibold text-white/70">출금 진행도</span>
            </div>
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              {percentage.toFixed(0)}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 bg-black/40 border border-white/5 rounded-full overflow-hidden">
            <motion.div
              ref={progressRef}
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              style={{ width: "0%" }}
              initial={{ width: "0%" }}
            >
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ["-100%", "200%"],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </motion.div>
          </div>

          {/* Amount labels */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">
              ₩{currentAmount.toLocaleString()}
            </span>
            <span className="text-white/60 font-semibold">
              ₩{goalAmount.toLocaleString()}
            </span>
          </div>

          {/* Remaining amount message */}
          {remaining > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 pt-2 border-t border-white/5"
            >
              <span className="text-sm text-white/50">출금까지</span>
              <span className="text-lg font-bold text-emerald-400">
                ₩{remaining.toLocaleString()}
              </span>
              <span className="text-sm text-white/50">남음</span>
            </motion.div>
          )}

          {/* Success message */}
          {percentage >= 100 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 py-2 px-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
            >
              <span className="text-sm font-bold text-emerald-400">
                🎉 출금 가능! 지금 바로 신청하세요
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

import React from "react";
import { Check, Gift, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { motion } from "framer-motion";

import { MissionDto } from "../../api/missionApi";
import { BorderBeam } from "../../components/ui/BorderBeam";

interface MissionCardProps {
  mission: MissionDto;
  onClaim: (id: string) => void;
  isClaiming: boolean;
}

export const MissionCard: React.FC<MissionCardProps> = ({
  mission,
  onClaim,
  isClaiming,
}) => {
  const percent = Math.min(100, (mission.progress / mission.target) * 100);
  const isClaimable = mission.is_completed && !mission.is_claimed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={cn(
        "relative rounded-[24px] p-5 border transition-all duration-500 overflow-hidden group backdrop-blur-sm",
        isClaimable
          ? "bg-[#18181B]/90 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)]"
          : "bg-white/[0.02] border-white/[0.05]",
      )}
    >
      {/* Dynamic Background Glow for Claimable */}
      {isClaimable && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
          <BorderBeam
            size={250}
            duration={12}
            delay={9}
            colorFrom="#10b981"
            colorTo="#34d399"
          />
        </>
      )}

      <div className="relative z-10 flex flex-col gap-4">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div className="flex-1 mr-4 space-y-1">
            <h3
              className={cn(
                "text-[15px] font-bold tracking-tight transition-colors duration-300",
                isClaimable ? "text-emerald-400" : "text-white/90",
              )}
            >
              {mission.title}
            </h3>
            <p className="text-[12px] text-zinc-500 font-medium leading-relaxed line-clamp-2">
              {mission.description || "이벤트 미션을 달성하고 보상받기"}
            </p>
          </div>

          {/* Reward Badge - Premium Style */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/50 rounded-xl border border-white/5 shadow-inner">
            <Gift
              className={cn(
                "w-3.5 h-3.5",
                isClaimable
                  ? "text-yellow-400 animate-bounce"
                  : "text-zinc-500",
              )}
            />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-600 font-bold leading-none uppercase tracking-tighter">
                보상
              </span>
              <span className="text-xs font-black text-yellow-400 font-mono leading-none mt-0.5">
                {mission.reward_amount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action/Progress Section */}
        <div className="flex items-center justify-between gap-4 mt-2">
          {/* Progress Bar Container */}
          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-[10px] font-bold px-1 uppercase tracking-tight">
              <span
                className={cn(
                  percent >= 100 ? "text-emerald-500" : "text-zinc-600",
                )}
              >
                {percent >= 100 ? "보상 받기 가능" : "진행 중"}
              </span>
              <span
                className={cn(
                  "font-mono",
                  isClaimable ? "text-emerald-400" : "text-zinc-500",
                )}
              >
                {mission.progress.toLocaleString()} /{" "}
                {mission.target.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/[0.03]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
                className={cn(
                  "h-full rounded-full relative",
                  percent >= 100
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    : "bg-zinc-800",
                )}
              >
                {percent >= 100 && (
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"
                    style={{ backgroundSize: "200% 100%" }}
                  />
                )}
              </motion.div>
            </div>
          </div>

          {/* Action Button - High Visual Priority */}
          <div className="flex-shrink-0">
            {mission.is_claimed ? (
              <div className="px-5 py-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-zinc-600 text-[12px] font-bold flex items-center gap-2">
                <Check className="w-3.5 h-3.5" />
                완료됨
              </div>
            ) : isClaimable ? (
              <Button
                size="sm"
                onClick={() => onClaim(mission.id)}
                disabled={isClaiming}
                className="h-11 px-6 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-2xl shadow-[0_8px_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 border-none"
              >
                {isClaiming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "받기"
                )}
              </Button>
            ) : (
              <button
                disabled
                className="h-11 px-5 bg-white/[0.04] border border-white/5 rounded-2xl text-zinc-600 text-[11px] font-black uppercase tracking-widest cursor-default"
              >
                미션
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

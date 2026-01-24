import React from "react";
import { Check, Gift, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { motion } from "framer-motion";

interface MissionDto {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward_type: string;
  reward_amount: number;
  is_completed: boolean;
  is_claimed: boolean;
}

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-2xl p-5 border transition-all duration-300 overflow-hidden",
        isClaimable
          ? "bg-[#18181B]/80 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
          : "bg-[#18181B]/40 border-white/5"
      )}
    >
      {/* Background Glow for Claimable */}
      {isClaimable && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
      )}

      <div className="relative z-10 flex flex-col gap-4">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div className="flex-1 mr-4">
            <h3 className={cn("text-[15px] font-bold tracking-tight mb-1", isClaimable ? "text-white" : "text-zinc-200")}>
              {mission.title}
            </h3>
            <p className="text-xs text-zinc-500 line-clamp-1">
              {mission.description || "이벤트 미션을 달성하고 보상을 받으세요."}
            </p>
          </div>
          
          {/* Reward Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 rounded-lg border border-white/5">
              <Gift className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs font-bold text-yellow-400 font-mono">
                {mission.reward_amount.toLocaleString()}
              </span>
          </div>
        </div>

        {/* Action/Progress Section */}
        <div className="flex items-center justify-between gap-4 mt-1">
          {/* Progress Bar */}
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between text-[11px] font-medium px-0.5">
              <span className="text-zinc-400">
                 {percent >= 100 ? "달성 완료" : "진행중"}
              </span>
              <span className={cn("font-mono", isClaimable ? "text-emerald-400" : "text-zinc-500")}>
                {mission.progress.toLocaleString()} / {mission.target.toLocaleString()}
              </span>
            </div>
            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full relative",
                  percent >= 100 
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-400" 
                    : "bg-zinc-700"
                )}
              >
                  {percent >= 100 && (
                      <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]" />
                  )}
              </motion.div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex-shrink-0">
             {mission.is_claimed ? (
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-zinc-500 text-xs font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    완료됨
                </div>
             ) : isClaimable ? (
                <Button
                   size="sm"
                   onClick={() => onClaim(mission.id)}
                   disabled={isClaiming}
                   className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold border-none shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse hover:animate-none"
                >
                    {isClaiming ? <Loader2 className="w-4 h-4 animate-spin" /> : "보상 받기"}
                </Button>
             ) : (
                <Button
                    size="sm"
                    variant="ghost"
                    className="text-zinc-500 bg-white/5 hover:bg-white/10"
                    disabled
                >
                    <span className="text-xs text-zinc-500">도전중</span>
                </Button>
             )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

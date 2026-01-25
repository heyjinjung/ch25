import { useMemo } from "react";
import { type DiceStatusResponse } from "../../api/gameApi";
import { getRewardItemLabel } from "../../constants/rewardItems";

interface DiceRewardGridProps {
  status?: DiceStatusResponse;
}

export default function DiceRewardGrid({ status }: DiceRewardGridProps) {
  const rewards = useMemo(() => {
    if (!status?.reward_config) {
      // Fallback defaults if not loaded yet
      return [
        { label: "WIN", type: "POINT", amount: 100, color: "text-emerald-400" },
        { label: "DRAW", type: "POINT", amount: 10, color: "text-amber-400" },
        { label: "LOSE", type: "NONE", amount: 0, color: "text-red-400" },
      ];
    }
    const cfg = status.reward_config;
    return [
      {
        label: "WIN",
        type: cfg.win_reward_type ?? "POINT",
        amount: cfg.win_reward_amount ?? 0,
        color: "text-emerald-400",
      },
      {
        label: "DRAW",
        type: cfg.draw_reward_type ?? "POINT",
        amount: cfg.draw_reward_amount ?? 0,
        color: "text-amber-400",
      },
      {
        label: "LOSE",
        type: cfg.lose_reward_type ?? "NONE",
        amount: cfg.lose_reward_amount ?? 0,
        color: "text-red-400",
      },
    ];
  }, [status]);

  return (
    <div className="grid grid-cols-3 gap-2 w-full mt-2">
      {rewards.map((reward, idx) => (
        <div
          key={idx}
          className="flex flex-col items-center justify-center p-3 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md relative overflow-hidden"
        >
          {/* Label Badge */}
          <div className={`text-[10px] font-black ${reward.color} tracking-wider mb-1`}>
            {reward.label}
          </div>

          {/* Icon/Type */}
          <div className="text-white text-xs font-bold text-center leading-tight opacity-90">
             {/* Simple logic: if type is NONE, show 'No Reward' */}
             {reward.type === "NONE" 
                ? "위로금 없음" 
                : getRewardItemLabel(reward.type)
             }
          </div>

          {/* Amount (if valid) */}
          {reward.amount > 0 && reward.type !== "NONE" && (
            <div className="text-[13px] font-black text-white mt-1">
              +{reward.amount.toLocaleString()}
            </div>
          )}
          
          {/* Subtle Shine */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        </div>
      ))}
    </div>
  );
}

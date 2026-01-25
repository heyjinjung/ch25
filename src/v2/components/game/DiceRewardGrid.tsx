import { type DiceStatusResponse } from "../../api/gameApi";

interface DiceRewardGridProps {
  status?: DiceStatusResponse;
}

export default function DiceRewardGrid({ status }: DiceRewardGridProps) {
  // If no config is loaded yet, show "Item Preparing" (아이템 준비중)
  // Ensure we check strict existence
  const hasConfig = status && status.reward_config;

  if (!hasConfig) {
    return (
      <div className="w-full mt-2 p-4 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md flex flex-col items-center justify-center min-h-[80px]">
        <div className="text-zinc-400 text-sm font-bold animate-pulse">
          아이템 준비중...
        </div>
      </div>
    );
  }

  const cfg = status!.reward_config!;

  type Reward = {
    label: string;
    type: string;
    amount: number;
    textColor: string;
    cardClass: string;
    sign: string;
  };

  const rewards: Reward[] = [
    {
      label: "승리",
      type: cfg.win_reward_type ?? "POINT",
      amount: cfg.win_reward_amount ?? 0,
      textColor: "text-[#37EBFF]", // Mint
      cardClass: "reward-card-win",
      sign: "+",
    },
    {
      label: "무승부",
      type: cfg.draw_reward_type ?? "POINT",
      amount: cfg.draw_reward_amount ?? 0,
      textColor: "text-amber-400", // Gold
      cardClass: "reward-card-draw",
      sign: "+",
    },
    {
      label: "패배",
      type: cfg.lose_reward_type ?? "NONE",
      amount: cfg.lose_reward_amount ?? 0,
      textColor: "text-[#FF2A6D]", // Pink/Red
      cardClass: "reward-card-lose",
      sign: "-",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 w-full mt-2">
      {rewards.map((reward, idx) => (
        <div
          key={idx}
          className={`dice-reward-card ${reward.cardClass} flex flex-col items-center justify-center p-3 relative overflow-hidden h-[100px]`}
        >
          {/* Label (Top) */}
          <div
            className={`text-[16px] font-black ${reward.textColor} tracking-widest mb-2 font-['Pretendard']`}
          >
            {reward.label}
          </div>

          {/* Amount + Unit (Bottom) */}
          <div className="flex items-end gap-1">
            {reward.type === "NONE" ? (
              <span className="text-zinc-400 text-sm">없음</span>
            ) : (
              <>
                <span className="text-[18px] font-bold text-white tracking-tighter">
                  {reward.sign}
                  {reward.amount.toLocaleString()}
                </span>
                <span className="text-[14px] text-white/80 font-bold mb-[2px]">
                  원
                </span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

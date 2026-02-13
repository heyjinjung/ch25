import { motion } from "framer-motion";
import { Heart, Sparkles, Check } from "lucide-react";
// import { KOREAN } from "../../pages/event/KoreanConstants"; // Removed

type EventDay = "valentine" | "seol_day1" | "seol_day2" | "seol_day3";

interface ValentineSeolBannerProps {
  eventDay: EventDay;
  streakCurrent: number;
  streakTarget: number;
}

const DAY_CONFIG: Record<
  EventDay,
  {
    badge: string;
    title: string;
    description: string;
    gradient: string;
    accentBorder: string;
    badgeBg: string;
    emoji: string;
  }
> = {
  valentine: {
    badge: "D-DAY",
    title: "Valentine Lucky Box",
    description: "3판 플레이하고 럭키박스를 열어보세요!",
    gradient: "from-rose-500/20 via-pink-500/10 to-transparent",
    accentBorder: "border-rose-500/30",
    badgeBg: "bg-rose-500/20 text-rose-400",
    emoji: "💝",
  },
  seol_day1: {
    badge: "DAY 1",
    title: "설날 세뱃돈",
    description: "100,000원 이상 입금하고 세뱃돈을 받으세요!",
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    accentBorder: "border-amber-500/30",
    badgeBg: "bg-amber-500/20 text-amber-400",
    emoji: "🧧",
  },
  seol_day2: {
    badge: "DAY 2",
    title: "설날 세뱃돈",
    description: "5판 플레이하고 복권을 받으세요!",
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    accentBorder: "border-emerald-500/30",
    badgeBg: "bg-emerald-500/20 text-emerald-400",
    emoji: "🎲",
  },
  seol_day3: {
    badge: "DAY 3",
    title: "설날 세뱃돈",
    description: "300,000원 이상 입금하고 대박 보상을 받으세요!",
    gradient: "from-violet-500/20 via-purple-500/10 to-transparent",
    accentBorder: "border-violet-500/30",
    badgeBg: "bg-violet-500/20 text-violet-400",
    emoji: "💎",
  },
};

const DAY_ORDER: EventDay[] = [
  "valentine",
  "seol_day1",
  "seol_day2",
  "seol_day3",
];

const DAY_LABELS = ["2/14", "2/15", "2/16", "2/17"];

export default function ValentineSeolBanner({
  eventDay,
  streakCurrent,
  streakTarget,
}: ValentineSeolBannerProps) {
  const config = DAY_CONFIG[eventDay];
  const currentDayIndex = DAY_ORDER.indexOf(eventDay);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative overflow-hidden rounded-3xl border ${config.accentBorder} bg-white/[0.02] backdrop-blur-sm`}
    >
      {/* Background gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${config.gradient}`}
      />

      {/* Content */}
      <div className="relative z-10 p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full ${config.badgeBg}`}
              >
                {config.badge}
              </span>
              <span className="text-lg">{config.emoji}</span>
            </div>
            <h3 className="text-lg font-black text-white tracking-tight">
              {config.title}
            </h3>
            <p className="text-sm text-zinc-400 mt-1">{config.description}</p>
          </div>
          <div className="flex items-center gap-1 text-zinc-500">
            {eventDay === "valentine" ? (
              <Heart size={20} className="text-rose-500" />
            ) : (
              <Sparkles size={20} className="text-amber-500" />
            )}
          </div>
        </div>

        {/* 4-Day Streak Progress */}
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              "4일 연속 달성"
            </span>
            <span className="text-[10px] font-bold text-zinc-500">
              {streakCurrent}/{streakTarget}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {DAY_ORDER.map((day, i) => {
              const isCompleted = i < streakCurrent;
              const isCurrent = i === currentDayIndex;

              return (
                <div key={day} className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted
                        ? "border-emerald-500 bg-emerald-500/20"
                        : isCurrent
                          ? `${config.accentBorder} bg-white/5 ring-2 ring-white/10`
                          : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={16} className="text-emerald-400" />
                    ) : (
                      <span
                        className={`text-xs font-bold ${isCurrent ? "text-white" : "text-zinc-600"}`}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium ${isCurrent ? "text-white" : "text-zinc-600"}`}
                  >
                    {DAY_LABELS[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

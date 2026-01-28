import React from "react";
import { X, CheckCircle2, Star, Zap, Gift } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import Button from "../common/Button";
import { tryHaptic } from "../../utils/haptics";
import { EncryptedText } from "../ui/EncryptedText";

import type { V2StreakRule } from "../../api/missionApi";

interface V2AttendanceStreakModalProps {
  onClose: () => void;
  onClaim?: () => Promise<boolean>;
  currentStreak: number;
  claimableDay?: number | null;
  rules: V2StreakRule[];
}

const RefreshCw = ({ className }: { className?: string }) => (
  <svg
    className={clsx("w-6 h-6", className)}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 2v6h-6m-9 14v-6h6m3-10a9 9 0 0 1 7 9m-14 0a9 9 0 0 1 7-9" />
  </svg>
);

const V2AttendanceStreakModal: React.FC<V2AttendanceStreakModalProps> = ({
  onClose,
  onClaim,
  currentStreak,
  claimableDay,
  rules,
}) => {
  const [isClaiming, setIsClaiming] = React.useState(false);
  const sortedRules = [...rules].sort((a, b) => a.day - b.day);

  const getRewardIcon = (day: number, grants: V2StreakRule["grants"]) => {
    const isLastDay = day === 7;
    const sizeClass = isLastDay ? "w-14 h-14" : "w-10 h-10";

    if (grants.length > 1) {
      return (
        <img
          src="/assets/lottery/icon_gift.png"
          alt="Gift"
          className={clsx(sizeClass, "object-contain")}
        />
      );
    }
    const g = grants[0];
    if (!g) return <Star className={clsx(sizeClass, "text-white/20")} />;

    if (g.token_type === "ROULETTE_COIN")
      return <span className={isLastDay ? "text-4xl" : "text-3xl"}>🎯</span>;
    if (g.token_type === "DICE_TOKEN")
      return <span className={isLastDay ? "text-4xl" : "text-3xl"}>🎲</span>;
    if (g.item_type === "DIAMOND" || g.token_type === "DIAMOND") {
      return (
        <img
          src="/assets/icon_diamond.png"
          alt="Diamond"
          className={clsx(sizeClass, "object-contain")}
        />
      );
    }
    return (
      <img
        src="/assets/lottery/icon_gift.png"
        alt="Reward"
        className={clsx(sizeClass, "object-contain")}
      />
    );
  };

  const handleClaim = async () => {
    tryHaptic(50);
    if (claimableDay && onClaim) {
      setIsClaiming(true);
      const success = await onClaim();
      setIsClaiming(false);
      if (success) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const isClaimable = !!claimableDay;

  return (
    <div className="fixed inset-0 z-[10001] flex items-start justify-center overflow-y-auto px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] my-0 rounded-[40px] border border-white/10 bg-zinc-950 overflow-y-auto shadow-2xl"
      >
        {/* Header Decoration */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />

        <div className="relative p-6 sm:p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black tracking-widest uppercase mb-3">
                <Zap size={12} className="fill-current" />
                Streak Bonus
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">
                {isClaimable ? (
                  <EncryptedText text="오늘의 보상 도착!" />
                ) : (
                  <>
                    🔥 <EncryptedText text={`${currentStreak}일 출석 중!`} />
                  </>
                )}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              title="닫기"
              className="p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="relative mb-6">
            <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, (currentStreak / 7) * 100)}%`,
                }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 shadow-[0_0_16px_rgba(245,158,11,0.6)]"
              />
            </div>
            <div className="flex justify-between mt-2 px-1">
              <span className="text-[10px] font-black text-white/40">0일</span>
              <span className="text-[10px] font-black text-amber-500">
                {currentStreak}/7일
              </span>
            </div>
          </div>

          {/* Treasure Grid */}
          <div className="relative mb-8">
            {/* Grid Layout: 4+3 */}
            <div className="grid grid-cols-4 gap-3 mb-3">
              {Array.from({ length: 4 }).map((_, i) => {
                const day = i + 1;
                const rule = sortedRules.find((r) => r.day === day);
                const isPast = currentStreak > day;
                const isToday = currentStreak === day;
                const isTarget = day === claimableDay;

                return (
                  <div
                    key={day}
                    className="relative flex flex-col items-center"
                  >
                    {/* Reward Box */}
                    <motion.div
                      animate={
                        isToday || isTarget
                          ? {
                              scale: [1, 1.05, 1],
                              rotate: [0, 2, -2, 0],
                            }
                          : {}
                      }
                      transition={{ duration: 2, repeat: Infinity }}
                      className={clsx(
                        "relative w-16 h-16 flex items-center justify-center rounded-2xl border-2 transition-all duration-300",
                        isPast
                          ? "bg-gradient-to-br from-amber-500 to-orange-600 border-amber-400 shadow-lg shadow-amber-500/30"
                          : isToday || isTarget
                            ? "bg-gradient-to-br from-white to-gray-100 border-white shadow-[0_0_24px_rgba(255,255,255,0.5)] animate-pulse"
                            : "bg-zinc-900 border-zinc-800",
                      )}
                    >
                      <div className="relative">
                        {rule ? (
                          getRewardIcon(day, rule.grants)
                        ) : (
                          <Gift size={24} className="text-white/20" />
                        )}
                        {isPast && (
                          <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-1 shadow-lg">
                            <CheckCircle2 size={14} className="text-white" />
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* Day Label */}
                    <span
                      className={clsx(
                        "mt-2 text-[11px] font-black tracking-tight",
                        isToday || isTarget
                          ? "text-amber-400"
                          : isPast
                            ? "text-white/60"
                            : "text-white/30",
                      )}
                    >
                      Day{day}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom Row: Day 5, 6, 7 */}
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => {
                const day = i + 5;
                const rule = sortedRules.find((r) => r.day === day);
                const isPast = currentStreak > day;
                const isToday = currentStreak === day;
                const isTarget = day === claimableDay;
                const isFinal = day === 7;

                return (
                  <div
                    key={day}
                    className="relative flex flex-col items-center"
                  >
                    {/* Reward Box */}
                    <motion.div
                      animate={
                        isToday || isTarget
                          ? {
                              scale: [1, 1.08, 1],
                              rotate: [0, 3, -3, 0],
                            }
                          : {}
                      }
                      transition={{ duration: 2, repeat: Infinity }}
                      className={clsx(
                        "relative flex items-center justify-center rounded-2xl border-2 transition-all duration-300",
                        isFinal ? "w-20 h-20" : "w-16 h-16",
                        isPast
                          ? "bg-gradient-to-br from-amber-500 to-orange-600 border-amber-400 shadow-lg shadow-amber-500/30"
                          : isToday || isTarget
                            ? "bg-gradient-to-br from-white to-gray-100 border-white shadow-[0_0_24px_rgba(255,255,255,0.5)] animate-pulse"
                            : "bg-zinc-900 border-zinc-800",
                      )}
                    >
                      <div className="relative">
                        {rule ? (
                          getRewardIcon(day, rule.grants)
                        ) : (
                          <Gift
                            size={isFinal ? 36 : 24}
                            className="text-white/20"
                          />
                        )}
                        {isPast && (
                          <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-1 shadow-lg">
                            <CheckCircle2 size={14} className="text-white" />
                          </div>
                        )}
                        {isFinal && !isPast && (
                          <div className="absolute -top-2 -right-2">
                            <Star
                              size={16}
                              className="text-amber-500 fill-amber-500 animate-pulse"
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* Day Label */}
                    <span
                      className={clsx(
                        "mt-2 text-[11px] font-black tracking-tight",
                        isToday || isTarget
                          ? "text-amber-400"
                          : isPast
                            ? "text-white/60"
                            : "text-white/30",
                      )}
                    >
                      Day{day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {/* Info Pad */}
            <div className="p-5 rounded-3xl bg-white/5 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <p className="text-xs font-black text-white/40 uppercase tracking-widest">
                  출석현황
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-black text-white tabular-nums">
                  {currentStreak}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white/80">
                    일 연속 플레이 중!
                  </p>
                  <p className="text-[11px] font-medium text-white/40">
                    매일 오전 (09:00) 기준갱신
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-amber-500">
                    다음목표
                  </p>
                  <p className="text-lg font-black text-white">
                    Day {currentStreak + 1}
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <Button
              variant={isClaimable ? "figma-primary" : "figma-secondary"}
              fullWidth
              disabled={isClaiming || (!isClaimable && currentStreak > 0)}
              onClick={handleClaim}
              className="shadow-xl"
            >
              {isClaiming ? (
                <RefreshCw className="animate-spin" />
              ) : isClaimable ? (
                "🎁 오늘의 보상받기"
              ) : currentStreak === 0 ? (
                "게임하고 보상받기 🎮"
              ) : (
                "내일 다시 만나요!"
              )}
            </Button>

            {!isClaimable && (
              <button
                onClick={onClose}
                className="w-full py-2 text-xs font-bold text-white/20 hover:text-white transition-colors"
              >
                창 닫기
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default V2AttendanceStreakModal;

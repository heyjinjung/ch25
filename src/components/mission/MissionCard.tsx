// src/components/mission/MissionCard.tsx
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Bell, Check, ChevronRight, Share2, Star, Trophy, Users, Zap } from "lucide-react";

import { useHaptic } from "../../hooks/useHaptic";
import { useSound } from "../../hooks/useSound";
import { MissionData, useMissionStore } from "../../stores/missionStore";
import { useToast } from "../common/ToastProvider";

interface MissionCardProps {
  data: MissionData;
}

const MissionCard: React.FC<MissionCardProps> = ({ data }) => {
  const { mission, progress } = data;
  const { claimReward } = useMissionStore();
  const { addToast } = useToast();
  const { notification, impact } = useHaptic();
  const { playToast } = useSound();
  const queryClient = useQueryClient();

  const isCompleted = progress.is_completed;
  const isClaimed = progress.is_claimed;
  const percent = Math.min(100, Math.round((progress.current_value / Math.max(1, mission.target_value)) * 100));

  const handleClaim = async () => {
    if (!isCompleted || isClaimed) return;
    impact("heavy");
    const result = await claimReward(mission.id);
    if (result.success) {
      notification("success");
      playToast();
      addToast(`ë³´ìƒ ?˜ë ¹ ?„ë£Œ: ${result.amount} ${result.reward_type}!`, "success");
      queryClient.invalidateQueries({ queryKey: ["vault-status"] });
    } else {
      notification("error");
      addToast(result.message || "ë³´ìƒ ?˜ë ¹ ?¤íŒ¨", "error");
    }
  };

  const handleAction = () => {
    impact("medium");
    if (mission.action_type === "JOIN_CHANNEL") {
      const channelLink = "https://t.me/cc_jm_2026_official";
      window.Telegram?.WebApp?.openTelegramLink?.(channelLink) || window.open(channelLink, "_blank");
      return;
    }
    if (mission.action_type === "INVITE_FRIEND") {
      if (window.Telegram?.WebApp?.switchInlineQuery) {
        window.Telegram.WebApp.switchInlineQuery("share_ref", ["users", "groups"]);
      }
      return;
    }
    if (mission.action_type === "SHARE_STORY") {
      if (window.Telegram?.WebApp?.shareToStory) {
        const appUrl = "https://t.me/jm956_bot/ccjm";
        window.Telegram.WebApp.shareToStory("https://placehold.co/1080x1920/png?text=CCJM+Mission!", {
          text: `CCJM?ì„œ ë¯¸ì…˜???„ë£Œ?˜ê³  ë³´ìƒ??ë°›ìœ¼?¸ìš”!`,
          widget_link: { url: appUrl, name: "Play now" },
        });
      }
    }
  };

  const renderIcon = () => {
    const iconClass = "h-5 w-5";
    switch (mission.action_type) {
      case "JOIN_CHANNEL":
        return <Bell className={iconClass} />;
      case "INVITE_FRIEND":
        return <Users className={iconClass} />;
      case "SHARE_STORY":
        return <Share2 className={iconClass} />;
      case "LOGIN":
        return <Star className={iconClass} />;
      default:
        return <Zap className={iconClass} />;
    }
  };

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-[24px] border backdrop-blur-md transition-all",
        isClaimed
          ? "border-white/5 bg-white/5 opacity-60"
          : isCompleted
            ? "border-figma-accent bg-white/10 shadow-lg shadow-emerald-900/20"
            : "border-white/10 bg-white/5 hover:border-white/20"
      )}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Icon */}
        <div
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ring-white/10 transition-transform",
            isClaimed
              ? "bg-black/30 text-white/30"
              : isCompleted
                ? "bg-figma-accent/10 text-figma-accent"
                : "bg-black/30 text-white/70"
          )}
        >
          {isClaimed ? <Check className="h-5 w-5" /> : renderIcon()}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-black leading-snug text-white">{mission.title}</div>
              <div className="truncate text-[11px] font-medium text-white/50">
                {mission.description || "미션을 완료하고 보상을 받으세요"}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2 py-0.5">
                <img src="/assets/icon_diamond.png" alt="" className="h-3 w-3 object-contain" />
                <span className="text-[12px] font-black text-figma-accent">{mission.reward_amount}</span>
              </div>
              {mission.xp_reward > 0 && (
                <div className="mt-1 text-[10px] font-black text-white/50">+{mission.xp_reward} XP</div>
              )}
            </div>
          </div>

          {!isClaimed && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-white/50">
                <span>
                  {progress.current_value} / {mission.target_value}
                </span>
                <span className={clsx(isCompleted ? "text-figma-accent" : "text-white/50")}>
                  {isCompleted ? "READY" : `${percent}%`}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full border border-white/10 bg-white/5">
                <div
                  className={clsx(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    isCompleted ? "bg-[var(--figma-accent-green)]" : "bg-gradient-to-r from-emerald-500/70 via-green-500/60 to-lime-500/60"
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="shrink-0">
          {isClaimed ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/40">
              <Check className="h-5 w-5" />
            </div>
          ) : isCompleted ? (
            <button
              onClick={handleClaim}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-figma-primary text-white shadow-lg shadow-emerald-900/30 transition active:scale-95"
              aria-label="Claim mission reward"
            >
              <Trophy className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleAction}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 active:scale-95"
              aria-label="Mission action"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {isCompleted && !isClaimed && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--figma-accent-green)]/10 to-transparent" />
      )}
    </div>
  );
};

export default MissionCard;

// src/components/mission/MissionCard.tsx
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Bell, Check, ChevronRight, Share2, Star, Trophy, Users, Clock3 } from "lucide-react";

import { useHaptic } from "../../hooks/useHaptic";
import { useSound } from "../../hooks/useSound";
import { useMissionStore, MissionData } from "../../stores/missionStore";
import { recordViralAction, getCloudItem, setCloudItem, verifyChannelSubscription } from "../../api/viralApi";
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
  const [isVerifying, setIsVerifying] = React.useState(false);

  const timeWindow = mission.start_time && mission.end_time
    ? `${mission.start_time.slice(0, 5)} ~ ${mission.end_time.slice(0, 5)}`
    : null;

  const isCompleted = progress.is_completed;
  const isClaimed = progress.is_claimed;
  const percent = Math.min(100, Math.round((progress.current_value / Math.max(1, mission.target_value)) * 100));

  const handleClaim = async () => {
    if (!isCompleted || isClaimed) return;
    impact("heavy");
    try {
      const result = await claimReward(mission.id);
      if (result.success) {
        notification("success");
        playToast();
        const rewardTypeName = result.reward_type === "CASH_UNLOCK" ? "원" : (result.reward_type || "");
        const amountStr = (result.amount || 0).toLocaleString();
        addToast(`보상 수령 완료: ${amountStr}${rewardTypeName}!`, "success");
        queryClient.invalidateQueries({ queryKey: ["vault-status"] });
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
      } else {
        notification("error");
        addToast(result.message || "보상 수령 실패", "error");
      }
    } catch (error) {
      console.error("[MissionCard] Claim failed:", error);
      notification("error");
      addToast("오류가 발생했습니다. 잠시 후 다시 시도해주세요.", "error");
    }
  };

  const handleAction = async () => {
    if (isVerifying) return;
    impact("medium");

    try {
      if (mission.action_type === "JOIN_CHANNEL") {
        setIsVerifying(true);
        // Cloud Caching Check
        const cacheKey = `mission_verified_${mission.id}`;
        const cachedStatus = await getCloudItem(cacheKey);

        if (cachedStatus === "VERIFIED") {
          addToast("이미 인증된 미션입니다.", "success");
          setIsVerifying(false);
          return;
        }

        const channelLink = "https://t.me/+LksI3XlSjLlhZmE0";

        // Verification logic
        const result = await verifyChannelSubscription(mission.id);
        if (result.success) {
          notification("success");
          addToast("구독 인증 완료!", "success");
          await setCloudItem(cacheKey, "VERIFIED");
          useMissionStore.getState().fetchMissions();
        } else {
          // If not verified, open the link so they can join
          const tg = window.Telegram?.WebApp;
          if (tg?.openTelegramLink) {
            tg.openTelegramLink(channelLink);
          } else {
            window.open(channelLink, "_blank");
          }
          addToast("채널에 입장하여 구독해 주세요.", "info");
        }
        return;
      }
      if (mission.action_type === "SHARE") {
        const appUrl = "https://t.me/jm956_bot/ccjm";
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent("CCJM 주간 미션 참여! 여기로 들어오면 바로 시작돼요")}`;

        const tg = window.Telegram?.WebApp;
        if (tg?.openTelegramLink) {
          tg.openTelegramLink(shareUrl);

          // Record action immediately (Trust Approach)
          await recordViralAction({ action_type: "SHARE", mission_id: mission.id });
          const cacheKey = `mission_verified_${mission.id}`;
          await setCloudItem(cacheKey, "VERIFIED");
          useMissionStore.getState().fetchMissions();
        } else {
          addToast("텔레그램 앱에서만 가능한 기능입니다.", "error");
        }
        return;
      }
      if (mission.action_type === "INVITE_FRIEND") {
        if (window.Telegram?.WebApp?.switchInlineQuery) {
          window.Telegram.WebApp.switchInlineQuery("share_ref", ["users", "groups"]);
        } else {
          addToast("텔레그램 앱에서만 가능한 기능입니다.", "error");
        }
        return;
      }
      if (mission.action_type === "SHARE_STORY") {
        if (window.Telegram?.WebApp?.shareToStory) {
          const appUrl = "https://t.me/jm956_bot/ccjm";
          const storyMediaUrl = `${window.location.origin}/assets/story/ccjm_story_1080x1920.mp4`;
          const fallbackShareUrl = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent("CCJM 오픈 기념 미션! 같이 해보자")}`;

          if (!window.location.origin.startsWith("https://")) {
            addToast("스토리 공유는 https 환경에서만 안정적으로 동작합니다.", "error");
          }
          try {
            window.Telegram.WebApp.shareToStory(storyMediaUrl, {
              text: "CCJM 오픈 기념 미션! 같이 해보자",
              widget_link: { url: appUrl, name: "CCJM 열기" },
            });

            // Record action immediately (Trust Approach)
            await recordViralAction({ action_type: "SHARE_STORY", mission_id: mission.id });
            const cacheKey = `mission_verified_${mission.id}`;
            await setCloudItem(cacheKey, "VERIFIED");
            useMissionStore.getState().fetchMissions();
          } catch {
            const tg = window.Telegram?.WebApp;
            if (tg?.openTelegramLink) {
              tg.openTelegramLink(fallbackShareUrl);
            }
            addToast("스토리 공유에 실패했습니다. 일반 공유로 대체합니다.", "error");
          }
        } else {
          addToast("스토리 공유는 모바일 텔레그램 앱에서만 가능합니다.", "error");
        }
        return;
      }
      if (mission.action_type === "SHARE_WALLET") {
        const appUrl = "https://t.me/jm956_bot/ccjm";
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent("내 지갑 💎 CCJM에서 함께 확인해봐!")}`;

        const tg = window.Telegram?.WebApp;
        if (tg?.openTelegramLink) {
          tg.openTelegramLink(shareUrl);

          // Record action immediately (Trust Approach)
          await recordViralAction({ action_type: "SHARE_WALLET", mission_id: mission.id });
          const cacheKey = `mission_verified_${mission.id}`;
          await setCloudItem(cacheKey, "VERIFIED");
          useMissionStore.getState().fetchMissions();
        } else {
          addToast("텔레그램 앱에서만 가능한 기능입니다.", "error");
        }
        return;
      }
    } catch (error) {
      console.error("[MissionCard] Action failed:", error);
      notification("error");
      addToast("오류가 발생했습니다. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      setIsVerifying(false);
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
      case "SHARE_WALLET": // Added
        return <Share2 className={iconClass} />;
      case "LOGIN":
        return <Star className={iconClass} />;
      case "PLAY_GAME":
        return <Trophy className={iconClass} />;
      default:
        return (
          <img
            src="/assets/icon_diamond.png"
            alt=""
            className="h-5 w-5 object-contain"
          />
        );
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
            : "border-white/10 bg-white/10 hover:border-white/20"
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
              <div className="truncate text-[11px] font-semibold text-white/70">
                {mission.description || "미션을 완료하고 보상을 받으세요"}
              </div>
              {(timeWindow || mission.auto_claim) && (
                <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-bold text-white/70">
                  {timeWindow && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                      <Clock3 className="h-3 w-3" /> {timeWindow}
                    </span>
                  )}
                  {mission.auto_claim && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-figma-accent">
                      Auto-Claim
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="shrink-0 text-right">
              <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2 py-0.5">
                <img
                  src={mission.reward_type === "CASH_UNLOCK" ? "/assets/logo_cc_v2.png" : "/assets/icon_diamond.png"}
                  alt=""
                  className="h-3.5 w-3.5 object-contain"
                />
                <span className="text-[12px] font-black text-figma-accent">
                  {mission.reward_amount.toLocaleString()}
                  {mission.reward_type === "CASH_UNLOCK" && "원"}
                </span>
              </div>
              {mission.xp_reward > 0 && (
                <div className="mt-1 text-[10px] font-black text-white/70">+{mission.xp_reward} XP</div>
              )}
            </div>
          </div>

          {!isClaimed && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-white/70">
                <span>
                  {progress.current_value} / {mission.target_value}
                </span>
                <span className={clsx(isCompleted ? "text-figma-accent" : "text-white/70")}>
                  {isCompleted ? "READY" : `${percent}%`}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full border border-white/10 bg-white/10">
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
              disabled={isVerifying}
              className={clsx(
                "flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white/80 transition hover:bg-white/20 active:scale-95",
                isVerifying && "opacity-50 cursor-wait"
              )}
              aria-label="Mission action"
            >
              {isVerifying ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
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

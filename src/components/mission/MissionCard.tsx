// src/components/mission/MissionCard.tsx
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Bell, Check, ChevronRight, Share2, Star, Trophy, Users } from "lucide-react";

import { useHaptic } from "../../hooks/useHaptic";
import { useSound } from "../../hooks/useSound";
import { useMissionStore, MissionData } from "../../stores/missionStore";
import { recordViralAction, getCloudItem, setCloudItem, verifyChannelSubscription } from "../../api/viralApi";
import { useToast } from "../common/ToastProvider";
import { formatRewardLine } from "../../utils/rewardLabel";

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

  const telegramBotUsername = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined) || "jm956_bot";
  const telegramWebappShortName = (import.meta.env.VITE_TELEGRAM_WEBAPP_SHORT_NAME as string | undefined) || "ccjm";
  const telegramAppUrl = `https://t.me/${telegramBotUsername}/${telegramWebappShortName}`;

  const timeWindow = mission.start_time && mission.end_time
    ? `${mission.start_time.slice(0, 5)} ~${mission.end_time.slice(0, 5)} `
    : null;

  const isCompleted = progress.is_completed;
  const isClaimed = progress.is_claimed;
  const isDailyGift = mission.logic_key === "daily_login_gift"; // SoT: daily_login_gift only
  const percent = Math.min(100, Math.round((progress.current_value / Math.max(1, mission.target_value)) * 100));

  const handleClaim = async () => {
    if (!isCompleted || isClaimed) return;
    impact("heavy");
    try {
      const result = await claimReward(mission.id);
      if (result.success) {
        notification("success");
        playToast();
        const normalizedRewardType = result.reward_type === "CASH_UNLOCK" ? "POINT" : (result.reward_type || "");
        const rewardLine = formatRewardLine(normalizedRewardType, result.amount ?? 0);
        const hint = rewardLine?.fulfillmentHint ? ` (${rewardLine.fulfillmentHint})` : "";
        addToast(`보상 수령 완료: ${rewardLine?.text ?? "보상"}${hint}`, "success");
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
        const cacheKey = `mission_verified_${mission.id} `;
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
        const shareText = "CCJM 주간 미션 참여! 여기로 들어오면 바로 시작돼요";
        const shareUrl = `https://t.me/share/url?${new URLSearchParams({ url: telegramAppUrl, text: shareText }).toString()}`;

        const tg = window.Telegram?.WebApp;
        let opened = false;
        if (typeof tg?.openTelegramLink === "function") {
          try {
            tg.openTelegramLink(shareUrl);
            opened = true;
          } catch {
            // ignore
          }
        }

        if (!opened && typeof tg?.openLink === "function") {
          try {
            tg.openLink(shareUrl);
            opened = true;
          } catch {
            // ignore
          }
        }

        if (!opened) {
          window.open(shareUrl, "_blank", "noopener,noreferrer");
        }

        // Record action immediately (Trust Approach)
        await recordViralAction({ action_type: "SHARE", mission_id: mission.id });
        const cacheKey = `mission_verified_${mission.id}`;
        await setCloudItem(cacheKey, "VERIFIED");
        useMissionStore.getState().fetchMissions();
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
          const storyMediaUrl = `${window.location.origin}/assets/story/ccjm_story_1080x1920.mp4`;
          const fallbackShareText = "CCJM 오픈 기념 미션! 같이 해보자";
          const fallbackShareUrl = `https://t.me/share/url?${new URLSearchParams({ url: telegramAppUrl, text: fallbackShareText }).toString()}`;

          if (!window.location.origin.startsWith("https://")) {
            addToast("스토리 공유는 https 환경에서만 안정적으로 동작합니다.", "error");
          }
          try {
            window.Telegram.WebApp.shareToStory(storyMediaUrl, {
              text: "CCJM 오픈 기념 미션! 같이 해보자",
              widget_link: { url: telegramAppUrl, name: "CCJM 열기" },
            });

            // Record action immediately (Trust Approach)
            await recordViralAction({ action_type: "SHARE_STORY", mission_id: mission.id });
            const cacheKey = `mission_verified_${mission.id}`;
            await setCloudItem(cacheKey, "VERIFIED");
            useMissionStore.getState().fetchMissions();
          } catch {
            const tg = window.Telegram?.WebApp;
            let opened = false;
            if (typeof tg?.openTelegramLink === "function") {
              try {
                tg.openTelegramLink(fallbackShareUrl);
                opened = true;
              } catch { /* ignore */ }
            }
            if (!opened && typeof tg?.openLink === "function") {
              try {
                tg.openLink(fallbackShareUrl);
                opened = true;
              } catch { /* ignore */ }
            }
            if (!opened) {
              window.open(fallbackShareUrl, "_blank", "noopener,noreferrer");
            }
            addToast("스토리 공유에 실패했습니다. 일반 공유로 대체합니다.", "error");
          }
        } else {
          addToast("스토리 공유는 모바일 텔레그램 앱에서만 가능합니다.", "error");
        }
        return;
      }
      if (mission.action_type === "SHARE_WALLET") {
        const shareText = "내 지갑 💎 CCJM에서 함께 확인해봐!";
        const shareUrl = `https://t.me/share/url?${new URLSearchParams({ url: telegramAppUrl, text: shareText }).toString()}`;

        const tg = window.Telegram?.WebApp;
        let opened = false;
        if (typeof tg?.openTelegramLink === "function") {
          try {
            tg.openTelegramLink(shareUrl);
            opened = true;
          } catch {
            // ignore
          }
        }

        if (!opened && typeof tg?.openLink === "function") {
          try {
            tg.openLink(shareUrl);
            opened = true;
          } catch {
            // ignore
          }
        }

        if (!opened) {
          window.open(shareUrl, "_blank", "noopener,noreferrer");
        }

        // Record action immediately (Trust Approach)
        await recordViralAction({ action_type: "SHARE_WALLET", mission_id: mission.id });
        const cacheKey = `mission_verified_${mission.id}`;
        await setCloudItem(cacheKey, "VERIFIED");
        useMissionStore.getState().fetchMissions();
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
    const iconClass = "h-6 w-6";
    if (isDailyGift) {
      return (
        <img
          src="/assets/icon_diamond.png"
          alt=""
          className="h-6 w-6 object-contain"
        />
      );
    }
    switch (mission.action_type) {
      case "JOIN_CHANNEL":
        return <Bell className={iconClass} />;
      case "INVITE_FRIEND":
        return <Users className={iconClass} />;
      case "SHARE_STORY":
      case "SHARE_WALLET":
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
            className="h-6 w-6 object-contain"
          />
        );
    }
  };

  return (
    <div
      className={clsx(
        "relative rounded-[28px] border transition-all duration-300",
        isClaimed
          ? "bg-white/[0.02] border-white/5 opacity-50"
          : isCompleted
            ? "bg-[#1A1A1B] border-emerald-500/20 shadow-[0_4px_20px_-8px_rgba(16,185,129,0.3)]"
            : "bg-[#1A1A1B] border-white/5 shadow-md shadow-black/40"
      )}
    >
      <div className="grid grid-cols-[52px,1fr,auto] items-center gap-4 p-5">
        {/* Left: Icon Box */}
        <div
          className={clsx(
            "flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[18px] border shadow-inner transition-colors",
            isClaimed
              ? "bg-white/5 border-white/5 text-white/20"
              : isCompleted
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-[#252528] border-white/10 text-white/80"
          )}
        >
          {isClaimed ? <Check className="h-6 w-6" /> : renderIcon()}
        </div>

        {/* Middle: Content & Progress */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-3">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[15px] font-black leading-tight text-white tracking-tight truncate">
                {isDailyGift ? "선물" : mission.title}
              </span>
              {(timeWindow || mission.auto_claim) && (
                <span className="inline-flex items-center rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/60">
                  {mission.auto_claim ? "AUTO" : "TIME"}
                </span>
              )}
            </div>
            {/* 미션 설명(일일 로그인시 매일선물 등) 제거 */}
          </div>

          {/* Progress Bar (Only visible if not claimed) */}
          {!isClaimed && (
            <div className="w-full">
              <div className="grid grid-cols-[1fr,auto] items-center gap-2 text-[11px] font-bold mb-1.5 leading-none">
                <span className="text-white/40 tabular-nums whitespace-nowrap">
                  {progress.current_value} <span className="text-white/20">/</span> {mission.target_value}
                </span>
                {isCompleted ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-300 whitespace-nowrap">
                    Completed
                  </span>
                ) : (
                  <span className="tabular-nums whitespace-nowrap text-white/40">
                    {percent}%
                  </span>
                )}
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#252528] overflow-hidden">
                <div
                  className={clsx(
                    "h-full rounded-full transition-all duration-500",
                    isCompleted ? "bg-emerald-500" : "bg-white/20"
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Rewards & Action */}
        <div className="flex items-center gap-2 shrink-0 pl-0.5">
          {/* Text Info Column */}
          <div className="flex flex-col items-end gap-1">
            {/* Reward Badge */}

          </div>

          {/* Action Button */}
          {isClaimed ? (
            <div className="h-9 w-9 flex items-center justify-center rounded-full bg-white/5 text-white/20">
              <Check className="h-4.5 w-4.5" />
            </div>
          ) : isCompleted ? (
            <button
              onClick={handleClaim}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all"
              title="보상 수령"
            >
              <Trophy className="h-4.5 w-4.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleAction}
              disabled={isVerifying}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-[#2E2E32] text-white/60 hover:bg-[#3E3E42] hover:text-white active:scale-95 transition-all"
            >
              {isVerifying ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <ChevronRight className="h-4.5 w-4.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MissionCard;

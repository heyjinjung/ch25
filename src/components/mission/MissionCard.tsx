// src/components/mission/MissionCard.tsx
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Bell, Check, ChevronRight, Share2, Star, Trophy, Users, Gift } from "lucide-react";

import { useHaptic } from "../../hooks/useHaptic";
import { useSound } from "../../hooks/useSound";
import { useMissionStore, MissionData } from "../../stores/missionStore";
import { recordViralAction, getCloudItem, setCloudItem, verifyChannelSubscription } from "../../api/viralApi";
import { useToast } from "../common/ToastProvider";
import { formatRewardLine, isGifticonRewardType } from "../../utils/rewardLabel";

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

  const normalizedMissionRewardType = mission.reward_type === "CASH_UNLOCK" ? "POINT" : mission.reward_type;
  const rewardLine = formatRewardLine(normalizedMissionRewardType, mission.reward_amount);

  const rewardIconSrc = (() => {
    const upper = String(normalizedMissionRewardType || "").toUpperCase();

    if (isGifticonRewardType(normalizedMissionRewardType)) return "/assets/lottery/icon_gift.png";
    if (upper === "POINT" || upper === "CC_POINT") return "/assets/asset_coin_gold.webp";
    if (upper === "GAME_XP") return "/assets/icons/icon_fire.webp";

    const tickets = new Set(["TICKET_ROULETTE", "ROULETTE_TICKET", "TICKET_DICE", "DICE_TICKET", "TICKET_LOTTERY", "LOTTERY_TICKET"]);
    if (tickets.has(upper)) return "/assets/asset_ticket_green.webp";

    return "/assets/icon_diamond.png";
  })();

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
      return <Gift className="h-6 w-6 text-amber-400" />;
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
      <div className="flex items-center p-5 gap-4">
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
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-black leading-tight text-white tracking-tight truncate">
                {mission.title}
              </span>
              {(timeWindow || mission.auto_claim) && (
                <span className="inline-flex items-center rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/60">
                  {mission.auto_claim ? "AUTO" : "TIME"}
                </span>
              )}
            </div>
            <div className="text-[12px] font-medium text-[#888888] truncate mt-0.5">
              {mission.description || "미션을 완료하고 보상을 받으세요"}
            </div>
          </div>

          {/* Progress Bar (Only visible if not claimed) */}
          {!isClaimed && (
            <div className="w-full">
              <div className="flex items-center justify-between text-[11px] font-bold mb-1.5 leading-none">
                <span className="text-white/40 tabular-nums">
                  {progress.current_value} <span className="text-white/20">/</span> {mission.target_value}
                </span>
                <span className={clsx("tabular-nums", isCompleted ? "text-emerald-400" : "text-white/40")}>
                  {isCompleted ? "Completed" : `${percent}%`}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#252528] overflow-hidden">
                <div
                  className={clsx(
                    `h-full rounded-full transition-all duration-500 w-[${percent}%]`,
                    isCompleted ? "bg-emerald-500" : "bg-white/20"
                  )}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Rewards & Action */}
        <div className="flex items-center gap-3 shrink-0 pl-1">
          {/* Text Info Column */}
          <div className="flex flex-col items-end gap-1.5">
            {/* Reward Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#252528] px-3 py-1.5">
              <img
                src={rewardIconSrc}
                alt=""
                className="h-3.5 w-3.5 object-contain"
              />
              <span className="text-[12px] font-black text-white/90 leading-none">
                {rewardLine?.text ?? mission.reward_amount.toLocaleString()}
              </span>
            </div>

            {/* Secondary Reward (XP) */}
            {mission.xp_reward > 0 && (
              <span className="text-[10px] font-bold text-white/40">
                시즌 XP +{mission.xp_reward}
              </span>
            )}
          </div>

          {/* Action Button */}
          {isClaimed ? (
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-white/20">
              <Check className="h-5 w-5" />
            </div>
          ) : isCompleted ? (
            <button
              onClick={handleClaim}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all"
              title="보상 수령"
            >
              <Trophy className="h-5 w-5 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleAction}
              disabled={isVerifying}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-[#2E2E32] text-white/60 hover:bg-[#3E3E42] hover:text-white active:scale-95 transition-all"
            >
              {isVerifying ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MissionCard;

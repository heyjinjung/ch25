// src/components/mission/MissionCard.tsx
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Check, ChevronRight, Trophy } from "lucide-react";

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
    console.log("[MissionCard] handleClaim called", {
      missionId: mission.id,
      isCompleted,
      isClaimed
    });

    if (!isCompleted || isClaimed) {
      console.log("[MissionCard] Early return:", { isCompleted, isClaimed });
      return;
    }

    impact("heavy");
    console.log("[MissionCard] Starting claim process for mission:", mission.id);

    try {
      const result = await claimReward(mission.id);
      console.log("[MissionCard] Claim result:", result);

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
        console.error("[MissionCard] Claim failed with result:", result);
        notification("error");
        addToast(result.message || "보상 수령 실패", "error");
      }
    } catch (error) {
      console.error("[MissionCard] Claim exception:", error);
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

  const getIconSource = () => {
    if (isDailyGift) return "/assets/asset_coin_gold.webp";

    // Title-based heuristic for better icons (Frontend Delight)
    const titleLower = mission.title.toLowerCase();

    // Game Specifics
    if (titleLower.includes("룰렛")) return "/assets/asset_ticket_green.webp";
    if (titleLower.includes("주사위")) return "/assets/icon_dice_silver.webp";
    if (titleLower.includes("복권")) return "/assets/asset_ticket_diamond.webp";

    // Action Types
    switch (mission.action_type) {
      case "JOIN_CHANNEL":
        return "/assets/icon_megaphone.png";
      case "INVITE_FRIEND":
        return "/assets/icon_telegram_button.png";
      case "SHARE_STORY":
      case "SHARE_WALLET":
        return "/assets/icon_telegram_button.png";
      case "PLAY_GAME":
        return "/assets/asset_ticket_bundle.png";
      default:
        // Default Fallback
        return "/assets/icon_diamond.png";
    }
  };

  return (
    <div
      className={clsx(
        "relative group isolate overflow-hidden rounded-[26px] border transition-all duration-500",
        isClaimed
          ? "bg-white/[0.02] border-white/5 opacity-50 grayscale"
          : isCompleted
            ? "bg-gradient-to-br from-[#1a1a1a]/80 via-black/80 to-lime-900/20 border-lime-400/50 shadow-[0_0_30px_-10px_rgba(163,230,53,0.2)]"
            : "bg-black/40 backdrop-blur-md border-white/10 hover:border-white/20 hover:bg-white/5"
      )}
    >
      {/* Neon Glow Effect for Completed/Active */}
      {!isClaimed && isCompleted && (
        <>
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-lime-400/50 to-transparent opacity-70" />
          <div className="absolute -inset-0.5 bg-gradient-to-br from-lime-400/10 to-transparent opacity-30 blur-2xl -z-10 group-hover:opacity-50 transition-opacity duration-700" />
        </>
      )}

      {/* Decorative Background Element for Normal State */}
      {!isClaimed && !isCompleted && (
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none group-hover:bg-lime-400/5 transition-colors duration-500" />
      )}

      <div className="grid grid-cols-[60px,1fr,auto] items-center gap-4 p-5">
        {/* Left: Icon Box */}
        <div className={clsx(
          "relative flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[22px] transition-all duration-300 shadow-xl",
          isClaimed
            ? "bg-white/5 border border-white/5"
            : isCompleted
              ? "bg-gradient-to-br from-[#2a2a2a] to-black border border-lime-500/30 ring-1 ring-lime-500/20"
              : "bg-[#18181b] border border-white/10 group-hover:border-lime-500/30 group-hover:shadow-[0_0_15px_-5px_rgba(163,230,53,0.3)]"
        )}>
          {isClaimed ? (
            <Check className="h-6 w-6 text-white/20" />
          ) : (
            <img
              src={getIconSource()}
              alt="Mission Icon"
              className={clsx(
                "object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)] transition-transform duration-500 ease-out group-hover:scale-110",
                isDailyGift ? "h-10 w-10" : "h-9 w-9"
              )}
            />
          )}
        </div>

        {/* Middle: Content & Progress */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
          {/* Header */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className={clsx(
                "text-[16px] font-black leading-tight tracking-tight truncate",
                !isClaimed && "drop-shadow-md",
                isCompleted && !isClaimed ? "text-white" : (isClaimed ? "text-white/40" : "text-white")
              )}>
                {isDailyGift ? "매일매일 보너스" : mission.title}
              </span>
              {(timeWindow || mission.auto_claim) && (
                <span className={clsx(
                  "inline-flex items-center rounded-[6px] px-1.5 py-[2px] text-[9px] font-black tracking-wide uppercase shadow-sm border",
                  isCompleted && !isClaimed
                    ? "bg-lime-400/10 text-lime-400 border-lime-400/20"
                    : "bg-white/5 text-white/40 border-white/10"
                )}>
                  {mission.auto_claim ? "AUTO" : "TIME"}
                </span>
              )}
            </div>

            {/* Description */}
            {!isClaimed && (
              <p className="text-[11px] font-bold text-white/50 truncate tracking-tight">
                {mission.action_type === 'JOIN_CHANNEL' ? '공식 채널 구독하고 보상받기' :
                  mission.action_type === 'PLAY_GAME' ? '게임 플레이 미션' :
                    isDailyGift ? '오늘의 출석 보상' : '한정 미션'}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          {!isClaimed && (
            <div className="w-full mt-2">
              <div className="flex items-end justify-between text-[11px] font-bold mb-1.5 leading-none">
                <span className="text-white/30 font-mono tracking-tight flex items-center gap-1">
                  <span className={clsx("text-sm", isCompleted ? "text-lime-400" : "text-white/80")}>{progress.current_value}</span>
                  <span className="h-2 w-[1px] bg-white/10" />
                  <span className="opacity-60">{mission.target_value}</span>
                </span>

                {isCompleted ? (
                  <span className="text-lime-400 animate-pulse drop-shadow-[0_0_8px_rgba(163,230,53,0.5)]">Claim Reward</span>
                ) : (
                  <span className="text-lime-400/80">{percent}%</span>
                )}
              </div>
              <div className="h-2 w-full rounded-full bg-black/40 overflow-hidden ring-1 ring-white/5 select-none">
                <div
                  className={clsx(
                    "h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden",
                    isCompleted
                      ? "bg-gradient-to-r from-lime-400 to-emerald-400 shadow-[0_0_15px_rgba(163,230,53,0.6)]"
                      : "bg-white/10",
                    `w-[${percent}%]`
                  )}
                  style={{ width: `${percent}%` }}
                >
                  {/* Shimmer effect on progress bar */}
                  {percent > 0 && percent < 100 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full -translate-x-full animate-[shimmer_2s_infinite]" />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Action Area */}
        <div className="flex items-center pl-1">
          {isClaimed ? (
            <div className="h-9 min-w-[3.5rem] px-3 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-[11px] font-bold text-white/20">
              완료
            </div>
          ) : isCompleted ? (
            <button
              onClick={handleClaim}
              className="relative group/btn h-11 min-w-[3.5rem] px-4 flex items-center justify-center rounded-[18px] bg-gradient-to-b from-lime-300 via-lime-400 to-lime-500 text-black shadow-[0_4px_20px_-5px_rgba(163,230,53,0.6)] hover:scale-105 active:scale-95 transition-all border-t border-white/40 overflow-hidden"
              title="보상 받기"
            >
              <Trophy className="relative z-10 h-5 w-5 fill-black text-black/80 drop-shadow-sm animate-[bounce_2s_infinite]" />
              <div className="absolute inset-0 bg-white/30 skew-x-12 -translate-x-full group-hover/btn:animate-[shimmer_0.5s_ease-in-out_forwards]" />
            </button>
          ) : (
            <button
              onClick={handleAction}
              disabled={isVerifying}
              className="h-11 w-11 flex items-center justify-center rounded-[18px] bg-[#222225] border border-white/10 text-white/40 hover:bg-[#323236] hover:text-white hover:border-lime-500/30 hover:shadow-[0_0_15px_-5px_rgba(163,230,53,0.3)] active:scale-95 transition-all"
            >
              {isVerifying ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-lime-400" />
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

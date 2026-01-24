import React, { useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getNewUserStatus } from "../api/newUserApi";
import Modal from "../components/common/Modal";
import { useMissionStore } from "../stores/missionStore";
import { Trophy, CheckCircle2, Share2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/common/ToastProvider";
import { recordViralAction, setCloudItem, verifyChannelSubscription } from "../api/viralApi";

const formatSeconds = (seconds: number | null | undefined) => {
  if (seconds == null) return "-";
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h}h ${m}m ${r}s`;
};

// Row component updated to handle Claim buttons
const Row: React.FC<{
  done: boolean;
  claimed: boolean; // Added claimed prop
  title: string;
  desc?: string;
  action?: React.ReactNode;
  onClaim?: () => void;
  isClaiming?: boolean;
}> = ({ done, claimed, title, desc, action, onClaim, isClaiming }) => {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {/* Status Icon */}
          {claimed ? (
            <CheckCircle2 className="h-5 w-5 text-white/20" />
          ) : done ? (
            <span className="text-emerald-400">??/span>
          ) : (
            <span className="text-white/40">??/span>
          )}

          <p className={`font-black ${claimed ? "text-white/40 line-through" : "text-white"}`}>
            {title}
          </p>
        </div>
        {desc ? <p className="mt-1 text-sm text-white/55">{desc}</p> : null}
      </div>

      {/* Action Area */}
      <div className="shrink-0">
        {claimed ? (
          <span className="text-xs font-bold text-white/30">?„ë£Œ??/span>
        ) : done && onClaim ? (
          <button
            onClick={onClaim}
            disabled={isClaiming}
            className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-50"
          >
            {isClaiming ? "ì§€ê¸?ì¤?.." : "ë³´ìƒ ë°›ê¸°"}
          </button>
        ) : (
          action
        )}
      </div>
    </div>
  );
};

const NewUserWelcomePage: React.FC = () => {
  const status = useQuery({
    queryKey: ["new-user-status"],
    queryFn: getNewUserStatus,
    staleTime: 10_000,
    retry: false,
  });

  const { claimReward } = useMissionStore();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  // We keep a generic 'success modal' state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);

  // For Join Channel manual check
  const [isVerifyingChannel, setIsVerifyingChannel] = useState(false);

  const handleShareWallet = async (missionId: number) => {
    try {
      const telegramBotUsername = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined) || "jm956_bot";
      const telegramWebappShortName = (import.meta.env.VITE_TELEGRAM_WEBAPP_SHORT_NAME as string | undefined) || "ccjm";
      const appUrl = `https://t.me/${telegramBotUsername}/${telegramWebappShortName}`;
      const shareText = "??ì§€ê°??’ CCJM?ì„œ ?¨ê»˜ ?•ì¸?´ë´!";
      const shareUrl = `https://t.me/share/url?${new URLSearchParams({ url: appUrl, text: shareText }).toString()}`;

      const tg = window.Telegram?.WebApp;
      let opened = false;
      if (typeof tg?.openTelegramLink === "function") {
        try {
          tg.openTelegramLink(shareUrl);
          opened = true;
        } catch {
          // Fall through
        }
      }
      if (!opened && typeof tg?.openLink === "function") {
        try {
          tg.openLink(shareUrl);
          opened = true;
        } catch {
          // Fall through
        }
      }
      // Last resort (browser / restricted webview)
      if (!opened) {
        window.open(shareUrl, "_blank", "noopener,noreferrer");
      }

      await recordViralAction({ action_type: "SHARE_WALLET", mission_id: missionId });
      const cacheKey = `mission_verified_${missionId}`;
      await setCloudItem(cacheKey, "VERIFIED");
      queryClient.invalidateQueries({ queryKey: ["new-user-status"] });
      useMissionStore.getState().fetchMissions();
    } catch {
      addToast("ê³µìœ  ì²˜ë¦¬ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.", "error");
    }
  };

  // --------------------------------------------------------------------------------
  // [Logic] Auto-trigger modal ONLY for Login mission upon first load/detection
  // (Preserving original behavior request, but now extended to any generic completed & unclaimed if desired?)
  // Actually, user feedback implies they want to be able to claim manual rewards too.
  // We will let the "Claim" button trigger the modal or just toast.
  // The useEffect below is specifically for the "Day 2 Login" auto-popup experience.
  // --------------------------------------------------------------------------------
  React.useEffect(() => {
    if (!status.data?.missions) return;

    // Auto-popup only for LOGIN mission to welcome them back
    const loginMission = status.data.missions.find(
      (m) => m.action_type === "LOGIN" && m.is_completed && !m.is_claimed
    );

    // To prevent spamming, we could check a local flag, but standard for this page is fine.
    // We initiate claim flow for them or just prompt?
    // Original code: setTargetMissionId -> showModal -> User clicks Claim.
    // We will keep this flow for Login.
    if (loginMission) {
      // Setup the modal for this specific mission
      setProcessingId(null); // Reset processing
      // We don't auto-set processingId here because the modal button will call handleClaim.
      // But we need to know WHICH mission the modal is for.
      // Let's store it in a ref or state if we want the modal to be generic.
    }
  }, [status.data?.missions]);

  // --------------------------------------------------------------------------------
  // [Action] Claim Handler
  // --------------------------------------------------------------------------------
  const handleClaim = async (missionId: number, title: string) => {
    if (processingId) return;
    setProcessingId(missionId);

    try {
      const result = await claimReward(missionId);
      if (result.success) {
        // Show success modal or toast?
        // Using toast for inline claims is faster, but modal is "celebratory".
        // Let's use Modal for nicer effect since these are Welcome Missions.
        setSuccessMessage(`ì¶•í•˜?©ë‹ˆ??\n[${title}] ë¯¸ì…˜???„ë£Œ?ˆìŠµ?ˆë‹¤.`);
        setShowSuccessModal(true);

        // Update Data
        queryClient.invalidateQueries({ queryKey: ["new-user-status"] });
        useMissionStore.getState().fetchMissions(); // Sync global store
      } else {
        addToast(result.message || "ë³´ìƒ ?˜ë ¹ ?¤íŒ¨", "error");
      }
    } catch {
      addToast("?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  // --------------------------------------------------------------------------------
  // [Action] Join Channel Verification
  // --------------------------------------------------------------------------------
  const handleVerifyChannel = async (missionId: number) => {
    if (isVerifyingChannel) return;
    setIsVerifyingChannel(true);

    try {
      // 1. Open Link
      window.open("https://t.me/+IE0NYpuze_k1YWZk", "_blank", "noopener,noreferrer");

      // 2. Wait a bit for user to join (fake delay or real check?)
      // Since real verification needs bot, we might use the /verify/channel endpoint if implemented.
      // Or fallback to "Trust" based claim if we want to be lenient for new users.
      // Let's try to call the verify endpoint first.

      // Temporarily utilizing trust-based or verification endpoint
      // Assuming /api/viral/verify/channel exists as seen in codebase or we add it.
      // If strict verification fails, we might fallback or just tell them "Join first".
      // For now, let's nudge the server to check.

      // Simulating server check delay
      await new Promise(r => setTimeout(r, 2000));

      // Call verify endpoint (Using generic action endpoint if specific one not ready, or viral endpoint)
      // Check viral.py: POST /api/viral/verify/channel
      try {
        await verifyChannelSubscription(missionId);
        addToast("ì±„ë„ ê°€?…ì´ ?•ì¸?˜ì—ˆ?µë‹ˆ?? ë³´ìƒ???˜ë ¹?˜ì„¸??", "success");
        queryClient.invalidateQueries({ queryKey: ["new-user-status"] });
      } catch {
        // Fallback or specific error?
        // If verify fails, maybe they didn't join or bot isn't admin.
        // For UX safety in this "Welcome" phase, we might soft-allow or show error.
        addToast("?„ì§ ê°€?…ì´ ?•ì¸?˜ì? ?Šì•˜?µë‹ˆ?? ? ì‹œ ???¤ì‹œ ?œë„?´ì£¼?¸ìš”.", "error");
      }

    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifyingChannel(false);
    }
  };


  const secondsLeft = status.data?.seconds_left ?? null;
  const windowLabel = useMemo(() => formatSeconds(secondsLeft), [secondsLeft]);

  if (status.isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center text-white/60">
        ? ê·œ ? ì? ?°ì»´ ë¯¸ì…˜??ë¶ˆëŸ¬?¤ëŠ” ì¤?..
      </div>
    );
  }

  if (!status.data?.eligible) {
    return <Navigate to="/landing" replace />;
  }

  const missions = status.data?.missions ?? [];

  // Helper to find specific mission status
  // We matched logic based on action_type + target_value in previous code, 
  // but better to find the actual mission object to get its ID and status.
  const findMission = (predicate: (m: any) => boolean) => missions.find(predicate);

  const mPlay1 = findMission((m) => m.action_type === "PLAY_GAME" && Number(m.target_value) === 1);
  const mPlay3 = findMission((m) => m.action_type === "PLAY_GAME" && Number(m.target_value) >= 3);
  const mCommunity = findMission((m) => ["SHARE_WALLET", "JOIN_CHANNEL", "SHARE", "SHARE_STORY"].includes(m.action_type));
  // Note: Backend might map "JOIN_CHANNEL" action to a mission. 

  const mLogin = findMission((m) => m.action_type === "LOGIN");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6 rounded-3xl border border-emerald-700/30 bg-black/60 p-6 backdrop-blur">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">NEW USER ONBOARDING</p>
        <h1 className="mt-2 text-2xl font-black text-white">? ê·œ ? ì? ?„ìš© ?°ì»´ ?˜ì´ì§€</h1>
        <p className="mt-2 text-sm text-white/60">
          ???˜ì´ì§€??? ê·œ ? ì??ê²Œë§??¸ì¶œ?©ë‹ˆ?? ê¸°ì¡´ ? ì????œíƒ ?€?ì´ ?„ë‹™?ˆë‹¤.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">BONUS CAP</p>
            <p className="mt-1 text-xl font-black text-white">{status.data.bonus_cap.toLocaleString()} P</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">TIME LEFT</p>
            <p className="mt-1 text-xl font-black text-white">{windowLabel}</p>
          </div>
        </div>
      </header>

      <div className="space-y-3">
        {/* 1. PLAY GAME 1 */}
        {mPlay1 && (
          <Row
            done={!!mPlay1.is_completed}
            claimed={!!mPlay1.is_claimed}
            title="ê²Œì„ 1???Œë ˆ??
            desc={`?„ì¬ ?„ì  ?Œë ˆ???? ${status.data.total_play_count.toLocaleString()}??}
            onClaim={() => handleClaim(mPlay1.id, mPlay1.title)}
            isClaiming={processingId === mPlay1.id}
            action={
              <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10" to="/dice">
                ?Œë ˆ??
              </Link>
            }
          />
        )}

        {/* 2. PLAY GAME 3 */}
        {mPlay3 && (
          <Row
            done={!!mPlay3.is_completed}
            claimed={!!mPlay3.is_claimed}
            title="ê²Œì„ 3???Œë ˆ??
            desc="(ë£°ë ›/ì£¼ì‚¬??ë³µê¶Œ ?©ì‚° ê¸°ì?)"
            onClaim={() => handleClaim(mPlay3.id, mPlay3.title)}
            isClaiming={processingId === mPlay3.id}
            action={
              <Link className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10" to="/games">
                ê²Œì„ ëª©ë¡
              </Link>
            }
          />
        )}

        {/* 3. COMMUNITY */}
        {mCommunity && (
          <Row
            done={!!mCommunity.is_completed}
            claimed={!!mCommunity.is_claimed}
            title={mCommunity.title || "ì»¤ë??ˆí‹° ?¨ê»˜?˜ê¸°"}
            desc={
              mCommunity.action_type === "SHARE_WALLET"
                ? "??ì§€ê°‘ì„ ì¹œêµ¬?ê²Œ ê³µìœ ?˜ë©´ ?„ë£Œ?©ë‹ˆ??"
                : "?…ì¥ ë²„íŠ¼???„ë¥´ê³?? ì‹œ ???•ì¸?©ë‹ˆ??"
            }
            onClaim={() => handleClaim(mCommunity.id, mCommunity.title)}
            isClaiming={processingId === mCommunity.id}
            action={
              mCommunity.action_type === "SHARE_WALLET" ? (
                <button
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
                  onClick={() => handleShareWallet(mCommunity.id)}
                >
                  <Share2 className="h-4 w-4" />
                  ì¹œêµ¬ ê³µìœ 
                </button>
              ) : (
                <button
                  className="rounded-xl border border-white/10 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
                  onClick={() => handleVerifyChannel(mCommunity.id)}
                  disabled={isVerifyingChannel}
                >
                  {isVerifyingChannel ? "?•ì¸ ì¤?.." : "ì±„ë„ ?…ì¥/?•ì¸"}
                </button>
              )
            }
          />
        )}

        {/* 4. DAY 2 LOGIN */}
        {mLogin && (
          <Row
            done={!!mLogin.is_completed}
            claimed={!!mLogin.is_claimed}
            title="?¤ìŒ???¬ì ‘??ì¶œì„)"
            desc="KST ê¸°ì? ?¤ìŒ???‘ì†?˜ë©´ ?„ë£Œë¡?ì²˜ë¦¬?©ë‹ˆ??"
            onClaim={() => handleClaim(mLogin.id, mLogin.title)}
            isClaiming={processingId === mLogin.id}
          />
        )}
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-5 text-sm text-white/65 backdrop-blur">
        <p className="font-bold text-white">?…ê¸ˆ?€ ?„ìˆ˜ ì¡°ê±´</p>
        <p className="mt-1">
          ë¯¸ì…˜ ë³´ìƒ?€ ê¸ˆê³ ??ì¦‰ì‹œ ?ë¦½?©ë‹ˆ??
        </p>
        <div className="mt-3 flex gap-2">
          <a
            href="https://ccc-010.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-emerald-500/15 px-4 py-2 text-xs font-black text-emerald-200 hover:bg-emerald-500/20"
          >
            ?¨ì”¨ì¹´ì???ë°”ë¡œê°€ê¸?
          </a>
        </div>
      </div>

      <Modal
        title="?‰ ë¯¸ì…˜ ?„ë£Œ!"
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
      >
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 ring-4 ring-emerald-500/20">
            <Trophy className="h-10 w-10 text-emerald-400" />
          </div>
          <p className="whitespace-pre-wrap text-lg font-bold text-white">
            {successMessage || "ë³´ìƒ??ì§€ê¸‰ë˜?ˆìŠµ?ˆë‹¤."}
          </p>
          <p className="mt-2 text-sm text-white/60">
            ì§€ê¸?ë°”ë¡œ ê¸ˆê³  ë°?ì§€ê°‘ì„ ?•ì¸?´ë³´?¸ìš”.
          </p>

          <button
            onClick={() => setShowSuccessModal(false)}
            className="mt-6 w-full rounded-xl bg-gray-700 py-3.5 text-sm font-bold text-white hover:bg-gray-600"
          >
            ?•ì¸
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default NewUserWelcomePage;

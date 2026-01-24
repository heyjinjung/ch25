// TODO: [VERIFY] Ensure Ticket count decreases visually on play.
// TODO: [VERIFY] Confirm winning a Prize (Point) does NOT trigger Level Up animation (Strict XP).
import { useMemo, useState } from "react";
import { usePlayLottery, useLotteryStatus } from "../hooks/useLottery";
import FeatureGate from "../components/feature/FeatureGate";
import LotteryCard from "../components/game/LotteryCard";
import LotteryCollectionModal from "../components/lottery/LotteryCollectionModal"; // Import Modal
import { tryHaptic } from "../utils/haptics";
import GamePageShell from "../components/game/GamePageShell";
import TicketZeroPanel from "../components/game/TicketZeroPanel";
import Button from "../components/common/Button";
import VaultAccrualModal from "../components/vault/VaultAccrualModal";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useSound } from "../hooks/useSound";
import { formatRewardLine } from "../utils/rewardLabel";
import { triggerJackpotExplosion } from "../utils/confetti";
import TicketZeroRetentionModal from "../components/modal/TicketZeroRetentionModal";
import { useNavigate } from "react-router-dom";
import { requestTrialGrant, isTrialGrantAllowedTokenType } from "../api/trialGrantApi";
import { getLotteryStatus } from "../api/lotteryApi";
import { useToast } from "../components/common/ToastProvider";

interface RevealedPrize {
  id: number;
  label: string;
  reward_type: string;
  reward_amount: string | number;
}

const LotteryPage: React.FC = () => {
  const { data, isLoading, isError, error } = useLotteryStatus();
  const playMutation = usePlayLottery();
  const queryClient = useQueryClient();
  const { playLotteryScratch, stopLotteryScratch, playLotteryWin } = useSound();
  const [revealedPrize, setRevealedPrize] = useState<RevealedPrize | null>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [vaultModal, setVaultModal] = useState<{ open: boolean; amount: number }>({ open: false, amount: 0 });
  const [collectionModalOpen, setCollectionModalOpen] = useState(false); // Modal State
  const [ticketZeroModal, setTicketZeroModal] = useState(false);
  const [isRequestingTrial, setIsRequestingTrial] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const collection = {

    // Basic mapping from backend dict
    C1: data?.collectionProgress?.C1 ?? 0,
    C2: data?.collectionProgress?.C2 ?? 0,
    J: data?.collectionProgress?.J ?? 0,
    M: data?.collectionProgress?.M ?? 0,
  };
  const canCraft = collection.C1 >= 1 && collection.C2 >= 1 && collection.J >= 1 && collection.M >= 1;

  const mapErrorMessage = (err: unknown) => {
    const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
    const messages: Record<string, string> = {
      NO_FEATURE_TODAY: "?§Îäò ?§Ï†ï???¥Î≤§?∏Í? ?ÜÏäµ?àÎã§.",
      INVALID_FEATURE_SCHEDULE: "?¥Î≤§???§Ï?Ï§??§Î•ò",
      FEATURE_DISABLED: "?¥Î≤§?∏Í? ÎπÑÌôú?±Ìôî?òÏóà?µÎãà??",
      DAILY_LIMIT_REACHED: "?§Îäò Ï∞∏Ïó¨ ?üÏàò Ï¥àÍ≥º",
      NOT_ENOUGH_TOKENS: "?∞Ïºì??Î∂ÄÏ°±Ìï©?àÎã§.",
    };
    return messages[code || ""] || "Î≥µÍ∂å ?ïÎ≥¥Î•?Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??";
  };

  const errorMessage = useMemo(() => {
    if (isLoading) return "";
    if (isError || !data) return mapErrorMessage(error);
    return "";
  }, [data, error, isError, isLoading]);

  const playErrorMessage = useMemo(
    () => (playMutation.error ? mapErrorMessage(playMutation.error) : undefined),
    [playMutation.error],
  );

  const tokenBalance = data?.token_balance ?? 0;
  const isOutOfTokens = typeof data?.token_balance === "number" && data.token_balance <= 0;
  const isUnlimited = data?.remaining_plays === 0;
  const canPlay =
    !isScratching &&
    !playMutation.isPending &&
    !isOutOfTokens &&
    (isUnlimited || (data?.remaining_plays ?? 0) > 0);

  const handleScratch = async () => {
    if (isScratching || isRevealed || isOutOfTokens) return;
    try {
      tryHaptic(12);
      setIsScratching(true);
      playLotteryScratch(); // Sound: Rolling start
      const result = await playMutation.mutateAsync();

      // Artificial delay for tension if needed, but keeping it snappy for now
      stopLotteryScratch();
      setIsScratching(false);

      playLotteryWin(); // Sound: Win/Reveal
      setIsRevealed(true);
      setRevealedPrize({
        id: result.prize.id,
        label: result.prize.label,
        reward_type: result.prize.reward_type,
        reward_amount: result.prize.reward_amount,
      });


      // Confetti Effect (User Request: Unify all effects, no value check)
      if (result.prize.reward_type !== 'NONE') {
        triggerJackpotExplosion();
      }

      if ((result.vaultEarn ?? 0) > 0) {
        setVaultModal({ open: true, amount: result.vaultEarn! });
      }

      // Sync all statuses
      queryClient.invalidateQueries({ queryKey: ["lottery-status"] });
      queryClient.invalidateQueries({ queryKey: ["roulette-status"] });
      queryClient.invalidateQueries({ queryKey: ["dice-status"] });
      queryClient.invalidateQueries({ queryKey: ["vault-status"] });
      queryClient.invalidateQueries({ queryKey: ["season-pass-status"] });
      queryClient.invalidateQueries({ queryKey: ["team-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["team-membership"] });

      // Check if tickets reached zero -> show retention modal
      setTimeout(async () => {
        try {
          const updatedStatus = await queryClient.fetchQuery({
            queryKey: ["lottery-status"],
            queryFn: getLotteryStatus,
          });
          if (updatedStatus?.token_balance === 0 && isTrialGrantAllowedTokenType("LOTTERY_TICKET")) {
            setTicketZeroModal(true);
          }
        } catch {
          // Silent fail
        }
      }, 500);
    } catch {
      setIsScratching(false);
    }
  };

  const handleReset = () => {
    setIsRevealed(false);
    stopLotteryScratch();
    setRevealedPrize(null);
  };

  if (isLoading) return <div className="p-20 text-center text-white/40">LOADING SYSTEM...</div>;

  if (isError || !data) {
    return (
      <GamePageShell title="ÏßÄÎØºÏΩî??Î≥µÍ∂å">
        <div className="rounded-[2rem] border border-white/10 bg-black/40 p-10 text-center backdrop-blur-xl">
          <p className="text-xl font-bold text-white">{errorMessage}</p>
          <Button variant="figma-primary" onClick={() => window.location.reload()} className="mt-6">?§Ïãú ?úÎèÑ</Button>
        </div>
      </GamePageShell>
    );
  }

  return (
    <FeatureGate feature="LOTTERY">
      <GamePageShell
        title="ÏßÄÎØºÏΩî??Î≥µÍ∂å"
        subtitle="Special Premium Lottery"
        px="px-3 sm:px-6"
        py="py-1"
      >

        {/* 1. Stats Bar */}
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-black/60 border border-white/10 px-4 py-1.5 backdrop-blur-md shrink-0">
              <img src="/assets/lottery/icon_lotto_ball.png" alt="Lotto Ball" className="w-5 h-5 object-contain" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/40 leading-none uppercase tracking-widest">Î≥¥Ïú† Î°úÎòêÎ≥?/span>
                <span className="text-sm font-black text-white leading-tight">
                  {tokenBalance.toLocaleString()} <span className="text-[10px] opacity-40 italic">PCS</span>
                </span>
              </div>
            </div>
            <div className="h-px flex-1 bg-white/5" />

            {/* Collection Button */}
            <button
              onClick={() => setCollectionModalOpen(true)}
              className="relative flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 hover:bg-white/10 transition-colors"
            >

              <span className="text-xs font-bold text-white/80 pr-1">Ïª¨Î†â??/span>

              {/* Notification Badge */}
              {canCraft && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 2. Main Game Area */}
        <div className="flex flex-col gap-3">
          <LotteryCard
            prize={revealedPrize ?? undefined}
            isRevealed={isRevealed}
            isScratching={isScratching}
            onScratch={handleScratch}
          />

          <div className="max-w-sm mx-auto w-full flex flex-col gap-2">
            {playErrorMessage && (
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-center text-xs font-bold text-red-400">
                {playErrorMessage}
              </div>
            )}

            {isOutOfTokens && (
              <TicketZeroPanel
                tokenType={data.token_type}
                onClaimSuccess={() => queryClient.invalidateQueries({ queryKey: ["lottery-status"] })}
              />
            )}

            <Button
              disabled={!canPlay && !isRevealed}
              onClick={() => (isRevealed ? handleReset() : handleScratch())}
              variant="figma-primary"
              className="!py-[10px] !rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-900/30 font-black text-base sm:text-lg italic"
              fullWidth
            >
              {isRevealed ? "?§Ïùå Î≥µÍ∂å ?ïÏù∏" : isScratching ? "Í≤∞Í≥º ?ïÏù∏ Ï§?.." : "ÏßÄÍ∏?Í∏ÅÍ∏∞"}
            </Button>
          </div>
        </div>

        {/* 3. Prize List */}
        <div className="mt-4 mb-6 px-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black italic text-figma-accent tracking-[0.2em] uppercase">?πÏ≤® Í∞Ä??Í≤ΩÌíà Î¶¨Ïä§??/h3>
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Total {data.prizes.length} Items</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-1 sm:gap-2">
            {data.prizes.map((prize) => (
              <div
                key={prize.id}
                className={clsx(
                  "group relative aspect-square overflow-hidden rounded-xl border transition-all flex flex-col items-center justify-center p-1.5 text-center",
                  prize.is_active === false
                    ? "opacity-30 grayscale border-white/5 bg-transparent"
                    : "bg-white/[0.03] border-white/10 hover:bg-figma-accent/10 hover:border-figma-accent/30"
                )}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
                  <img src="/assets/lottery/gold_foil.jpg" className="w-full h-full object-cover" alt="" />
                </div>

                <div className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 mb-1.5 group-hover:scale-110 transition-transform duration-500">
                  <img src="/assets/lottery/icon_gift.png" className="w-full h-full object-contain filter drop-shadow-md" alt="" />
                </div>

                <div className="relative z-10 w-full px-0.5">
                  <p className="text-[12px] sm:text-base font-black text-white leading-tight line-clamp-2 mb-0.5">{prize.label}</p>
                  <div className="flex items-center justify-center gap-0.5 opacity-60">
                    {(() => {
                      const rawType = prize.reward_type;
                      const upper = rawType.toUpperCase();
                      const normalizedType =
                        upper.includes("POINT") || upper === "CURRENCY" || upper === "CASH" || upper === "CASH_UNLOCK"
                          ? "POINT"
                          : upper.includes("GAME_XP")
                            ? "GAME_XP"
                            : rawType;

                      const rewardLine = formatRewardLine(normalizedType, Number(prize.reward_amount));
                      const displayText = rewardLine ? rewardLine.text : rawType;
                      const displayHint = rewardLine ? rewardLine.fulfillmentHint : undefined;

                      return (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-white/80 leading-none">{displayText}</span>
                          {displayHint && (
                            <span className="mt-0.5 text-[8px] font-black text-white/40 leading-none">({displayHint})</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {prize.stock !== null && (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-figma-accent animate-pulse" />
                    <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">{prize.stock}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </GamePageShell>

      <VaultAccrualModal
        open={vaultModal.open}
        amount={vaultModal.amount}
        onClose={() => setVaultModal((p) => ({ ...p, open: false }))}
      />

      <LotteryCollectionModal
        open={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        collection={collection}
      />

      {ticketZeroModal && (
        <TicketZeroRetentionModal
          vaultBalance={0}
          trialEnabled
          isRequestingTrial={isRequestingTrial}
          onClose={() => setTicketZeroModal(false)}
          onGoVault={() => {
            setTicketZeroModal(false);
            navigate("/vault");
          }}
          onRequestTrial={async () => {
            if (isRequestingTrial) return;
            setIsRequestingTrial(true);
            try {
              const res = await requestTrialGrant({ token_type: "LOTTERY_TICKET" });
              if (res.result === "OK" && res.granted > 0) {
                addToast(`Ï≤¥Ìóò ?∞Ïºì ${res.granted}Í∞úÍ? ÏßÄÍ∏âÎêò?àÏäµ?àÎã§! ?éÅ`, "success");
                await queryClient.invalidateQueries({ queryKey: ["lottery-status"] });
                setTicketZeroModal(false);
              } else {
                addToast("?ÑÏû¨??Ï≤¥Ìóò ?∞Ïºì??Î∞õÏùÑ ???ÜÏäµ?àÎã§.", "error");
              }
            } catch (error: any) {
              const message = error?.response?.data?.detail || "?îÏ≤≠ Ï≤òÎ¶¨ Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.";
              addToast(message, "error");
            } finally {
              setIsRequestingTrial(false);
            }
          }}
        />
      )}
    </FeatureGate>
  );
};

export default LotteryPage;

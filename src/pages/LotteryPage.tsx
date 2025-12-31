// TODO: [VERIFY] Ensure Ticket count decreases visually on play.
// TODO: [VERIFY] Confirm winning a Prize (Point) does NOT trigger Level Up animation (Strict XP).
import { useMemo, useState } from "react";
import { usePlayLottery, useLotteryStatus } from "../hooks/useLottery";
import FeatureGate from "../components/feature/FeatureGate";
import LotteryCard from "../components/game/LotteryCard";
import { tryHaptic } from "../utils/haptics";
import GamePageShell from "../components/game/GamePageShell";
import TicketZeroPanel from "../components/game/TicketZeroPanel";
import Button from "../components/common/Button";
import VaultAccrualModal from "../components/vault/VaultAccrualModal";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useSound } from "../hooks/useSound";

interface RevealedPrize {
  id: number;
  label: string;
  reward_type: string;
  reward_value: string | number;
}

const LotteryPage: React.FC = () => {
  const { data, isLoading, isError, error } = useLotteryStatus();
  const playMutation = usePlayLottery();
  const queryClient = useQueryClient();
  const { playLotteryScratch, stopLotteryScratch } = useSound();
  const [revealedPrize, setRevealedPrize] = useState<RevealedPrize | null>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [vaultModal, setVaultModal] = useState<{ open: boolean; amount: number }>({ open: false, amount: 0 });

  const mapErrorMessage = (err: unknown) => {
    const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
    const messages: Record<string, string> = {
      NO_FEATURE_TODAY: "오늘 설정된 이벤트가 없습니다.",
      INVALID_FEATURE_SCHEDULE: "이벤트 스케줄 오류",
      FEATURE_DISABLED: "이벤트가 비활성화되었습니다.",
      DAILY_LIMIT_REACHED: "오늘 참여 횟수 초과",
      NOT_ENOUGH_TOKENS: "티켓이 부족합니다.",
    };
    return messages[code || ""] || "복권 정보를 불러오지 못했습니다.";
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
  const canPlay = !isScratching && !playMutation.isPending && !isOutOfTokens && (data?.remaining_plays !== 0);

  const handleScratch = async () => {
    if (isScratching || isRevealed || isOutOfTokens) return;
    try {
      tryHaptic(12);
      setIsScratching(true);
      const result = await playMutation.mutateAsync();
      setIsScratching(false);
      playLotteryScratch(); // Sound: Reveal
      setIsRevealed(true);
      setRevealedPrize({
        id: result.prize.id,
        label: result.prize.label,
        reward_type: result.prize.reward_type,
        reward_value: result.prize.reward_value,
      });

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
    } catch (e) {
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
      <GamePageShell title="지민코드 복권">
        <div className="rounded-[2rem] border border-white/10 bg-black/40 p-10 text-center backdrop-blur-xl">
          <p className="text-xl font-bold text-white">{errorMessage}</p>
          <Button variant="figma-primary" onClick={() => window.location.reload()} className="mt-6">다시 시도</Button>
        </div>
      </GamePageShell>
    );
  }

  return (
    <FeatureGate feature="LOTTERY">
      <GamePageShell
        title="지민코드 복권"
        subtitle="Special Premium Lottery"
        px="px-3 sm:px-6"
        py="py-1"
      >

        {/* 1. Stats Bar */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-black/60 border border-white/10 px-5 py-2 backdrop-blur-md shrink-0">
              <img src="/assets/lottery/icon_lotto_ball.png" alt="Lotto Ball" className="w-6 h-6 object-contain" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/40 leading-none uppercase tracking-widest">보유 로또볼</span>
                <span className="text-sm font-black text-white leading-tight">
                  {tokenBalance.toLocaleString()} <span className="text-[10px] opacity-40 italic">PCS</span>
                </span>
              </div>
            </div>
            <div className="h-px flex-1 bg-white/5" />
          </div>
        </div>

        {/* 2. Main Game Area */}
        <div className="flex flex-col gap-4">
          <LotteryCard
            prize={revealedPrize ?? undefined}
            isRevealed={isRevealed}
            isScratching={isScratching}
            onScratch={handleScratch}
          />

          <div className="max-w-sm mx-auto w-full flex flex-col gap-3">
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
              className="!py-[10px] !rounded-2xl transition-all active:scale-95 shadow-[0_20px_40px_-10px_rgba(48,255,117,0.3)] font-black text-lg sm:text-xl italic"
              fullWidth
            >
              {isRevealed ? "다음 복권 확인" : isScratching ? "결과 확인 중..." : "지금 긁기"}
            </Button>
          </div>
        </div>

        {/* 3. Prize List */}
        <div className="mt-6 mb-8 px-1">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black italic text-figma-accent tracking-[0.2em] uppercase">당첨 가능 경품 리스트</h3>
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Total {data.prizes.length} Items</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {data.prizes.map((prize) => (
              <div
                key={prize.id}
                className={clsx(
                  "group relative aspect-square overflow-hidden rounded-2xl border transition-all flex flex-col items-center justify-center p-2 text-center",
                  prize.is_active === false
                    ? "opacity-30 grayscale border-white/5 bg-transparent"
                    : "bg-white/[0.03] border-white/10 hover:bg-figma-accent/10 hover:border-figma-accent/30"
                )}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
                  <img src="/assets/lottery/gold_foil.jpg" className="w-full h-full object-cover" alt="" />
                </div>

                <div className="relative z-10 w-8 h-8 sm:w-10 sm:h-10 mb-3 group-hover:scale-110 transition-transform duration-500">
                  <img src="/assets/lottery/icon_gift.png" className="w-full h-full object-contain filter drop-shadow-lg" alt="" />
                </div>

                <div className="relative z-10 w-full px-1">
                  <p className="text-sm font-black text-white leading-[1.3] line-clamp-2 mb-1">{prize.label}</p>
                  <div className="flex items-center justify-center gap-1 opacity-60">
                    {(prize.reward_type === 'POINT' || prize.reward_type === 'CURRENCY' || prize.reward_type === 'CASH') ? (
                      <>
                        <span className="text-xs font-black text-white">{Number(prize.reward_value).toLocaleString()}</span>
                        <span className="text-[8px] font-black text-white italic">{prize.reward_type === 'POINT' ? 'P' : '원'}</span>
                      </>
                    ) : (
                      <span className="text-[8px] font-black text-figma-accent italic uppercase tracking-tighter">ITEM</span>
                    )}
                  </div>
                </div>

                {prize.stock !== null && (
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-figma-accent animate-pulse" />
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{prize.stock}</span>
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
    </FeatureGate>
  );
};

export default LotteryPage;

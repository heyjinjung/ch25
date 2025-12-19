// src/pages/LotteryPage.tsx
import { useMemo, useState } from "react";
import { usePlayLottery, useLotteryStatus } from "../hooks/useLottery";
import FeatureGate from "../components/feature/FeatureGate";
import LotteryCard from "../components/game/LotteryCard";
import { GAME_TOKEN_LABELS } from "../types/gameTokens";
import AnimatedNumber from "../components/common/AnimatedNumber";
import { tryHaptic } from "../utils/haptics";
import GamePageShell from "../components/game/GamePageShell";

interface RevealedPrize {
  id: number;
  label: string;
  reward_type: string;
  reward_value: string | number;
}

const LotteryPage: React.FC = () => {
  const { data, isLoading, isError, error } = useLotteryStatus();
  const playMutation = usePlayLottery();
  const [revealedPrize, setRevealedPrize] = useState<RevealedPrize | null>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [rewardToast, setRewardToast] = useState<{ value: number; type: string } | null>(null);

  const mapErrorMessage = (err: unknown) => {
    const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
    if (code === "NO_FEATURE_TODAY") return "오늘 설정된 이벤트가 없습니다.";
    if (code === "INVALID_FEATURE_SCHEDULE") return "이벤트 스케줄이 잘못되었습니다. 지민이에게 문의하세요.";
    if (code === "FEATURE_DISABLED") return "이벤트가 비활성화되었습니다.";
    if (code === "DAILY_LIMIT_REACHED") return "오늘 참여 횟수를 모두 사용했습니다.";
    if (code === "NOT_ENOUGH_TOKENS") return "티켓이 부족합니다. 지민이에게 충전을 요청해주세요.";
    return "복권 정보를 불러오지 못했습니다.";
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

  const remainingLabel = useMemo(() => {
    if (!data) return "-";
    return data.remaining_plays === 0 ? "남은 횟수: 무제한" : `남은 횟수: ${data.remaining_plays}회`;
  }, [data]);

  const tokenLabel = useMemo(() => {
    if (!data) return "-";
    const typeLabel = data.token_type ? (GAME_TOKEN_LABELS[data.token_type] ?? data.token_type) : "-";
    const balanceLabel = typeof data.token_balance === "number" ? String(data.token_balance) : "-";
    return `${typeLabel} · ${balanceLabel}`;
  }, [data]);

  const isUnlimited = data?.remaining_plays === 0;
  const isOutOfTokens = typeof data?.token_balance === "number" && data.token_balance <= 0;

  const handleScratch = async () => {
    if (isScratching || isRevealed) return;
    if (!isUnlimited && data && data.remaining_plays <= 0) return;
    if (isOutOfTokens) return;

    try {
      tryHaptic(12);
      setIsScratching(true);
      const result = await playMutation.mutateAsync();
      setIsScratching(false);
      setIsRevealed(true);
      setRevealedPrize({
        id: result.prize.id,
        label: result.prize.label,
        reward_type: result.prize.reward_type,
        reward_value: result.prize.reward_value,
      });
      const rewardValue = result.prize.reward_value ? Number(result.prize.reward_value) : 0;
      if (rewardValue > 0 && result.prize.reward_type !== "NONE") {
        setRewardToast({ value: rewardValue, type: result.prize.reward_type });
        setTimeout(() => setRewardToast(null), 2500);
      }
    } catch (mutationError) {
      setIsScratching(false);
      console.error("Lottery play failed", mutationError);
    }
  };

  const handleReset = () => {
    setIsRevealed(false);
    setRevealedPrize(null);
  };

  const content = (() => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cc-lime/70 border-t-transparent" />
          <p className="text-[clamp(14px,3vw,18px)] font-semibold text-white/85">복권 정보를 불러오는 중...</p>
        </div>
      );
    }

    if (isError || !data) {
      return (
        <div className="rounded-3xl border border-white/10 bg-black/35 p-6 text-center">
          <p className="text-[clamp(16px,3.2vw,20px)] font-bold text-white">{errorMessage || "데이터를 불러올 수 없습니다."}</p>
          <p className="mt-2 text-[clamp(12px,2.6vw,14px)] text-white/60">잠시 후 다시 시도해주세요.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 sm:space-y-8">
        {rewardToast && (
          <div className="fixed bottom-6 right-6 z-30 rounded-2xl border border-white/15 bg-black/80 px-4 py-3 text-white shadow-lg backdrop-blur animate-bounce-in">
            <span className="font-bold text-cc-lime">+</span>
            <span className="ml-1 font-extrabold text-white">
              <AnimatedNumber value={rewardToast.value} from={0} />
            </span>
            <span className="ml-2 text-white/70">{rewardToast.type}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[clamp(12px,2.4vw,13px)] font-bold text-white/90">
            {remainingLabel}
          </span>
          <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[clamp(12px,2.4vw,13px)] font-bold text-white/70">
            {tokenLabel}
          </span>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-[520px] rounded-3xl border border-white/10 bg-black/30 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.55)] sm:p-6">
            <LotteryCard prize={revealedPrize ?? undefined} isRevealed={isRevealed} isScratching={isScratching} onScratch={handleScratch} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/30 p-4 sm:p-6">
          <h3 className="mb-3 text-center text-[clamp(12px,2.4vw,13px)] font-extrabold uppercase tracking-[0.35em] text-white/60">
            당첨 상품 목록
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.prizes.map((prize) => (
              <div
                key={prize.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 ${
                  prize.is_active === false
                    ? "border-white/10 bg-black/25 opacity-50"
                    : "border-white/10 bg-black/35"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-[clamp(14px,3vw,16px)]">
                  🎁
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{prize.label}</p>
                  <p className="text-[clamp(11px,2.2vw,12px)] text-cc-lime">
                    +{prize.reward_value} <span className="text-white/60">{prize.reward_type}</span>
                  </p>
                </div>
                {prize.stock !== undefined && prize.stock !== null && (
                  <span className="rounded-full border border-white/10 bg-black/35 px-2 py-0.5 text-[clamp(11px,2.2vw,12px)] text-white/70">
                    {prize.stock}개
                  </span>
                )}
              </div>
            ))}
          </div>
          {data.prizes.length === 0 && (
            <p className="text-center text-[clamp(12px,2.6vw,14px)] text-white/60">현재 당첨 가능 상품이 없습니다.</p>
          )}
        </div>

        <div className="space-y-4">
          {playErrorMessage && (
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center text-[clamp(12px,2.6vw,14px)] text-white/80">
              {playErrorMessage}
            </div>
          )}

          {isOutOfTokens && (
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center text-[clamp(12px,2.6vw,14px)] text-white/80">
              티켓이 부족합니다. 운영자에게 충전을 요청해주세요.
            </div>
          )}

          <button
            type="button"
            disabled={
              isScratching ||
              playMutation.isPending ||
              (!isUnlimited && data.remaining_plays <= 0) ||
              isOutOfTokens
            }
            onClick={() => {
              if (isRevealed) {
                tryHaptic(10);
                handleReset();
                return;
              }
              void handleScratch();
            }}
            className="group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-cc-lime px-6 py-4 text-[clamp(16px,3.8vw,18px)] font-extrabold text-cc-olive shadow-lg transition hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
          >
            <span className="relative z-10">
              {isScratching || playMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-cc-olive border-t-transparent" />
                  뽑는 중...
                </span>
              ) : (
                isRevealed ? "다시 하기" : "🎫 복권 뽑기"
              )}
            </span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform group-hover:translate-x-full" />
          </button>

          {revealedPrize && isRevealed && !isScratching && (
            <div className="animate-bounce-in rounded-3xl border border-white/10 bg-black/30 p-6 text-center shadow-lg">
              <p className="text-[clamp(12px,2.4vw,13px)] font-extrabold uppercase tracking-[0.35em] text-white/60">축하 당첨!</p>
              <p className="mt-2 text-[clamp(20px,5vw,26px)] font-extrabold text-white">{revealedPrize.label}</p>
              <p className="mt-2 text-[clamp(14px,3.4vw,16px)] font-bold text-cc-lime">
                +<AnimatedNumber value={Number(revealedPrize.reward_value ?? 0)} from={0} />
                <span className="ml-2 text-white/70">{revealedPrize.reward_type}</span>
              </p>
              {playMutation.data?.message && (
                <p className="mt-2 text-[clamp(12px,2.6vw,14px)] text-white/70">{playMutation.data.message}</p>
              )}
            </div>
          )}
        </div>

        <div className="pt-2 text-center text-[clamp(11px,2.2vw,13px)] text-white/60">
          복권 결과는 서버에서 결정되며, 레벨 경험치가 적립됩니다.
        </div>
      </div>
    );
  })();

  return (
    <FeatureGate feature="LOTTERY">
      <GamePageShell title="크리스마스 복권" subtitle="Special Game Lottery">
        {content}
      </GamePageShell>
    </FeatureGate>
  );
};

export default LotteryPage;

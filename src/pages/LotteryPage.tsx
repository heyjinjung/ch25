// src/pages/LotteryPage.tsx
import { useMemo, useState } from "react";
import { usePlayLottery, useLotteryStatus } from "../hooks/useLottery";
import FeatureGate from "../components/feature/FeatureGate";
import LotteryCard from "../components/game/LotteryCard";
import { GAME_TOKEN_LABELS } from "../types/gameTokens";

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
  const [rewardToast, setRewardToast] = useState<string | null>(null);

  const mapErrorMessage = (err: unknown) => {
    const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
    if (code === "NO_FEATURE_TODAY") return "오늘 설정된 이벤트가 없습니다.";
    if (code === "INVALID_FEATURE_SCHEDULE") return "이벤트 스케줄이 잘못되었습니다. 관리자에게 문의하세요.";
    if (code === "FEATURE_DISABLED") return "이벤트가 비활성화되었습니다.";
    if (code === "DAILY_LIMIT_REACHED") return "오늘 참여 횟수를 모두 사용했습니다.";
    if (code === "NOT_ENOUGH_TOKENS") return "티켓이 부족합니다. 관리자에게 충전을 요청해주세요.";
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
      setIsScratching(true);
      const result = await playMutation.mutateAsync();
      await new Promise((r) => setTimeout(r, 2000));
      setIsScratching(false);
      setIsRevealed(true);
      setRevealedPrize({
        id: result.prize.id,
        label: result.prize.label,
        reward_type: result.prize.reward_type,
        reward_value: result.prize.reward_value,
      });
      if (result.prize.reward_value && Number(result.prize.reward_value) > 0 && result.prize.reward_type !== "NONE") {
        setRewardToast(`+${result.prize.reward_value} ${result.prize.reward_type}`);
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
        <section className="flex flex-col items-center justify-center rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 shadow-2xl">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="mt-4 text-lg font-semibold text-emerald-200">복권 정보를 불러오는 중...</p>
        </section>
      );
    }

    if (isError || !data) {
      return (
        <section className="rounded-3xl border border-red-800/40 bg-gradient-to-br from-red-950 to-slate-900 p-8 text-center shadow-2xl">
          <div className="mb-4 text-5xl">😢</div>
          <p className="text-xl font-bold text-red-100">{errorMessage || "데이터를 불러올 수 없습니다."}</p>
          <p className="mt-2 text-sm text-red-200/70">잠시 후 다시 시도해주세요</p>
        </section>
      );
    }

    return (
      <section className="space-y-8 rounded-3xl border border-gold-600/30 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 shadow-2xl">
        {rewardToast && (
          <div className="fixed bottom-6 right-6 z-30 rounded-2xl border border-emerald-500/60 bg-emerald-900/80 px-4 py-3 text-emerald-100 shadow-lg animate-bounce-in">
            {rewardToast}
          </div>
        )}
        <header className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-gold-400">스페셜 게임</p>
          <h1 className="mt-2 text-3xl font-bold text-white">크리스마스 복권</h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-900/60 px-4 py-2 text-sm font-semibold text-emerald-100">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              {remainingLabel}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              {tokenLabel}
            </div>
          </div>
        </header>

        <div className="flex justify-center">
          <LotteryCard
            prize={revealedPrize ?? undefined}
            isRevealed={isRevealed}
            isScratching={isScratching}
            onScratch={handleScratch}
          />
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
          <h3 className="mb-3 text-center text-sm font-semibold uppercase tracking-wider text-gold-400">당첨 상품 목록</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.prizes.map((prize) => (
              <div
                key={prize.id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  prize.is_active === false
                    ? "border-slate-700/30 bg-slate-900/40 opacity-50"
                    : "border-emerald-700/40 bg-emerald-900/20"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold-500 to-gold-700 text-lg">
                  🎁
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{prize.label}</p>
                  <p className="text-xs text-emerald-300">
                    {prize.reward_type} +{prize.reward_value}
                  </p>
                </div>
                {prize.stock !== undefined && prize.stock !== null && (
                  <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-slate-300">{prize.stock}개</span>
                )}
              </div>
            ))}
          </div>
          {data.prizes.length === 0 && <p className="text-center text-sm text-slate-400">현재 당첨 가능 상품이 없습니다.</p>}
        </div>

        <div className="space-y-4">
          {playErrorMessage && (
            <div className="rounded-xl border border-red-700/40 bg-red-900/30 px-4 py-3 text-center text-red-200">{playErrorMessage}</div>
          )}

          {isOutOfTokens && (
            <div className="rounded-xl border border-amber-600/30 bg-amber-900/20 px-4 py-3 text-center text-amber-100">
              티켓이 부족합니다. 관리자에게 충전을 요청해주세요.
            </div>
          )}

          <button
            type="button"
            disabled={
              isScratching ||
              isRevealed ||
              playMutation.isPending ||
              (!isUnlimited && data.remaining_plays <= 0) ||
              isOutOfTokens
            }
            onClick={handleScratch}
            className="group relative w-full overflow-hidden rounded-full bg-gradient-to-r from-gold-600 to-gold-500 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:from-gold-500 hover:to-gold-400 hover:shadow-gold-500/30 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-600"
          >
            <span className="relative z-10">
              {isScratching || playMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  긁는 중...
                </span>
              ) : (
                "🎫 복권 뽑기"
              )}
            </span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform group-hover:translate-x-full" />
          </button>

          {revealedPrize && !isScratching && (
            <div className="animate-bounce-in rounded-2xl border border-gold-500/50 bg-gradient-to-br from-gold-900/40 to-slate-900/80 p-6 text-center shadow-lg">
              <p className="text-sm uppercase tracking-wider text-gold-400">축하 당첨!</p>
              <p className="mt-2 text-2xl font-bold text-white">{revealedPrize.label}</p>
              <p className="mt-2 text-emerald-300">
                +{revealedPrize.reward_value} {revealedPrize.reward_type}
              </p>
              {playMutation.data?.message && <p className="mt-2 text-sm text-slate-300">{playMutation.data.message}</p>}
              {(isUnlimited || (data && data.remaining_plays > 0)) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-4 rounded-full bg-slate-700 px-6 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
                >
                  다시 긁기
                </button>
              )}
            </div>
          )}
        </div>

        <footer className="border-t border-slate-700/50 pt-4 text-center text-xs text-slate-400">
          <p>복권 결과는 서버에서 결정되며, 시즌패스 경험치가 적립됩니다.</p>
        </footer>
      </section>
    );
  })();

  return <FeatureGate feature="LOTTERY">{content}</FeatureGate>;
};

export default LotteryPage;

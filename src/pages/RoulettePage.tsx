import { useEffect, useMemo, useRef, useState } from "react";
import RouletteWheel from "../components/game/RouletteWheel";
import { usePlayRoulette, useRouletteStatus } from "../hooks/useRoulette";
import FeatureGate from "../components/feature/FeatureGate";
import { GAME_TOKEN_LABELS } from "../types/gameTokens";
import { useNavigate } from "react-router-dom";
import type { RoulettePlayResponse } from "../api/rouletteApi";

const FALLBACK_SEGMENTS = Array.from({ length: 12 }).map((_, idx) => ({
  label: `BONUS ${idx + 1}`,
  weight: 1,
  isJackpot: idx === 0,
}));

const RoulettePage: React.FC = () => {
  const { data, isLoading, isError, error } = useRouletteStatus();
  const playMutation = usePlayRoulette();
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>();
  const SPIN_DURATION_MS = 3000;
  const RESULT_DELAY_MS = 800;
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayedResult, setDisplayedResult] = useState<RoulettePlayResponse | null>(null);
  const [rewardToast, setRewardToast] = useState<string | null>(null);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingResultRef = useRef<RoulettePlayResponse | null>(null);
  const spinStartAtRef = useRef<number | null>(null);
  const transitionEndAtRef = useRef<number | null>(null);

  const segments = useMemo(() => {
    const resolved = (data?.segments ?? []).map((segment) => ({
      label: segment.label,
      weight: segment.weight,
      isJackpot: segment.isJackpot,
    }));
    return resolved.length > 0 ? resolved : FALLBACK_SEGMENTS;
  }, [data?.segments]);

  const usingFallbackSegments = useMemo(() => (data?.segments ?? []).length === 0, [data?.segments]);

  const mapErrorMessage = (err: unknown) => {
    const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
    if (code === "NO_FEATURE_TODAY") return "오늘 활성화된 이벤트가 없습니다.";
    if (code === "INVALID_FEATURE_SCHEDULE") return "이벤트 일정이 맞지 않습니다. 지민이에게 문의하세요.";
    if (code === "FEATURE_DISABLED") return "이벤트가 비활성화되었습니다.";
    if (code === "DAILY_LIMIT_REACHED") return "오늘 참여 횟수를 모두 사용했습니다.";
    if (code === "NOT_ENOUGH_TOKENS") return "티켓이 부족합니다. 지민이에게 충전을 요청하세요.";
    return "룰렛 정보를 불러오지 못했습니다.";
  };

  const errorMessage = useMemo(() => (error ? mapErrorMessage(error) : undefined), [error]);
  const playErrorMessage = useMemo(
    () => (playMutation.error ? mapErrorMessage(playMutation.error) : undefined),
    [playMutation.error]
  );

  const remainingLabel = useMemo(() => {
    if (!data) return "-";
    return data.remaining_spins === 0 ? "남은 횟수: 무제한" : `남은 횟수: ${data.remaining_spins}회`;
  }, [data]);

  const tokenLabel = useMemo(() => {
    if (!data) return "-";
    const typeLabel = data.token_type ? (GAME_TOKEN_LABELS[data.token_type] ?? data.token_type) : "-";
    const balanceLabel = typeof data.token_balance === "number" ? String(data.token_balance) : "-";
    return `${typeLabel} · ${balanceLabel}`;
  }, [data]);

  const isUnlimited = data?.remaining_spins === 0;
  const isOutOfTokens = typeof data?.token_balance === "number" && data.token_balance <= 0;

  const handlePlay = async () => {
    try {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = null;
      }

      pendingResultRef.current = null;
      setSelectedIndex(undefined);
      setDisplayedResult(null);
      setRewardToast(null);

      const requestAt = performance.now();
      console.log("[Roulette] play start", { requestAt });

      const result = await playMutation.mutateAsync();
      const resultAt = performance.now();
      console.log("[Roulette] result received", {
        label: result.segment?.label,
        reward: result.reward_value,
        selectedIndex: result.selected_index,
        latencyMs: resultAt - requestAt,
      });

      pendingResultRef.current = result;
      setSelectedIndex(result.selected_index);
      setIsSpinning(true);
      spinStartAtRef.current = performance.now();
    } catch (e) {
      console.error("Roulette play failed", e);
    }
  };

  const handleSpinEnd = () => {
    if (!pendingResultRef.current) return;

    transitionEndAtRef.current = performance.now();
    console.log("[Roulette] wheel transitionend", {
      spinMs:
        spinStartAtRef.current && transitionEndAtRef.current
          ? transitionEndAtRef.current - spinStartAtRef.current
          : "n/a",
    });

    spinTimeoutRef.current = setTimeout(() => {
      const result = pendingResultRef.current;
      pendingResultRef.current = null;
      setIsSpinning(false);
      setDisplayedResult(result);
      if (result && result.reward_value && Number(result.reward_value) > 0 && result.reward_type !== "NONE") {
        setRewardToast(`+${result.reward_value} ${result.reward_type}`);
        setTimeout(() => setRewardToast(null), 2500);
      }
      const applyAt = performance.now();
      console.log("[Roulette] result applied", {
        delayAfterTransitionMs: transitionEndAtRef.current ? applyAt - transitionEndAtRef.current : "n/a",
        totalMs: spinStartAtRef.current ? applyAt - spinStartAtRef.current : "n/a",
      });
      spinTimeoutRef.current = null;
    }, RESULT_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
      pendingResultRef.current = null;
      spinStartAtRef.current = null;
      transitionEndAtRef.current = null;
    };
  }, []);

  const content = (() => {
    if (isLoading) {
      return (
        <section className="flex flex-col items-center justify-center rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 shadow-2xl">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="mt-4 text-lg font-semibold text-emerald-200">룰렛 정보를 불러오는 중...</p>
        </section>
      );
    }

    if (isError || !data) {
      return (
        <section className="rounded-3xl border border-red-800/40 bg-gradient-to-br from-red-950 to-slate-900 p-8 text-center shadow-2xl">
          <div className="mb-4 text-5xl">⚠️</div>
          <p className="text-xl font-bold text-red-100">{errorMessage ?? "데이터를 불러오지 못했습니다."}</p>
          <p className="mt-2 text-sm text-red-200/70">잠시 후 다시 시도하거나 지민이에게 문의하세요.</p>
        </section>
      );
    }

    return (
      <section className="space-y-8 rounded-3xl border border-gold-600/40 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-8 shadow-2xl">
        {!isSpinning && rewardToast && (
          <div className="fixed bottom-6 right-6 z-30 rounded-2xl border border-emerald-500/60 bg-emerald-900/80 px-4 py-3 text-emerald-100 shadow-lg animate-bounce-in">
            {rewardToast}
          </div>
        )}
        <header className="text-center space-y-3">
          <p className="text-sm uppercase tracking-[0.35em] text-gold-400">Premium Prize Roulette</p>
          <h1 className="text-3xl font-bold text-white">럭셔리 CC룰렛</h1>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-900/70 px-4 py-2 text-sm font-semibold text-emerald-100 shadow">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              {remainingLabel}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100 shadow">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              {tokenLabel}
            </div>
          </div>
        </header>
        <div className="grid gap-6 items-start lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="relative rounded-3xl border border-emerald-700/50 bg-gradient-to-br from-slate-950 to-slate-900 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
              <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/20 blur-3xl" />
              <div className="absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-gold-400/10 blur-3xl" />
              <RouletteWheel
                segments={segments}
                isSpinning={isSpinning}
                selectedIndex={selectedIndex}
                spinDurationMs={SPIN_DURATION_MS}
                onSpinEnd={handleSpinEnd}
              />
            </div>
            {usingFallbackSegments && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-900/10 px-4 py-3 text-xs text-amber-100">
                라이브 구간 데이터를 불러오지 못해 임시 구성을 표시합니다. /api/roulette/status 응답을 확인해 주세요.
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-3xl border border-emerald-700/40 bg-slate-900/70 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white">플레이 정보</h3>
            {playErrorMessage && (
              <div className="rounded-xl border border-red-700/40 bg-red-900/30 px-4 py-3 text-sm text-red-100">{playErrorMessage}</div>
            )}
            {isOutOfTokens && (
              <div className="rounded-xl border border-amber-600/30 bg-amber-900/20 px-4 py-3 text-sm text-amber-100">
                티켓이 부족합니다. 지민이에게 충전을 요청하세요.
              </div>
            )}
            <button
              type="button"
              disabled={playMutation.isPending || isSpinning || (!isUnlimited && data.remaining_spins <= 0) || isOutOfTokens}
              onClick={handlePlay}
              className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:from-emerald-500 hover:to-emerald-400 hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-600"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {playMutation.isPending ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    스핀 중...
                  </>
                ) : (
                  "럭셔리 룰렛 돌리기"
                )}
              </span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform group-hover:translate-x-full" />
            </button>

            {!isSpinning && displayedResult && (
              <div className="rounded-2xl border border-gold-500/50 bg-gradient-to-br from-emerald-900/70 to-slate-900/80 p-5 text-center shadow-lg animate-bounce-in">
                <p className="text-sm uppercase tracking-wider text-gold-400">🎉 결과</p>
                <p className="mt-2 text-2xl font-bold text-white">{displayedResult.segment.label}</p>
                {displayedResult.reward_type && displayedResult.reward_type !== "NONE" && (
                  <p className="mt-2 text-emerald-300">
                    +{displayedResult.reward_value} {displayedResult.reward_type}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate("/landing")}
              className="w-full rounded-lg border border-emerald-500/50 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-900/40"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>

        <footer className="border-t border-slate-700/50 pt-4 text-center text-xs text-slate-400">
          <p>룰렛 결과는 서버에서 결정되며, 레벨 경험치가 적립됩니다.</p>
        </footer>
      </section>
    );
  })();

  return <FeatureGate feature="ROULETTE">{content}</FeatureGate>;
};

export default RoulettePage;

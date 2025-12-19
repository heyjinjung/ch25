import { useEffect, useMemo, useRef, useState } from "react";
import RouletteWheel from "../components/game/RouletteWheel";
import { usePlayRoulette, useRouletteStatus } from "../hooks/useRoulette";
import FeatureGate from "../components/feature/FeatureGate";
import { GAME_TOKEN_LABELS } from "../types/gameTokens";
import type { RoulettePlayResponse } from "../api/rouletteApi";
import AnimatedNumber from "../components/common/AnimatedNumber";
import { tryHaptic } from "../utils/haptics";
import GamePageShell from "../components/game/GamePageShell";

const FALLBACK_SEGMENTS = Array.from({ length: 12 }).map((_, idx) => ({
  label: `BONUS ${idx + 1}`,
  weight: 1,
  isJackpot: idx === 0,
}));

const RoulettePage: React.FC = () => {
  const { data, isLoading, isError, error } = useRouletteStatus();
  const playMutation = usePlayRoulette();
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>();
  const SPIN_DURATION_MS = 3000;
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayedResult, setDisplayedResult] = useState<RoulettePlayResponse | null>(null);
  const [rewardToast, setRewardToast] = useState<{ value: number; type: string } | null>(null);
  const pendingResultRef = useRef<RoulettePlayResponse | null>(null);
  const spinStartAtRef = useRef<number | null>(null);
  const transitionEndAtRef = useRef<number | null>(null);
  const spinHapticIntervalRef = useRef<number | null>(null);
  const spinHapticTimeoutsRef = useRef<number[]>([]);

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
      tryHaptic([10, 35, 10]);

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

    const result = pendingResultRef.current;
    pendingResultRef.current = null;

    setIsSpinning(false);
    setDisplayedResult(result);

    const rewardValue = result?.reward_value ? Number(result.reward_value) : 0;
    const rewardType = result?.reward_type ?? "NONE";
    if (rewardValue > 0 && rewardType !== "NONE") {
      setRewardToast({ value: rewardValue, type: rewardType });
      window.setTimeout(() => setRewardToast(null), 2500);
    }

    const applyAt = performance.now();
    console.log("[Roulette] result applied", {
      delayAfterTransitionMs: transitionEndAtRef.current ? applyAt - transitionEndAtRef.current : "n/a",
      totalMs: spinStartAtRef.current ? applyAt - spinStartAtRef.current : "n/a",
    });
  };

  useEffect(() => {
    return () => {
      pendingResultRef.current = null;
      spinStartAtRef.current = null;
      transitionEndAtRef.current = null;

      if (spinHapticIntervalRef.current) {
        window.clearInterval(spinHapticIntervalRef.current);
        spinHapticIntervalRef.current = null;
      }
      spinHapticTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      spinHapticTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const canHaptic = (() => {
      if (typeof window === "undefined") return false;
      if (typeof navigator === "undefined") return false;
      if (!("vibrate" in navigator)) return false;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return false;

      // Prefer haptics on mobile-like pointers only.
      if (typeof window.matchMedia === "function") {
        if (!window.matchMedia("(pointer: coarse)").matches) return false;
      }
      return true;
    })();

    if (!isSpinning || !canHaptic) {
      if (spinHapticIntervalRef.current) {
        window.clearInterval(spinHapticIntervalRef.current);
        spinHapticIntervalRef.current = null;
      }
      spinHapticTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      spinHapticTimeoutsRef.current = [];
      return;
    }

    // Rate-limited spin haptics: short pulses, slightly faster near the end.
    const maxPulses = 6;
    let pulses = 0;

    spinHapticIntervalRef.current = window.setInterval(() => {
      if (!spinStartAtRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      const elapsed = performance.now() - spinStartAtRef.current;
      if (elapsed < 350) return; // let the wheel start visually

      pulses += 1;
      const intensity = Math.min(14, 6 + pulses);
      tryHaptic(intensity);

      if (pulses >= maxPulses) {
        if (spinHapticIntervalRef.current) {
          window.clearInterval(spinHapticIntervalRef.current);
          spinHapticIntervalRef.current = null;
        }
      }
    }, 420);

    // Final accent close to the stop (kept short to avoid over-vibration).
    const finalAccentAt = Math.max(0, SPIN_DURATION_MS - 220);
    spinHapticTimeoutsRef.current.push(
      window.setTimeout(() => {
        if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
        tryHaptic([12, 35, 12]);
      }, finalAccentAt)
    );

    return () => {
      if (spinHapticIntervalRef.current) {
        window.clearInterval(spinHapticIntervalRef.current);
        spinHapticIntervalRef.current = null;
      }
      spinHapticTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      spinHapticTimeoutsRef.current = [];
    };
  }, [SPIN_DURATION_MS, isSpinning]);

  const content = (() => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cc-lime/70 border-t-transparent" />
          <p className="text-[clamp(14px,3vw,18px)] font-semibold text-white/85">룰렛 정보를 불러오는 중...</p>
        </div>
      );
    }

    if (isError || !data) {
      return (
        <div className="rounded-3xl border border-white/10 bg-black/35 p-6 text-center">
          <p className="text-[clamp(16px,3.2vw,20px)] font-bold text-white">{errorMessage ?? "데이터를 불러오지 못했습니다."}</p>
          <p className="mt-2 text-[clamp(12px,2.6vw,14px)] text-white/60">잠시 후 다시 시도하거나 운영자에게 문의하세요.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 sm:space-y-8">
        {!isSpinning && rewardToast && (
          <div className="fixed bottom-6 right-6 z-30 rounded-2xl border border-white/15 bg-black/80 px-4 py-3 text-white shadow-lg backdrop-blur animate-bounce-in">
            <span className="font-bold text-cc-lime">+</span>
            <span className="ml-1 font-extrabold text-white">
              <AnimatedNumber value={rewardToast.value} from={0} />
            </span>
            <span className="ml-2 text-white/70">{rewardToast.type}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/35 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.55)] sm:p-6">
              <div className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-cc-lime/10 blur-3xl" />
              <div className="pointer-events-none absolute -right-12 bottom-0 h-36 w-36 rounded-full bg-white/5 blur-3xl" />
              <RouletteWheel
                segments={segments}
                isSpinning={isSpinning}
                selectedIndex={selectedIndex}
                spinDurationMs={SPIN_DURATION_MS}
                onSpinEnd={handleSpinEnd}
              />
            </div>
            {usingFallbackSegments && (
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-[clamp(11px,2.2vw,12px)] text-white/70">
                라이브 구간 데이터를 불러오지 못해 임시 구성을 표시합니다. /api/roulette/status 응답을 확인해 주세요.
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-black/35 p-4 shadow-lg sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[clamp(12px,2.4vw,13px)] font-bold text-white/90">
                {remainingLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[clamp(12px,2.4vw,13px)] font-bold text-white/70">
                {tokenLabel}
              </span>
            </div>

            {playErrorMessage && (
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-[clamp(12px,2.6vw,14px)] text-white/80">
                {playErrorMessage}
              </div>
            )}
            {isOutOfTokens && (
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-[clamp(12px,2.6vw,14px)] text-white/80">
                티켓이 부족합니다. 운영자에게 충전을 요청하세요.
              </div>
            )}
            <button
              type="button"
              disabled={playMutation.isPending || isSpinning || (!isUnlimited && data.remaining_spins <= 0) || isOutOfTokens}
              onClick={handlePlay}
              className="group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-cc-lime px-6 py-4 text-[clamp(16px,3.8vw,18px)] font-extrabold text-cc-olive shadow-lg transition hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {playMutation.isPending ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-cc-olive border-t-transparent" />
                    스핀 중...
                  </>
                ) : (
                  (!isSpinning && displayedResult ? "다시 하기" : "럭셔리 룰렛 돌리기")
                )}
              </span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform group-hover:translate-x-full" />
            </button>

            {!isSpinning && displayedResult && (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5 text-center shadow-lg animate-bounce-in">
                <p className="text-[clamp(12px,2.6vw,13px)] font-bold uppercase tracking-[0.35em] text-white/60">결과</p>
                <p className="mt-2 text-[clamp(20px,5vw,26px)] font-extrabold text-white">{displayedResult.segment.label}</p>
                {displayedResult.reward_type && displayedResult.reward_type !== "NONE" && (
                  <p className="mt-2 text-[clamp(14px,3.4vw,16px)] font-bold text-cc-lime">
                    +<AnimatedNumber value={Number(displayedResult.reward_value ?? 0)} from={0} />
                    <span className="ml-2 text-white/70">{displayedResult.reward_type}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 text-center text-[clamp(11px,2.2vw,13px)] text-white/60">
          룰렛 결과는 서버에서 결정되며, 레벨 경험치가 적립됩니다.
        </div>
      </div>
    );
  })();

  return (
    <FeatureGate feature="ROULETTE">
      <GamePageShell title="럭셔리 CC룰렛" subtitle="Premium Prize Roulette">
        {content}
      </GamePageShell>
    </FeatureGate>
  );
};

export default RoulettePage;

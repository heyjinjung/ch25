// src/pages/DicePage.tsx
import { useMemo, useState } from "react";
import DiceView from "../components/game/DiceView";
import { useDiceStatus, usePlayDice } from "../hooks/useDice";
import FeatureGate from "../components/feature/FeatureGate";
import { GAME_TOKEN_LABELS } from "../types/gameTokens";
import AnimatedNumber from "../components/common/AnimatedNumber";
import { tryHaptic } from "../utils/haptics";
import GamePageShell from "../components/game/GamePageShell";

const DicePage: React.FC = () => {
  const { data, isLoading, isError } = useDiceStatus();
  const playMutation = usePlayDice();
  const [result, setResult] = useState<"WIN" | "LOSE" | "DRAW" | null>(null);
  const [userDice, setUserDice] = useState<number[]>([]);
  const [dealerDice, setDealerDice] = useState<number[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [rewardToast, setRewardToast] = useState<{ value: number; type: string } | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const mapErrorMessage = (err: unknown) => {
    const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
    if (code === "NO_FEATURE_TODAY") return "오늘 설정된 이벤트가 없습니다.";
    if (code === "INVALID_FEATURE_SCHEDULE") return "이벤트 스케줄이 잘못되었습니다. 지민이에게 문의하세요.";
    if (code === "FEATURE_DISABLED") return "이벤트가 비활성화되었습니다.";
    if (code === "DAILY_LIMIT_REACHED") return "오늘 참여 횟수를 모두 사용했습니다.";
    if (code === "NOT_ENOUGH_TOKENS") return "티켓이 부족합니다. 지민이에게 충전을 요청해주세요.";
    return "주사위 전투를 진행할 수 없습니다. 잠시 후 다시 시도해주세요.";
  };

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

  const handlePlay = async () => {
    try {
      tryHaptic(12);
      setInfoMessage(null);
      setResult(null);
      setIsRolling(true);
      const response = await playMutation.mutateAsync();
      setIsRolling(false);
      setResult(response.result);
      setUserDice(response.user_dice);
      setDealerDice(response.dealer_dice);
      setInfoMessage(response.message ?? null);
      const rewardValue = response.reward_value ? Number(response.reward_value) : 0;
      const rewardType = response.reward_type ?? "보상";
      if (response.result === "WIN" && rewardValue > 0) {
        setRewardToast({ value: rewardValue, type: rewardType });
        setTimeout(() => setRewardToast(null), 2500);
      }
    } catch (e) {
      setIsRolling(false);
      console.error("Dice play failed", e);
    }
  };

  const content = (() => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cc-lime/70 border-t-transparent" />
          <p className="text-[clamp(14px,3vw,18px)] font-semibold text-white/85">주사위 정보를 불러오는 중...</p>
        </div>
      );
    }

    if (isError || !data) {
      return (
        <div className="rounded-3xl border border-white/10 bg-black/35 p-6 text-center">
          <p className="text-[clamp(16px,3.2vw,20px)] font-bold text-white">주사위 정보를 불러오지 못했습니다.</p>
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

        <div className="rounded-3xl border border-white/10 bg-black/30 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.55)] sm:p-6">
          <DiceView userDice={userDice} dealerDice={dealerDice} result={result} isRolling={isRolling} />
        </div>

        <div className="space-y-4">
          {!!playMutation.error && !isRolling && (
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center text-[clamp(12px,2.6vw,14px)] text-white/80">
              {mapErrorMessage(playMutation.error)}
            </div>
          )}

          {isOutOfTokens && (
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center text-[clamp(12px,2.6vw,14px)] text-white/80">
              티켓이 부족합니다. 운영자에게 충전을 요청해주세요.
            </div>
          )}

          <button
            type="button"
            disabled={isRolling || playMutation.isPending || (!isUnlimited && data.remaining_plays <= 0) || isOutOfTokens}
            onClick={handlePlay}
            className="group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-cc-lime px-6 py-4 text-[clamp(16px,3.8vw,18px)] font-extrabold text-cc-olive shadow-lg transition hover:brightness-105 active:brightness-95 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
          >
            <span className="relative z-10">
              {isRolling || playMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-cc-olive border-t-transparent" />
                  주사위를 굴리는 중...
                </span>
              ) : (
                result || infoMessage ? "다시 하기" : "🎲 주사위 던지기"
              )}
            </span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform group-hover:translate-x-full" />
          </button>

          {infoMessage && !isRolling && <p className="text-center text-[clamp(12px,2.6vw,14px)] text-white/75">{infoMessage}</p>}
        </div>

        <div className="pt-2 text-center text-[clamp(11px,2.2vw,13px)] text-white/60">
          승리 시 추가 보상, 무승부는 기본 보상이 적립됩니다.
        </div>
      </div>
    );
  })();

  return (
    <FeatureGate feature="DICE">
      <GamePageShell title="주사위 배틀" subtitle="Special Game Dice Battle">
        {content}
      </GamePageShell>
    </FeatureGate>
  );
};

export default DicePage;

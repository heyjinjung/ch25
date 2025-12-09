// src/pages/DicePage.tsx
import { useMemo, useState } from "react";
import DiceView from "../components/game/DiceView";
import { useDiceStatus, usePlayDice } from "../hooks/useDice";
import FeatureGate from "../components/feature/FeatureGate";
import { GAME_TOKEN_LABELS } from "../types/gameTokens";

const DicePage: React.FC = () => {
  const { data, isLoading, isError } = useDiceStatus();
  const playMutation = usePlayDice();
  const [result, setResult] = useState<"WIN" | "LOSE" | "DRAW" | null>(null);
  const [userDice, setUserDice] = useState<number[]>([]);
  const [dealerDice, setDealerDice] = useState<number[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [rewardToast, setRewardToast] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const mapErrorMessage = (err: unknown) => {
    const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
    if (code === "NO_FEATURE_TODAY") return "오늘 설정된 이벤트가 없습니다.";
    if (code === "INVALID_FEATURE_SCHEDULE") return "이벤트 스케줄이 잘못되었습니다. 관리자에게 문의하세요.";
    if (code === "FEATURE_DISABLED") return "이벤트가 비활성화되었습니다.";
    if (code === "DAILY_LIMIT_REACHED") return "오늘 참여 횟수를 모두 사용했습니다.";
    if (code === "NOT_ENOUGH_TOKENS") return "토큰이 부족합니다. 관리자에게 충전을 요청해주세요.";
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
      setInfoMessage(null);
      setResult(null);
      setIsRolling(true);
      const response = await playMutation.mutateAsync();
      await new Promise((r) => setTimeout(r, 1500));
      setIsRolling(false);
      setResult(response.result);
      setUserDice(response.user_dice);
      setDealerDice(response.dealer_dice);
      setInfoMessage(response.message ?? null);
      if (response.result === "WIN" && response.reward_value && Number(response.reward_value) > 0) {
        setRewardToast(`+${response.reward_value} ${response.reward_type ?? "보상"}`);
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
        <section className="flex flex-col items-center justify-center rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 shadow-2xl">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="mt-4 text-lg font-semibold text-emerald-200">주사위 정보를 불러오는 중...</p>
        </section>
      );
    }

    if (isError || !data) {
      return (
        <section className="rounded-3xl border border-red-800/40 bg-gradient-to-br from-red-950 to-slate-900 p-8 text-center shadow-2xl">
          <div className="mb-4 text-5xl">😢</div>
          <p className="text-xl font-bold text-red-100">주사위 정보를 불러오지 못했습니다.</p>
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
          <h1 className="mt-2 text-3xl font-bold text-white">주사위 배틀</h1>
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

        <DiceView userDice={userDice} dealerDice={dealerDice} result={result} isRolling={isRolling} />

        <div className="space-y-4">
          {!!playMutation.error && !isRolling && (
            <div className="rounded-xl border border-red-700/40 bg-red-900/30 px-4 py-3 text-center text-red-200">
              {mapErrorMessage(playMutation.error)}
            </div>
          )}

          {isOutOfTokens && (
            <div className="rounded-xl border border-amber-600/30 bg-amber-900/20 px-4 py-3 text-center text-amber-100">
              토큰이 부족합니다. 관리자에게 충전을 요청해주세요.
            </div>
          )}

          <button
            type="button"
            disabled={isRolling || playMutation.isPending || (!isUnlimited && data.remaining_plays <= 0) || isOutOfTokens}
            onClick={handlePlay}
            className="group relative w-full overflow-hidden rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:from-emerald-500 hover:to-emerald-400 hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-600"
          >
            <span className="relative z-10">
              {isRolling || playMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  주사위를 굴리는 중...
                </span>
              ) : (
                "🎲 주사위 던지기"
              )}
            </span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform group-hover:translate-x-full" />
          </button>

          {infoMessage && !isRolling && <p className="text-center text-sm text-emerald-200">{infoMessage}</p>}
        </div>

        <footer className="border-t border-slate-700/50 pt-4 text-center text-xs text-slate-400">
          <p>승리 시 추가 보상, 무승부는 기본 보상이 적립됩니다.</p>
        </footer>
      </section>
    );
  })();

  return <FeatureGate feature="DICE">{content}</FeatureGate>;
};

export default DicePage;

// src/pages/DicePage.tsx
import React, { useMemo, useState } from "react";
import DiceView from "../components/game/DiceView";
import { useDiceStatus, usePlayDice } from "../hooks/useDice";
import FeatureGate from "../components/feature/FeatureGate";

const DicePage: React.FC = () => {
  const { data, isLoading, isError } = useDiceStatus();
  const playMutation = usePlayDice();
  const [result, setResult] = useState<"WIN" | "LOSE" | "DRAW" | null>(null);
  const [userDice, setUserDice] = useState<number[]>([]);
  const [dealerDice, setDealerDice] = useState<number[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const mapErrorMessage = (err: unknown) => {
    const code = (err as any)?.response?.data?.error?.code as string | undefined;
    if (code === "NO_FEATURE_TODAY") return "오늘 활성화된 이벤트가 없습니다.";
    if (code === "INVALID_FEATURE_SCHEDULE") return "이벤트 스케줄이 잘못되었습니다. 관리자에게 문의하세요.";
    if (code === "FEATURE_DISABLED") return "이벤트가 비활성화되었습니다.";
    return "주사위를 진행할 수 없습니다. 잠시 후 다시 시도해주세요.";
  };

  const remainingLabel = useMemo(() => {
    if (!data) return "-";
    return data.remaining_plays === 0 ? "무제한" : `${data.remaining_plays}회`;
  }, [data]);
  const isUnlimited = data?.remaining_plays === 0;

  const handlePlay = async () => {
    try {
      setInfoMessage(null);
      const response = await playMutation.mutateAsync();
      setResult(response.result);
      setUserDice(response.user_dice);
      setDealerDice(response.dealer_dice);
      setInfoMessage(response.message ?? null);
    } catch (e) {
      console.error("Dice play failed", e);
    }
  };

  const content = (() => {
    if (isLoading) {
      return (
        <section className="rounded-xl border border-emerald-800/40 bg-slate-900/60 p-6 text-center shadow-lg shadow-emerald-900/30">
          <p className="text-lg font-semibold text-emerald-200">주사위 상태를 불러오는 중...</p>
        </section>
      );
    }

    if (isError || !data) {
      return (
        <section className="rounded-xl border border-red-800/40 bg-red-950/60 p-6 text-center text-red-100 shadow-lg shadow-red-900/30">
          <p className="text-lg font-semibold">주사위 정보를 불러오지 못했습니다.</p>
        </section>
      );
    }

    return (
      <section className="space-y-6 rounded-xl border border-emerald-800/40 bg-slate-900/60 p-6 shadow-lg shadow-emerald-900/30">
        <header className="space-y-1 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">오늘의 이벤트</p>
          <h2 className="text-2xl font-bold text-emerald-100">주사위</h2>
          <p className="text-sm text-slate-300">남은 횟수: {remainingLabel}</p>
        </header>

        <DiceView userDice={userDice} dealerDice={dealerDice} result={result} />

        <div className="space-y-3 text-center">
          {!!playMutation.error && <p className="text-sm text-red-200">{mapErrorMessage(playMutation.error)}</p>}
          <button
            type="button"
            disabled={playMutation.isPending || (!isUnlimited && data.remaining_plays <= 0)}
            onClick={handlePlay}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-900"
          >
            {playMutation.isPending ? "굴리는 중..." : "주사위 던지기"}
          </button>
          {result && <p className="text-sm text-emerald-100">결과: {result}</p>}
          {infoMessage && <p className="text-xs text-emerald-200">{infoMessage}</p>}
          <p className="text-xs text-slate-400">일일 제한이 0이면 무제한으로 간주합니다.</p>
        </div>
      </section>
    );
  })();

  return <FeatureGate feature="DICE">{content}</FeatureGate>;
};

export default DicePage;

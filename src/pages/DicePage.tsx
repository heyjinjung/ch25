// src/pages/DicePage.tsx
import React, { useState } from "react";
import DiceView from "../components/game/DiceView";
import { useDiceStatus, usePlayDice } from "../hooks/useDice";

const DicePage: React.FC = () => {
  const { data, isLoading, isError } = useDiceStatus();
  const playMutation = usePlayDice();
  const [result, setResult] = useState<"WIN" | "LOSE" | "DRAW" | null>(null);
  const [userDice, setUserDice] = useState<number[]>([]);
  const [dealerDice, setDealerDice] = useState<number[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

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
        <p className="text-sm text-slate-300">남은 횟수: {data.remaining_plays}회</p>
      </header>

      <DiceView userDice={userDice} dealerDice={dealerDice} result={result} />

      <div className="space-y-3 text-center">
        {!!playMutation.error && <p className="text-sm text-red-200">주사위를 던질 수 없습니다. 잠시 후 다시 시도해주세요.</p>}
        <button
          type="button"
          disabled={playMutation.isPending || data.remaining_plays <= 0}
          onClick={handlePlay}
          className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-900"
        >
          {playMutation.isPending ? "굴리는 중..." : "주사위 던지기"}
        </button>
        {result && <p className="text-sm text-emerald-100">결과: {result}</p>}
        {infoMessage && <p className="text-xs text-emerald-200">{infoMessage}</p>}
        <p className="text-xs text-slate-400">TODO: API 에러 코드에 맞춘 메시지 처리 추가</p>
      </div>
    </section>
  );
};

export default DicePage;

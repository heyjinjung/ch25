// src/pages/RoulettePage.tsx
import React, { useMemo, useState } from "react";
import RouletteWheel from "../components/game/RouletteWheel";
import { usePlayRoulette, useRouletteStatus } from "../hooks/useRoulette";
import FeatureGate from "../components/feature/FeatureGate";

const RoulettePage: React.FC = () => {
  const { data, isLoading, isError, error } = useRouletteStatus();
  const playMutation = usePlayRoulette();
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(undefined);

  const segmentLabels = useMemo(() => data?.segments.map((segment) => segment.label) ?? [], [data?.segments]);

  const errorMessage = useMemo(() => {
    if (!error) return undefined;
    return "룰렛 정보를 불러오지 못했습니다.";
  }, [error]);

  const playErrorMessage = useMemo(() => {
    if (!playMutation.error) return undefined;
    return "룰렛을 진행할 수 없습니다. 잠시 후 다시 시도해주세요.";
  }, [playMutation.error]);

  const handlePlay = async () => {
    try {
      const result = await playMutation.mutateAsync();
      setSelectedIndex(result.selected_index);
    } catch (e) {
      console.error("Roulette play failed", e);
    }
  };

  const content = (() => {
    if (isLoading) {
      return (
        <section className="rounded-xl border border-emerald-800/40 bg-slate-900/60 p-6 text-center shadow-lg shadow-emerald-900/30">
          <p className="text-lg font-semibold text-emerald-200">룰렛 상태를 불러오는 중...</p>
        </section>
      );
    }

    if (isError || !data) {
      return (
        <section className="rounded-xl border border-red-800/40 bg-red-950/60 p-6 text-center text-red-100 shadow-lg shadow-red-900/30">
          <p className="text-lg font-semibold">{errorMessage ?? "데이터를 불러올 수 없습니다."}</p>
        </section>
      );
    }

    return (
      <section className="space-y-6 rounded-xl border border-emerald-800/40 bg-slate-900/60 p-6 shadow-lg shadow-emerald-900/30">
        <header className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">오늘의 이벤트</p>
          <h2 className="text-2xl font-bold text-emerald-100">룰렛</h2>
          <p className="text-sm text-slate-300">남은 횟수: {data.remaining_spins}회</p>
        </header>

        <RouletteWheel segments={segmentLabels} isSpinning={playMutation.isPending} selectedIndex={selectedIndex} />

        <div className="space-y-3 text-center">
          {playErrorMessage && <p className="text-sm text-red-200">{playErrorMessage}</p>}
          <button
            type="button"
            disabled={playMutation.isPending || data.remaining_spins <= 0}
            onClick={handlePlay}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-900"
          >
            {playMutation.isPending ? "회전 중..." : "룰렛 돌리기"}
          </button>
          {playMutation.data && (
            <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/40 px-4 py-3 text-emerald-50">
              <p className="text-lg font-semibold">결과: {playMutation.data.segment.label}</p>
              {playMutation.data.reward_type && (
                <p className="text-sm text-emerald-100">
                  보상: {playMutation.data.reward_type} {playMutation.data.reward_value}
                </p>
              )}
              {playMutation.data.message && <p className="text-sm text-emerald-200">{playMutation.data.message}</p>}
              <p className="text-xs text-emerald-200">남은 횟수: {playMutation.data.remaining_spins}회</p>
            </div>
          )}
          <p className="text-xs text-slate-400">TODO: 실제 API 에러코드에 따른 상세 메시지 매핑 추가</p>
        </div>
      </section>
    );
  })();

  return <FeatureGate feature="ROULETTE">{content}</FeatureGate>;
};

export default RoulettePage;

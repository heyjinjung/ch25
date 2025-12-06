// src/pages/SeasonPassPage.tsx
import React, { useMemo } from "react";
import { useClaimSeasonReward, useSeasonPassStatus } from "../hooks/useSeasonPass";
import FeatureGate from "../components/feature/FeatureGate";

const SeasonPassPage: React.FC = () => {
  const { data, isLoading, isError } = useSeasonPassStatus();
  const claimMutation = useClaimSeasonReward();

  const progressPercent = useMemo(() => {
    if (!data) return 0;
    const totalXp = data.next_level_xp || 1;
    return Math.min(100, Math.round((data.current_xp / totalXp) * 100));
  }, [data]);

  const content = (() => {
    if (isLoading) {
      return (
        <section className="rounded-xl border border-emerald-800/40 bg-slate-900/60 p-6 text-center text-emerald-100 shadow-lg shadow-emerald-900/30">
          시즌 패스 정보를 불러오는 중입니다...
        </section>
      );
    }

    if (isError) {
      return (
        <section className="rounded-xl border border-red-800/40 bg-red-950/60 p-6 text-center text-red-100 shadow-lg shadow-red-900/30">
          시즌 패스 정보를 가져오지 못했습니다.
        </section>
      );
    }

    if (!data) {
      return (
        <section className="space-y-3 rounded-xl border border-emerald-800/40 bg-slate-900/60 p-6 text-center text-slate-200 shadow-lg shadow-emerald-900/30">
          <p className="text-lg font-semibold text-emerald-100">현재 진행 중인 시즌 패스가 없습니다.</p>
          <p className="text-sm text-slate-300">관리자에서 시즌을 활성화하면 이 화면에서 진행도를 확인할 수 있습니다.</p>
        </section>
      );
    }

    return (
      <section className="space-y-6 rounded-xl border border-emerald-800/40 bg-slate-900/70 p-6 text-slate-100 shadow-lg shadow-emerald-900/40">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Season Pass</p>
          <h1 className="text-2xl font-bold text-emerald-100">이번 시즌 진행도</h1>
          <p className="text-sm text-slate-300">
            현재 레벨 {data.current_level} / {data.max_level}, 경험치 {data.current_xp} / {data.next_level_xp}
          </p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-emerald-950/70">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.levels.map((level) => {
            const isCurrent = level.level === data.current_level;
            const canClaim = level.is_unlocked && !level.is_claimed;
            return (
              <article
                key={level.level}
                className={`rounded-xl border p-4 transition ${
                  canClaim
                    ? "border-emerald-400 bg-emerald-900/30 shadow-lg shadow-emerald-900/30"
                    : "border-emerald-800/40 bg-slate-900/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-emerald-100">레벨 {level.level}</h3>
                  {level.is_claimed ? (
                    <span className="rounded-full bg-emerald-700/60 px-3 py-1 text-xs font-semibold text-emerald-50">수령 완료</span>
                  ) : level.is_unlocked ? (
                    <span className="rounded-full bg-emerald-500/80 px-3 py-1 text-xs font-semibold text-emerald-50">달성</span>
                  ) : (
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">잠금</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-200">보상: {level.reward_label}</p>
                <p className="text-xs text-slate-400">필요 XP: {level.required_xp}</p>
                {isCurrent && <p className="mt-1 text-xs text-emerald-200">현재 진행 중</p>}
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={!canClaim || claimMutation.isPending}
                    onClick={() => claimMutation.mutate(level.level)}
                    className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-900"
                  >
                    {level.is_claimed ? "수령 완료" : canClaim ? "보상 수령하기" : "수령 불가"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  })();

  return <FeatureGate feature="SEASON_PASS">{content}</FeatureGate>;
};

export default SeasonPassPage;

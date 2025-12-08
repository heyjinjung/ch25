// src/pages/SeasonPassPage.tsx
import { useMemo } from "react";
import { useClaimSeasonReward, useSeasonPassStatus } from "../hooks/useSeasonPass";
import FeatureGate from "../components/feature/FeatureGate";

const SeasonPassPage: React.FC = () => {
  const { data, isLoading, isError } = useSeasonPassStatus();
  const claimMutation = useClaimSeasonReward();

  const safeCurrentXp = data?.current_xp ?? 0;
  const safeNextLevelXp = data?.next_level_xp ?? 0;
  const safeCurrentLevel = data?.current_level ?? 0;
  const safeMaxLevel = data?.max_level ?? 0;
  const safeLevels = data?.levels ?? [];

  const progressPercent = useMemo(() => {
    if (!data) return 0;
    const totalXp = data.next_level_xp || 1;
    return Math.min(100, Math.round(((data.current_xp ?? 0) / totalXp) * 100));
  }, [data]);

  const content = (() => {
    if (isLoading) {
      return (
        <section className="flex flex-col items-center justify-center rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 shadow-2xl">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="mt-4 text-lg font-semibold text-emerald-200">시즌패스를 불러오는 중...</p>
        </section>
      );
    }

    if (isError) {
      return (
        <section className="rounded-3xl border border-red-800/40 bg-gradient-to-br from-red-950 to-slate-900 p-8 text-center shadow-2xl">
          <div className="mb-4 text-5xl">😢</div>
          <p className="text-xl font-bold text-red-100">시즌패스 정보를 불러오지 못했습니다.</p>
          <p className="mt-2 text-sm text-red-200/70">잠시 후 다시 시도해주세요.</p>
        </section>
      );
    }

    if (!data) {
      return (
        <section className="rounded-3xl border border-slate-700/40 bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center shadow-2xl">
          <div className="mb-4 text-6xl">🎄</div>
          <p className="text-xl font-bold text-slate-100">진행 중인 시즌패스가 없습니다.</p>
          <p className="mt-3 text-sm text-slate-400">관리자에게 시즌을 시작해달라고 요청해주세요.</p>
        </section>
      );
    }

    return (
        <section className="space-y-8 rounded-3xl border border-gold-600/30 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 shadow-2xl">
        <header className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-gold-400">Season Pass</p>
          <h1 className="mt-2 text-3xl font-bold text-white">크리스마스 시즌패스</h1>
        </header>

        <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-900/60 to-slate-900/80 p-6 shadow-lg">
          <div className="absolute -right-8 -top-8 text-[120px] opacity-5">⭐</div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">현재 레벨</p>
                <p className="text-5xl font-black text-white">{safeCurrentLevel}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400">최대 레벨</p>
                <p className="text-2xl font-bold text-slate-300">{safeMaxLevel}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gold-400">{safeCurrentXp.toLocaleString()} XP</p>
                <p className="text-xs text-slate-400">/ {(safeNextLevelXp || 0).toLocaleString()} XP</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="h-4 w-full overflow-hidden rounded-full bg-slate-800/80">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-gold-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>레벨 {data.current_level}</span>
                <span className="font-semibold text-emerald-300">{progressPercent}%</span>
                <span>레벨 {safeCurrentLevel + 1}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-gold-400">레벨별 보상</h3>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {safeLevels.map((level) => {
              const isCurrent = level.level === safeCurrentLevel;
              const canClaim = level.is_unlocked && !level.is_claimed;
              const isLocked = !level.is_unlocked;

              return (
                <article
                  key={level.level}
                  className={`relative overflow-hidden rounded-2xl border-2 p-5 transition-all ${
                    canClaim
                      ? "border-gold-500/70 bg-gradient-to-br from-gold-900/30 to-emerald-900/30 shadow-lg shadow-gold-500/20 animate-pulse-glow"
                      : level.is_claimed
                      ? "border-emerald-600/40 bg-emerald-900/20"
                      : isLocked
                      ? "border-slate-700/30 bg-slate-900/40 opacity-60"
                      : "border-emerald-700/40 bg-slate-800/40"
                  }`}
                >
                  <div
                    className={`absolute -right-2 -top-2 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${
                      canClaim
                        ? "bg-gradient-to-br from-gold-500 to-gold-600 text-white shadow-lg"
                        : level.is_claimed
                        ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
                        : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {level.level}
                  </div>

                  <div className="mb-3 text-3xl">
                    {level.is_claimed ? "✅" : canClaim ? "🎁" : isLocked ? "🔒" : "⭐"}
                  </div>

                  <h3 className={`text-lg font-semibold ${canClaim ? "text-gold-300" : "text-white"}`}>레벨 {level.level} 보상</h3>
                  <p className="mt-1 text-sm text-slate-300">{level.reward_label}</p>
                  <p className="mt-1 text-xs text-slate-500">필요 XP: {(level.required_xp ?? 0).toLocaleString()}</p>

                  {isCurrent && !level.is_claimed && (
                    <p className="mt-2 inline-block rounded-full bg-emerald-800/50 px-3 py-1 text-xs font-semibold text-emerald-300">
                      현재 진행 중
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={!canClaim || claimMutation.isPending}
                    onClick={() => claimMutation.mutate(level.level)}
                    className={`mt-4 w-full rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                      canClaim
                        ? "bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-lg hover:from-gold-400 hover:to-gold-500"
                        : level.is_claimed
                        ? "bg-emerald-800/50 text-emerald-300 cursor-default"
                        : "bg-slate-700/50 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {claimMutation.isPending && claimMutation.variables === level.level ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        수령 중...
                      </span>
                    ) : level.is_claimed ? (
                      "이미 수령"
                    ) : canClaim ? (
                      "보상 수령"
                    ) : (
                      "잠김"
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        </div>

        <footer className="border-t border-slate-700/50 pt-4 text-center text-xs text-slate-400">
          <p>게임 참여/입금 기록으로 XP를 모아 레벨을 올리고 보상을 받아보세요.</p>
        </footer>
      </section>
    );
  })();

  return <FeatureGate feature="SEASON_PASS">{content}</FeatureGate>;
};

export default SeasonPassPage;

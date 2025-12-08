import React, { useMemo } from "react";
import { useTodayRanking } from "../hooks/useRanking";
import { useSeasonPassStatus, useInternalWinStatus, useClaimSeasonReward } from "../hooks/useSeasonPass";
import FeatureGate from "../components/feature/FeatureGate";

const formatCurrency = (value: number) => value.toLocaleString();

const SeasonPassPage: React.FC = () => {
  const season = useSeasonPassStatus();
  const ranking = useTodayRanking();
  const internalWins = useInternalWinStatus();
  const claimMutation = useClaimSeasonReward();

  const progress = useMemo(() => {
    if (!season.data) return { percent: 0, nextLabel: "" };
    const total = season.data.next_level_xp || 1;
    const percent = Math.min(100, Math.round(((season.data.current_xp ?? 0) / total) * 100));
    return {
      percent,
      nextLabel: `다음 레벨까지 ${(total - (season.data.current_xp ?? 0)).toLocaleString()} XP 필요`,
    };
  }, [season.data]);

  const nextReward = useMemo(() => {
    if (!season.data) return null;
    const upcoming = season.data.levels.find((lvl) => !lvl.is_claimed && lvl.is_unlocked);
    if (upcoming) return `레벨 ${upcoming.level} 보상: ${upcoming.reward_label}`;
    const locked = season.data.levels.find((lvl) => !lvl.is_unlocked);
    if (locked) return `레벨 ${locked.level} 보상(잠금): ${locked.reward_label}`;
    return "모든 보상 수령 완료";
  }, [season.data]);

  const external = ranking.data?.my_external_entry;
  const top10Needed = external?.rank && external.rank > 10 ? external.rank - 10 : 0;
  const deposit = external?.deposit_amount ?? 0;
  const depositRemainder = 100_000 - (deposit % 100_000 || 100_000);
  const playDone = (external?.play_count ?? 0) > 0;

  const cards = [
    {
      title: "외부 랭킹 TOP10",
      desc: "순위가 10위 안에 들면 스탬프 1개",
      status: external?.rank ? `현재 ${external.rank}위${top10Needed > 0 ? `, ${top10Needed}위 상승 필요` : " (완료)"}` : "랭킹 데이터 없음",
    },
    {
      title: "외부 사이트 첫 이용",
      desc: "플레이 수 0→1이 되면 스탬프 1개",
      status: playDone ? "완료" : "미완료",
    },
    {
      title: "외부 입금 10만원마다",
      desc: "10만원 달성할 때마다 스탬프 1개",
      status: `누적 ${formatCurrency(deposit)}원 / 다음까지 ${depositRemainder === 100_000 ? "0" : formatCurrency(depositRemainder)}원`,
    },
    {
      title: "내부 게임 승리 50회",
      desc: "승리 누적 50회 달성 시 스탬프 1개",
      status: internalWins.data
        ? `누적 승리 ${internalWins.data.total_wins}회 / 남은 ${internalWins.data.remaining}회`
        : internalWins.isLoading
        ? "집계 중..."
        : "집계 실패",
    },
  ];

  if (season.isLoading) {
    return (
      <FeatureGate feature="SEASON_PASS">
        <section className="flex flex-col items-center justify-center rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-10 shadow-2xl">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="mt-4 text-lg font-semibold text-emerald-200">시즌패스 불러오는 중...</p>
        </section>
      </FeatureGate>
    );
  }

  if (season.isError || !season.data) {
    return (
      <FeatureGate feature="SEASON_PASS">
        <section className="rounded-3xl border border-red-800/40 bg-gradient-to-br from-red-950 to-slate-900 p-8 text-center shadow-2xl">
          <div className="mb-4 text-5xl">⚠️</div>
          <p className="text-xl font-bold text-red-100">시즌패스를 불러오지 못했습니다.</p>
          <p className="mt-2 text-sm text-red-200/70">잠시 후 다시 시도하거나 관리자에게 문의해주세요.</p>
        </section>
      </FeatureGate>
    );
  }

  const data = season.data;

  return (
    <FeatureGate feature="SEASON_PASS">
      <section className="space-y-8 rounded-3xl border border-gold-600/30 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 shadow-2xl">
        <header className="text-center space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-gold-400">Season Pass</p>
          <h1 className="text-3xl font-bold text-white">크리스마스 시즌패스</h1>
          <p className="text-sm text-emerald-100">스탬프를 모아 XP를 올리고 보상을 받으세요.</p>
        </header>

        <div className="rounded-2xl border border-emerald-600/40 bg-slate-900/70 p-6 shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-300">현재 레벨</p>
              <p className="text-4xl font-black text-white">{data.current_level}</p>
              <p className="text-xs text-slate-400">최대 레벨 {data.max_level}</p>
            </div>
            <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>{data.current_xp.toLocaleString()} XP</span>
              <span>{progress.nextLabel}</span>
              <span>{data.next_level_xp.toLocaleString()} XP</span>
            </div>
              <div className="mt-2 h-4 w-full overflow-hidden rounded-full bg-slate-800/80">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-gold-400 transition-all duration-500"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="mt-2 text-xs font-semibold text-emerald-200">진행률 {progress.percent}%</div>
            </div>
            <div className="text-right text-sm text-slate-200">{nextReward}</div>
          </div>
        </div>

        <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">스탬프 받는 방법</h2>
            <span className="rounded-full bg-emerald-900/60 px-3 py-1 text-xs text-emerald-200">
              오늘 스탬프: {data.today?.stamped ? "완료" : "미완료"}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {cards.map((card) => (
              <div key={card.title} className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4 shadow">
                <h3 className="text-base font-semibold text-white">{card.title}</h3>
                <p className="text-sm text-slate-300">{card.desc}</p>
                <p className="mt-2 text-sm font-semibold text-emerald-200">{card.status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">레벨 보상</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.levels.map((level) => {
              const canClaim = level.is_unlocked && !level.is_claimed;
              return (
                <article
                  key={level.level}
                  className={`rounded-xl border p-4 shadow transition-all ${
                    canClaim
                      ? "border-gold-500/70 bg-gradient-to-br from-gold-900/20 to-emerald-900/20"
                      : level.is_claimed
                      ? "border-emerald-600/40 bg-emerald-900/20"
                      : "border-slate-700/40 bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">레벨 {level.level}</span>
                    <span className="text-xs text-slate-400">필요 XP {level.required_xp.toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-100">{level.reward_label}</p>
                  <button
                    type="button"
                    disabled={!canClaim}
                    onClick={() => claimMutation.mutate(level.level)}
                    className={`mt-3 w-full rounded-full px-3 py-2 text-sm font-bold transition ${
                      canClaim
                        ? "bg-gradient-to-r from-gold-500 to-gold-600 text-white hover:from-gold-400 hover:to-gold-500"
                        : "bg-slate-700/60 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {level.is_claimed ? "수령 완료" : canClaim ? "보상 수령" : "잠금"}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </FeatureGate>
  );
};

export default SeasonPassPage;

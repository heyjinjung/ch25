// src/pages/RankingPage.tsx
import { useTodayRanking } from "../hooks/useRanking";
import FeatureGate from "../components/feature/FeatureGate";

const getMedalEmoji = (rank: number): string => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
};

const RankingPage: React.FC = () => {
  const { data, isLoading, isError, error } = useTodayRanking(100);

  const content = (() => {
    if (isLoading) {
      return (
        <section className="flex flex-col items-center justify-center rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 shadow-2xl">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="mt-4 text-lg font-semibold text-emerald-200">랭킹 불러오는 중...</p>
        </section>
      );
    }

    if (isError || !data) {
      return (
        <section className="rounded-3xl border border-red-800/40 bg-gradient-to-br from-red-950 to-slate-900 p-8 text-center shadow-2xl">
          <div className="mb-4 text-5xl">😢</div>
          <p className="text-xl font-bold text-red-100">{error ? String(error) : "랭킹을 불러오지 못했습니다."}</p>
          <p className="mt-2 text-sm text-red-200/70">잠시 후 다시 시도해주세요</p>
        </section>
      );
    }

    const externalEntries = data.external_entries ?? [];
    const myExternal = data.my_external_entry;

    return (
      <section className="space-y-8 rounded-3xl border border-gold-600/30 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 shadow-2xl">
        <header className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-gold-400">오늘의 외부 랭킹</p>
          <h1 className="mt-2 text-3xl font-bold text-white">{data.date} 외부 데이터</h1>
          <p className="mt-2 text-sm text-slate-400">입금액 / 게임횟수 기준으로 정렬됩니다.</p>
        </header>

        {myExternal && (
          <div className="rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-900/60 to-slate-900/80 p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl font-bold text-white shadow-lg">
                {getMedalEmoji(myExternal.rank)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">내 순위</p>
                <p className="text-lg font-bold text-white">User #{myExternal.user_id}</p>
                <p className="text-sm text-gold-300">
                  입금 {myExternal.deposit_amount.toLocaleString()} / 게임 {myExternal.play_count.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-gold-400">
            외부 랭킹 리스트
          </h3>

          {externalEntries.length === 0 ? (
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-8 text-center text-slate-300">
              아직 외부 랭킹 데이터가 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {externalEntries.map((entry) => (
                <div
                  key={entry.rank}
                  className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-900/70 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-slate-100">
                      {getMedalEmoji(entry.rank)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">User #{entry.user_id}</p>
                      {entry.memo && <p className="text-xs text-slate-400">{entry.memo}</p>}
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-200">
                    <p>입금: {entry.deposit_amount.toLocaleString()}</p>
                    <p>게임횟수: {entry.play_count.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  })();

  return <FeatureGate feature="RANKING">{content}</FeatureGate>;
};

export default RankingPage;

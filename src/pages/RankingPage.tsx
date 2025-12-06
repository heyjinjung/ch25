// src/pages/RankingPage.tsx
import { useTodayRanking } from "../hooks/useRanking";
import FeatureGate from "../components/feature/FeatureGate";

const getMedalEmoji = (rank: number): string => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
};

const getRankStyle = (rank: number): string => {
  if (rank === 1) return "bg-gradient-to-r from-gold-500/30 to-gold-600/20 border-gold-500/50";
  if (rank === 2) return "bg-gradient-to-r from-slate-400/20 to-slate-500/10 border-slate-400/50";
  if (rank === 3) return "bg-gradient-to-r from-amber-700/20 to-amber-800/10 border-amber-700/50";
  return "border-slate-700/30";
};

const RankingPage: React.FC = () => {
  const { data, isLoading, isError, error } = useTodayRanking(10);

  const content = (() => {
    if (isLoading) {
      return (
        <section className="flex flex-col items-center justify-center rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 shadow-2xl">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="mt-4 text-lg font-semibold text-emerald-200">랭킹을 불러오는 중...</p>
        </section>
      );
    }

    if (isError || !data) {
      return (
        <section className="rounded-3xl border border-red-800/40 bg-gradient-to-br from-red-950 to-slate-900 p-8 text-center shadow-2xl">
          <div className="mb-4 text-5xl">😢</div>
          <p className="text-xl font-bold text-red-100">{error ? String(error) : "랭킹 정보를 불러올 수 없습니다."}</p>
          <p className="mt-2 text-sm text-red-200/70">잠시 후 다시 시도해주세요</p>
        </section>
      );
    }

    return (
      <section className="space-y-8 rounded-3xl border border-gold-600/30 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 shadow-2xl">
        {/* Header */}
        <header className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-gold-400">🏆 오늘의 순위</p>
          <h1 className="mt-2 text-3xl font-bold text-white">{data.date} 랭킹</h1>
          <p className="mt-2 text-sm text-slate-400">매일 자정에 초기화됩니다</p>
        </header>

        {/* My ranking card */}
        {data.my_entry && (
          <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-900/60 to-slate-900/80 p-6 shadow-lg">
            <div className="absolute -right-4 -top-4 text-8xl opacity-10">🎯</div>
            <div className="relative flex items-center gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-3xl font-bold text-white shadow-lg">
                {getMedalEmoji(data.my_entry.rank)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">내 순위</p>
                <p className="text-2xl font-bold text-white">{data.my_entry.user_name}</p>
                {data.my_entry.score !== undefined && (
                  <p className="mt-1 text-lg text-gold-400 font-semibold">{data.my_entry.score.toLocaleString()} 포인트</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-5xl font-black text-emerald-300">#{data.my_entry.rank}</p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="space-y-3">
          <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-gold-400">
            🎄 TOP 10 리더보드
          </h3>
          
          {data.entries.length === 0 ? (
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-8 text-center">
              <div className="text-5xl mb-4">🎮</div>
              <p className="text-lg text-slate-300">아직 랭킹 데이터가 없습니다.</p>
              <p className="mt-2 text-sm text-slate-400">게임에 참여하여 첫 번째 랭커가 되어보세요!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.entries.map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center gap-4 rounded-xl border p-4 transition-all hover:scale-[1.02] ${getRankStyle(entry.rank)}`}
                >
                  {/* Rank */}
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${
                    entry.rank <= 3 
                      ? "bg-gradient-to-br from-gold-500/80 to-gold-700/80 text-white" 
                      : "bg-slate-700/50 text-slate-300"
                  }`}>
                    {getMedalEmoji(entry.rank)}
                  </div>
                  
                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <p className={`truncate font-semibold ${entry.rank <= 3 ? "text-white" : "text-slate-200"}`}>
                      {entry.user_name}
                    </p>
                    {entry.rank === 1 && (
                      <p className="text-xs text-gold-400">👑 오늘의 챔피언</p>
                    )}
                  </div>
                  
                  {/* Score */}
                  <div className="text-right">
                    <p className={`text-lg font-bold ${entry.rank <= 3 ? "text-gold-300" : "text-emerald-300"}`}>
                      {entry.score?.toLocaleString() ?? "-"}
                    </p>
                    <p className="text-xs text-slate-400">포인트</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info footer */}
        <footer className="border-t border-slate-700/50 pt-4 text-center text-xs text-slate-400">
          <p>💡 미니게임 참여로 포인트를 획득하고 순위에 도전하세요!</p>
        </footer>
      </section>
    );
  })();

  return <FeatureGate feature="RANKING">{content}</FeatureGate>;
};

export default RankingPage;

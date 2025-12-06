// src/pages/RankingPage.tsx
import React from "react";
import { useTodayRanking } from "../hooks/useRanking";
import FeatureGate from "../components/feature/FeatureGate";

const RankingPage: React.FC = () => {
  const { data, isLoading, isError, error } = useTodayRanking(10);

  const content = (() => {
    if (isLoading) {
      return (
        <section className="rounded-xl border border-emerald-800/40 bg-slate-900/60 p-6 text-center text-emerald-100 shadow-lg shadow-emerald-900/30">
          오늘의 랭킹을 불러오는 중입니다...
        </section>
      );
    }

    if (isError || !data) {
      return (
        <section className="rounded-xl border border-red-800/40 bg-red-950/60 p-6 text-center text-red-100 shadow-lg shadow-red-900/30">
          {error ? String(error) : "랭킹 정보를 불러올 수 없습니다."}
        </section>
      );
    }

    return (
      <section className="space-y-6 rounded-xl border border-emerald-800/40 bg-slate-900/70 p-6 text-slate-100 shadow-lg shadow-emerald-900/30">
        <header className="space-y-1 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">오늘의 Top 10</p>
          <h1 className="text-2xl font-bold text-emerald-100">{data.date} 랭킹</h1>
          <p className="text-sm text-slate-300">매일 갱신되는 순위를 확인하세요.</p>
        </header>

        {data.my_entry && (
          <div className="rounded-xl border border-emerald-700/60 bg-emerald-900/40 p-4 text-emerald-50">
            <p className="text-sm font-semibold text-emerald-200">내 순위</p>
            <p className="text-xl font-bold">#{data.my_entry.rank}</p>
            <p className="text-sm text-emerald-100">{data.my_entry.user_name}</p>
            {data.my_entry.score !== undefined && <p className="text-xs text-emerald-200">점수: {data.my_entry.score}</p>}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-emerald-800/50 bg-slate-950/60">
          <table className="min-w-full divide-y divide-emerald-800/40 text-left">
            <thead className="bg-slate-900/60 text-emerald-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold">순위</th>
                <th className="px-4 py-3 text-sm font-semibold">유저명</th>
                <th className="px-4 py-3 text-sm font-semibold">점수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-800/30 text-slate-100">
              {data.entries.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-slate-300">
                    아직 랭킹 데이터가 없습니다.
                  </td>
                </tr>
              )}
              {data.entries.map((entry) => (
                <tr key={entry.rank} className="hover:bg-emerald-900/20">
                  <td className="px-4 py-3 text-sm font-semibold">#{entry.rank}</td>
                  <td className="px-4 py-3 text-sm">{entry.user_name}</td>
                  <td className="px-4 py-3 text-sm">{entry.score ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  })();

  return <FeatureGate feature="RANKING">{content}</FeatureGate>;
};

export default RankingPage;

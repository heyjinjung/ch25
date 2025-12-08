import React from "react";
import { GAME_TOKEN_LABELS, GameTokenType } from "../../types/gameTokens";

const mockLedger: { id: number; user_id: number; token_type: GameTokenType; delta: number; reason: string; created_at: string }[] = [
  { id: 1, user_id: 999, token_type: "ROULETTE_COIN", delta: 50, reason: "테스트 지급 예시", created_at: "2025-12-08 10:00" },
  { id: 2, user_id: 999, token_type: "ROULETTE_COIN", delta: -10, reason: "플레이 차감 예시", created_at: "2025-12-08 10:05" },
];

const mockPlayLogs: { id: number; user_id: number; game: string; reward: string; created_at: string }[] = [
  { id: 101, user_id: 999, game: "Roulette", reward: "NONE", created_at: "2025-12-08 10:05" },
  { id: 102, user_id: 999, game: "Dice", reward: "+100 GOLD", created_at: "2025-12-08 10:10" },
];

const GameTokenLogsPage: React.FC = () => {
  return (
    <section className="space-y-6 rounded-xl border border-emerald-800/40 bg-slate-900/70 p-6 shadow-lg shadow-emerald-900/30">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-100">코인 로그 / 회수</h1>
        <p className="text-sm text-slate-300">추후 백엔드 연동 시 실제 로그를 보여줄 예정이며, 현재는 레이아웃/필드 예시입니다.</p>
      </header>

      <div className="space-y-4 rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">코인 원장</h2>
          <button
            type="button"
            className="rounded-md border border-amber-600/50 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:bg-amber-600/10"
          >
            TODO: API 연동
          </button>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">user_id</th>
                <th className="px-2 py-2">토큰</th>
                <th className="px-2 py-2">증감</th>
                <th className="px-2 py-2">사유</th>
                <th className="px-2 py-2">시각</th>
              </tr>
            </thead>
            <tbody>
              {mockLedger.map((row) => (
                <tr key={row.id} className="border-b border-slate-800/60">
                  <td className="px-2 py-2">{row.id}</td>
                  <td className="px-2 py-2">{row.user_id}</td>
                  <td className="px-2 py-2">{GAME_TOKEN_LABELS[row.token_type]}</td>
                  <td className={`px-2 py-2 font-semibold ${row.delta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {row.delta > 0 ? `+${row.delta}` : row.delta}
                  </td>
                  <td className="px-2 py-2">{row.reason}</td>
                  <td className="px-2 py-2 text-slate-400">{row.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">최근 플레이 로그</h2>
          <button
            type="button"
            className="rounded-md border border-amber-600/50 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:bg-amber-600/10"
          >
            TODO: API 연동
          </button>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">user_id</th>
                <th className="px-2 py-2">게임</th>
                <th className="px-2 py-2">보상</th>
                <th className="px-2 py-2">시각</th>
              </tr>
            </thead>
            <tbody>
              {mockPlayLogs.map((row) => (
                <tr key={row.id} className="border-b border-slate-800/60">
                  <td className="px-2 py-2">{row.id}</td>
                  <td className="px-2 py-2">{row.user_id}</td>
                  <td className="px-2 py-2">{row.game}</td>
                  <td className="px-2 py-2">{row.reward}</td>
                  <td className="px-2 py-2 text-slate-400">{row.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-rose-700/50 bg-rose-950/30 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">코인 회수</h2>
          <span className="text-xs text-rose-200">API 연동 시 트랜잭션/감사 로그 필수</span>
        </div>
        <p className="text-sm text-rose-100">회수 기능은 백엔드 확정 후 연결합니다. (예: user_id + token_type + amount, 이유 필수)</p>
        <button
          type="button"
          className="w-full rounded-md border border-rose-600/60 px-4 py-2 text-sm font-bold text-rose-100 transition hover:bg-rose-700/20"
        >
          TODO: 회수 API 연동
        </button>
      </div>
    </section>
  );
};

export default GameTokenLogsPage;

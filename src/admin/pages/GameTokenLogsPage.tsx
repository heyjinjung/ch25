import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchRecentPlayLogs,
  fetchWallets,
  fetchLedger,
  LedgerEntry,
  PlayLogEntry,
  revokeGameTokens,
  RevokeGameTokensPayload,
  TokenBalance,
} from "../api/adminGameTokenApi";
import { GAME_TOKEN_LABELS, GameTokenType } from "../../types/gameTokens";

const tokenOptions: GameTokenType[] = ["ROULETTE_COIN", "DICE_TOKEN", "LOTTERY_TICKET"];

const GameTokenLogsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filterExternalId, setFilterExternalId] = useState<string | undefined>();
  const [playLogFilterId, setPlayLogFilterId] = useState<string | undefined>();
  const [playLogPage, setPlayLogPage] = useState(1);
  const PLAY_LOG_LIMIT = 50;

  const [revokeExternalId, setRevokeExternalId] = useState<string | undefined>();
  const [revokeTokenType, setRevokeTokenType] = useState<GameTokenType>("ROULETTE_COIN");
  const [revokeAmount, setRevokeAmount] = useState<number>(0);

  const walletsQuery = useQuery<TokenBalance[], unknown>({
    queryKey: ["admin-wallets", filterExternalId],
    queryFn: () => fetchWallets(filterExternalId),
  });

  const playLogsQuery = useQuery<PlayLogEntry[], unknown>({
    queryKey: ["admin-play-logs", playLogFilterId, playLogPage],
    queryFn: () => fetchRecentPlayLogs(PLAY_LOG_LIMIT, playLogFilterId, (playLogPage - 1) * PLAY_LOG_LIMIT),
  });

  const ledgerQuery = useQuery<LedgerEntry[], unknown>({
    queryKey: ["admin-ledger", filterExternalId],
    queryFn: () => fetchLedger(100, filterExternalId),
  });

  const revokeMutation = useMutation({
    mutationFn: (payload: RevokeGameTokensPayload) => revokeGameTokens(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wallets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ledger"] });
    },
  });

  const revokeDisabled = useMemo(() => !revokeExternalId || revokeAmount <= 0, [revokeExternalId, revokeAmount]);

  return (
    <section className="space-y-6 rounded-xl border border-emerald-800/40 bg-slate-900/70 p-6 shadow-lg shadow-emerald-900/30">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-100">티켓 로그 / 회수</h1>
        <p className="text-sm text-slate-300">external_id 기준으로 잔액, 플레이 로그, 원장을 확인하고 회수할 수 있습니다.</p>
      </header>

      {/* 잔액 */}
      <div className="space-y-3 rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-lg font-semibold text-white">지갑 잔액</p>
            <p className="text-xs text-slate-400">external_id로 필터링</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              placeholder="external_id 입력"
              className="w-48 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
              onChange={(e) => setFilterExternalId(e.target.value || undefined)}
            />
            <button
              type="button"
              onClick={() => walletsQuery.refetch()}
              className="rounded-md border border-emerald-600/60 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-700/20"
            >
              새로고침
            </button>
          </div>
        </div>
        {walletsQuery.isError && (
          <p className="rounded-md border border-rose-600/40 bg-rose-950/40 p-2 text-sm text-rose-100">잔액 조회 실패</p>
        )}
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-2 py-2">id</th>
                <th className="px-2 py-2">토큰</th>
                <th className="px-2 py-2">잔액</th>
              </tr>
            </thead>
            <tbody>
              {walletsQuery.data?.map((row) => (
                <tr key={`${row.user_id}-${row.token_type}`} className="border-b border-slate-800/60">
                  <td className="px-2 py-2">{row.external_id ?? row.user_id}</td>
                  <td className="px-2 py-2">{GAME_TOKEN_LABELS[row.token_type]}</td>
                  <td className="px-2 py-2 font-semibold text-emerald-200">{row.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {walletsQuery.isLoading && <p className="p-2 text-sm text-slate-400">불러오는 중...</p>}
          {!walletsQuery.isLoading && walletsQuery.data?.length === 0 && (
            <p className="p-2 text-sm text-slate-400">데이터가 없습니다.</p>
          )}
        </div>
      </div>

      {/* 플레이 로그 */}
      <div className="space-y-3 rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-lg font-semibold text-white">최근 플레이 로그</p>
            <p className="text-xs text-slate-400">external_id로 필터링</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              placeholder="external_id 입력"
              className="w-48 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
              onChange={(e) => setPlayLogFilterId(e.target.value || undefined)}
            />
            <button
              type="button"
              onClick={() => {
                setPlayLogPage(1);
                playLogsQuery.refetch();
              }}
              className="rounded-md border border-emerald-600/60 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-700/20"
            >
              새로고침
            </button>
          </div>
        </div>
        {playLogsQuery.isError && (
          <p className="rounded-md border border-rose-600/40 bg-rose-950/40 p-2 text-sm text-rose-100">플레이 로그 조회 실패</p>
        )}
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-2 py-2">game</th>
                <th className="px-2 py-2">id</th>
                <th className="px-2 py-2">reward</th>
                <th className="px-2 py-2">label</th>
                <th className="px-2 py-2">시각</th>
              </tr>
            </thead>
            <tbody>
              {playLogsQuery.data?.map((row) => (
                <tr key={`${row.game}-${row.id}`} className="border-b border-slate-800/60">
                  <td className="px-2 py-2">{row.game}</td>
                  <td className="px-2 py-2">{row.external_id ?? row.user_id}</td>
                  <td className="px-2 py-2">
                    {row.reward_type} {row.reward_amount}
                  </td>
                  <td className="px-2 py-2 text-slate-300">{row.reward_label ?? "-"}</td>
                  <td className="px-2 py-2 text-slate-400">{row.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {playLogsQuery.isLoading && <p className="p-2 text-sm text-slate-400">불러오는 중...</p>}
          {!playLogsQuery.isLoading && playLogsQuery.data?.length === 0 && (
            <p className="p-2 text-sm text-slate-400">데이터가 없습니다.</p>
          )}
          <div className="flex items-center justify-center gap-4 border-t border-slate-800/60 p-4">
            <button
              disabled={playLogPage === 1 || playLogsQuery.isLoading}
              onClick={() => setPlayLogPage((p) => Math.max(1, p - 1))}
              className="rounded px-3 py-1 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-sm text-slate-400">Page {playLogPage}</span>
            <button
              disabled={!playLogsQuery.data || playLogsQuery.data.length < PLAY_LOG_LIMIT || playLogsQuery.isLoading}
              onClick={() => setPlayLogPage((p) => p + 1)}
              className="rounded px-3 py-1 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>
      </div>

      {/* 원장 */}
      <div className="space-y-3 rounded-lg border border-slate-800/60 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-white">코인 원장</p>
          <button
            type="button"
            onClick={() => ledgerQuery.refetch()}
            className="rounded-md border border-emerald-600/60 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-700/20"
          >
            새로고침
          </button>
        </div>
        {ledgerQuery.isError && (
          <p className="rounded-md border border-rose-600/40 bg-rose-950/40 p-2 text-sm text-rose-100">원장 조회 실패</p>
        )}
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-2 py-2">id</th>
                <th className="px-2 py-2">external_id</th>
                <th className="px-2 py-2">토큰</th>
                <th className="px-2 py-2">증감</th>
                <th className="px-2 py-2">잔액</th>
                <th className="px-2 py-2">사유</th>
                <th className="px-2 py-2">라벨</th>
                <th className="px-2 py-2">시각</th>
              </tr>
            </thead>
            <tbody>
              {ledgerQuery.data?.map((row) => (
                <tr key={row.id} className="border-b border-slate-800/60">
                  <td className="px-2 py-2">{row.id}</td>
                  <td className="px-2 py-2">{row.external_id ?? row.user_id}</td>
                  <td className="px-2 py-2">{GAME_TOKEN_LABELS[row.token_type]}</td>
                  <td className={`px-2 py-2 ${row.delta >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{row.delta}</td>
                  <td className="px-2 py-2">{row.balance_after}</td>
                  <td className="px-2 py-2 text-slate-300">{row.reason ?? "-"}</td>
                  <td className="px-2 py-2 text-slate-300">{row.label ?? "-"}</td>
                  <td className="px-2 py-2 text-slate-400">{row.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {ledgerQuery.isLoading && <p className="p-2 text-sm text-slate-400">불러오는 중...</p>}
          {!ledgerQuery.isLoading && ledgerQuery.data?.length === 0 && (
            <p className="p-2 text-sm text-slate-400">원장 데이터가 없습니다.</p>
          )}
        </div>
      </div>

      {/* 회수 */}
      <div className="space-y-3 rounded-lg border border-rose-700/50 bg-rose-950/30 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">티켓 회수</h2>
          <span className="text-xs text-rose-200">잔액 부족 시 NOT_ENOUGH_TOKENS 반환</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder="external_id"
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-rose-400 focus:outline-none"
            onChange={(e) => setRevokeExternalId(e.target.value || undefined)}
          />
          <select
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-rose-400 focus:outline-none"
            value={revokeTokenType}
            onChange={(e) => setRevokeTokenType(e.target.value as GameTokenType)}
          >
            {tokenOptions.map((t) => (
              <option key={t} value={t}>
                {GAME_TOKEN_LABELS[t]}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="amount"
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-rose-400 focus:outline-none"
            onChange={(e) => setRevokeAmount(e.target.value ? Number(e.target.value) : 0)}
          />
        </div>
        {revokeMutation.isError && (
          <p className="rounded-md border border-rose-600/40 bg-rose-950/40 p-2 text-sm text-rose-100">
            {(revokeMutation.error as Error)?.message ?? "회수 실패"}
          </p>
        )}
        <button
          type="button"
          disabled={revokeDisabled || revokeMutation.isPending}
          onClick={() => {
            if (!revokeExternalId) return;
            revokeMutation.mutate({ external_id: revokeExternalId, token_type: revokeTokenType, amount: revokeAmount });
          }}
          className="w-full rounded-md border border-rose-600/60 px-4 py-2 text-sm font-bold text-rose-100 transition hover:bg-rose-700/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {revokeMutation.isPending ? "회수 중..." : "티켓 회수"}
        </button>
      </div>
    </section>
  );
};

export default GameTokenLogsPage;

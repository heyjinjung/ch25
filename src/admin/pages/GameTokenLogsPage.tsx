// src/admin/pages/GameTokenLogsPage.tsx
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  Wallet,
  ScrollText,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import {
  fetchWallets,
  fetchRecentPlayLogs,
  fetchLedger,
  TokenBalance,
  PlayLogEntry,
  LedgerEntry
} from "../api/adminGameTokenApi";
import { GameTokenType } from "../../types/gameTokens";

type ActiveTab = "wallets" | "playLogs" | "ledger";

const GameTokenLogsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("wallets");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterTokenType, setFilterTokenType] = useState<GameTokenType | "">("");

  // Queries
  const { data: wallets, isLoading: walletsLoading, refetch: refetchWallets } = useQuery({
    queryKey: ["admin", "game-tokens", "wallets", filterUserId, filterTokenType],
    queryFn: () => fetchWallets(filterUserId || undefined, 100, 0, undefined, filterTokenType || undefined),
    enabled: activeTab === "wallets",
  });

  const { data: playLogs, isLoading: playLogsLoading, refetch: refetchPlayLogs } = useQuery({
    queryKey: ["admin", "game-tokens", "play-logs", filterUserId],
    queryFn: () => fetchRecentPlayLogs(100, filterUserId || undefined),
    enabled: activeTab === "playLogs",
  });

  const { data: ledger, isLoading: ledgerLoading, refetch: refetchLedger } = useQuery({
    queryKey: ["admin", "game-tokens", "ledger", filterUserId],
    queryFn: () => fetchLedger(100, filterUserId || undefined),
    enabled: activeTab === "ledger",
  });

  const isLoading = walletsLoading || playLogsLoading || ledgerLoading;

  const handleRefetch = () => {
    if (activeTab === "wallets") refetchWallets();
    if (activeTab === "playLogs") refetchPlayLogs();
    if (activeTab === "ledger") refetchLedger();
  };

  return (
    <section className="admin-page-container space-y-10 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-admin-brand">
            <History className="h-5 w-5" />
            <span className="text-admin-meta font-black uppercase tracking-[0.2em]">Token Transaction Records</span>
          </div>
          <h1 className="text-admin-title text-admin-text-primary">토큰 트랜잭션 전적</h1>
          <p className="text-admin-body text-admin-text-secondary font-medium">
            모든 토큰 지갑 잔액, 게임 플레이 기록 및 원장 데이터를 실시간으로 조회합니다.
          </p>
        </div>
        <button
          onClick={handleRefetch}
          disabled={isLoading}
          className="btn-admin-secondary flex items-center gap-2 px-5 py-2.5 h-auto disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> 새로고침
        </button>
      </header>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-admin-sidebar/50 rounded-xl border border-admin-border overflow-x-auto">
        <button
          onClick={() => setActiveTab("wallets")}
          className={`px-6 py-2.5 rounded-lg text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === "wallets" ? "bg-admin-brand text-white shadow-admin-glow" : "text-admin-text-secondary hover:text-admin-text-primary"
            }`}
        >
          <Wallet className="h-3.5 w-3.5" /> 지갑 잔액
        </button>
        <button
          onClick={() => setActiveTab("playLogs")}
          className={`px-6 py-2.5 rounded-lg text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === "playLogs" ? "bg-admin-brand text-white shadow-admin-glow" : "text-admin-text-secondary hover:text-admin-text-primary"
            }`}
        >
          <ScrollText className="h-3.5 w-3.5" /> 게임 플레이 전적
        </button>
        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-6 py-2.5 rounded-lg text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === "ledger" ? "bg-admin-brand text-white shadow-admin-glow" : "text-admin-text-secondary hover:text-admin-text-primary"
            }`}
        >
          <History className="h-3.5 w-3.5" /> 원장 기록
        </button>
      </div>

      {/* Filters */}
      <div className="admin-card-premium p-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex items-center gap-2">
          <Search className="h-4 w-4 text-admin-text-muted" />
          <input
            type="text"
            placeholder="External ID / Telegram Username / Nickname..."
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-admin-text-primary flex-1"
          />
        </div>
        {activeTab === "wallets" && (
          <select
            value={filterTokenType}
            onChange={(e) => setFilterTokenType(e.target.value as GameTokenType | "")}
            aria-label="토큰 타입 필터"
            title="토큰 타입 필터"
            className="admin-input h-10 w-full md:w-48 text-xs"
          >
            <option value="">All Token Types</option>
            <option value="ROULETTE_COIN">룰렛 코인</option>
            <option value="DICE_TOKEN">주사위 토큰</option>
            <option value="LOTTERY_TICKET">복권 티켓</option>
            <option value="GOLD_KEY">골드 키</option>
            <option value="DIAMOND_KEY">다이아몬드 키</option>
          </select>
        )}
      </div>

      {/* Content Area */}
      <div className="admin-card-premium overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <RefreshCw className="h-8 w-8 text-admin-brand animate-spin" />
            <p className="text-admin-meta text-admin-text-secondary">데이터 로딩 중...</p>
          </div>
        ) : (
          <>
            {activeTab === "wallets" && (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="admin-table">
                  <thead>
                    <tr className="admin-th">
                      <th className="px-4 py-3.5 text-left">User ID</th>
                      <th className="px-4 py-3.5 text-left">Identifier</th>
                      <th className="px-4 py-3.5 text-left">Token Type</th>
                      <th className="px-4 py-3.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallets?.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-admin-text-muted text-sm">
                          조회된 지갑 데이터가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      wallets?.map((wallet: TokenBalance, index: number) => (
                        <tr key={index} className="admin-td group">
                          <td className="px-4 py-4 font-mono text-admin-text-primary">{wallet.user_id}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-admin-text-primary font-bold text-xs">{wallet.nickname || "-"}</span>
                              <span className="text-admin-text-muted text-[10px]">@{wallet.telegram_username || wallet.external_id}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="px-2 py-0.5 rounded-full bg-admin-brand/10 text-admin-brand text-[10px] font-black uppercase">
                              {wallet.token_type}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-admin-accent font-black tabular-nums text-lg">{wallet.balance.toLocaleString()}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "playLogs" && (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="admin-table">
                  <thead>
                    <tr className="admin-th">
                      <th className="px-4 py-3.5 text-left">User ID</th>
                      <th className="px-4 py-3.5 text-left">Game</th>
                      <th className="px-4 py-3.5 text-left">Reward</th>
                      <th className="px-4 py-3.5 text-right">Amount</th>
                      <th className="px-4 py-3.5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playLogs?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-admin-text-muted text-sm">
                          조회된 플레이 로그가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      playLogs?.map((log: PlayLogEntry) => (
                        <tr key={log.id} className="admin-td group">
                          <td className="px-4 py-4 font-mono text-admin-text-primary">{log.user_id}</td>
                          <td className="px-4 py-4 text-admin-text-primary font-bold text-xs uppercase">{log.game}</td>
                          <td className="px-4 py-4">
                            <span className="px-2 py-0.5 rounded-full bg-admin-warning/10 text-admin-warning text-[10px] font-black">
                              {log.reward_type}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right text-admin-accent font-black tabular-nums">{log.reward_amount.toLocaleString()}</td>
                          <td className="px-4 py-4 text-right text-admin-text-secondary text-xs tabular-nums">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "ledger" && (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="admin-table">
                  <thead>
                    <tr className="admin-th">
                      <th className="px-4 py-3.5 text-left">User ID</th>
                      <th className="px-4 py-3.5 text-left">Token Type</th>
                      <th className="px-4 py-3.5 text-left">Reason</th>
                      <th className="px-4 py-3.5 text-right">Delta</th>
                      <th className="px-4 py-3.5 text-right">Balance After</th>
                      <th className="px-4 py-3.5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-admin-text-muted text-sm">
                          조회된 원장 기록이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      ledger?.map((entry: LedgerEntry) => (
                        <tr key={entry.id} className="admin-td group">
                          <td className="px-4 py-4 font-mono text-admin-text-primary">{entry.user_id}</td>
                          <td className="px-4 py-4">
                            <span className="px-2 py-0.5 rounded-full bg-admin-brand/10 text-admin-brand text-[10px] font-black uppercase">
                              {entry.token_type}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-admin-text-secondary text-xs">{entry.reason || "-"}</td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {entry.delta > 0 ? (
                                <>
                                  <TrendingUp className="h-3 w-3 text-admin-accent" />
                                  <span className="text-admin-accent font-black tabular-nums">+{entry.delta.toLocaleString()}</span>
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="h-3 w-3 text-admin-danger" />
                                  <span className="text-admin-danger font-black tabular-nums">{entry.delta.toLocaleString()}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right text-admin-text-primary font-black tabular-nums">{entry.balance_after.toLocaleString()}</td>
                          <td className="px-4 py-4 text-right text-admin-text-secondary text-xs tabular-nums">
                            {new Date(entry.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default GameTokenLogsPage;

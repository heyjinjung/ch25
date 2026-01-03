import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Ticket, X } from "lucide-react";
import { GAME_TOKEN_LABELS, type GameTokenType } from "../../types/gameTokens";
import {
  fetchLedgerByUserId,
  fetchWalletsByUserId,
  type LedgerEntry,
  type TokenBalance,
} from "../api/adminGameTokenApi";

type AdminUser = {
  id: number;
  external_id?: string | null;
  telegram_id?: number | null;
  telegram_username?: string | null;
  nickname?: string | null;
};

type Props = {
  user: AdminUser;
  defaultTab?: "wallets" | "ledger";
  onClose: () => void;
};

const tokenOptions: GameTokenType[] = ["ROULETTE_COIN", "DICE_TOKEN", "LOTTERY_TICKET", "GOLD_KEY", "DIAMOND_KEY"];

const formatKst = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const UserGameTokenModal: React.FC<Props> = ({ user, defaultTab = "wallets", onClose }) => {
  const [activeTab, setActiveTab] = useState<"wallets" | "ledger">(defaultTab);

  const walletsQuery = useQuery<TokenBalance[]>({
    queryKey: ["admin", "game-tokens", "wallets", user.id],
    queryFn: () => fetchWalletsByUserId(user.id, 50, 0),
    enabled: !!user.id,
  });

  const ledgerQuery = useQuery<LedgerEntry[]>({
    queryKey: ["admin", "game-tokens", "ledger", user.id],
    queryFn: () => fetchLedgerByUserId(user.id, 60, 0),
    enabled: !!user.id,
  });

  const walletByType = useMemo(() => {
    const map = new Map<string, TokenBalance>();
    for (const w of walletsQuery.data ?? []) map.set(w.token_type, w);
    return map;
  }, [walletsQuery.data]);

  const headerName = user.nickname || user.external_id || (user.telegram_username ? `@${String(user.telegram_username).replace(/^@/, "")}` : String(user.id));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#333333] bg-[#111111] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-[#333333] p-4 sm:p-6 bg-[#1A1A1A]">
          <div>
            <h3 className="text-xl font-bold text-[#91F402]">잔액/로그: {headerName}</h3>
            <p className="text-xs text-gray-400 mt-1">
              ID: {user.id}
              {user.telegram_username ? ` · TG: @${String(user.telegram_username).replace(/^@/, "")}` : user.telegram_id ? ` · TG ID: ${user.telegram_id}` : ""}
              {user.external_id ? ` · external_id: ${user.external_id}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-[#333333] hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-[#333333] bg-[#0B0B0B] px-4 py-3 sm:px-6 flex items-center justify-between">
          <div className="flex bg-[#111] rounded-lg p-1 border border-[#333]">
            <button
              type="button"
              onClick={() => setActiveTab("wallets")}
              className={`px-4 py-1.5 text-xs font-bold rounded flex items-center gap-2 ${activeTab === "wallets" ? "bg-[#333] text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              <Ticket size={14} /> 잔액 티켓
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ledger")}
              className={`px-4 py-1.5 text-xs font-bold rounded flex items-center gap-2 ${activeTab === "ledger" ? "bg-[#333] text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              <History size={14} /> 잔액 로그
            </button>
          </div>
          <div className="text-[11px] text-gray-600">
            {activeTab === "wallets" ? "지갑 잔액" : "최근 원장(ledger)"}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === "wallets" && (
            <div className="rounded-2xl border border-[#333333] bg-[#0B0B0B] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#222222]">
                <div className="text-sm font-bold text-[#91F402]">현재 잔액</div>
              </div>
              {walletsQuery.isLoading ? (
                <div className="py-12 text-center text-gray-500">Loading…</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#111111] text-gray-400">
                    <tr>
                      <th className="py-3 px-4">종류</th>
                      <th className="py-3 px-4">token_type</th>
                      <th className="py-3 px-4 text-right">잔액</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {tokenOptions.map((t) => {
                      const w = walletByType.get(t);
                      const bal = w?.balance ?? 0;
                      return (
                        <tr key={t} className="hover:bg-[#111111]">
                          <td className="py-3 px-4 font-bold text-white">{GAME_TOKEN_LABELS[t] ?? t}</td>
                          <td className="py-3 px-4 text-xs text-gray-400 font-mono">{t}</td>
                          <td className={`py-3 px-4 text-right font-bold ${bal > 0 ? "text-[#91F402]" : "text-gray-500"}`}>{bal.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {walletsQuery.error && (
                <div className="p-4 text-xs text-red-300">조회 실패: {(walletsQuery.error as any)?.message ?? "unknown"}</div>
              )}
            </div>
          )}

          {activeTab === "ledger" && (
            <div className="rounded-2xl border border-[#333333] bg-[#0B0B0B] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#222222]">
                <div className="text-sm font-bold text-[#91F402]">최근 잔액 로그</div>
              </div>
              {ledgerQuery.isLoading ? (
                <div className="py-12 text-center text-gray-500">Loading…</div>
              ) : (ledgerQuery.data ?? []).length === 0 ? (
                <div className="py-12 text-center text-gray-500">로그가 없습니다.</div>
              ) : (
                <div className="divide-y divide-[#222]">
                  {(ledgerQuery.data ?? []).slice(0, 60).map((l) => {
                    const delta = Number(l.delta || 0);
                    const deltaText = `${delta > 0 ? "+" : ""}${delta.toLocaleString()}`;
                    return (
                      <div key={l.id} className="p-4 hover:bg-[#111111]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs text-gray-400 font-mono">#{l.id} · {GAME_TOKEN_LABELS[l.token_type as GameTokenType] ?? l.token_type}</div>
                            <div className="text-sm font-bold text-white mt-0.5">
                              <span className={delta >= 0 ? "text-emerald-400" : "text-red-400"}>{deltaText}</span>
                              <span className="text-gray-500"> → </span>
                              <span className="text-white">{Number(l.balance_after || 0).toLocaleString()}</span>
                            </div>
                            <div className="text-[11px] text-gray-500 mt-1">{l.reason || "-"}{l.label ? ` · ${l.label}` : ""}</div>
                          </div>
                          <div className="text-[11px] text-gray-600 shrink-0">{formatKst(l.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {ledgerQuery.error && (
                <div className="p-4 text-xs text-red-300">조회 실패: {(ledgerQuery.error as any)?.message ?? "unknown"}</div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-[#333333] bg-[#1A1A1A] flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-[#333333] px-6 py-2 text-sm font-bold text-white hover:bg-[#444444]">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserGameTokenModal;

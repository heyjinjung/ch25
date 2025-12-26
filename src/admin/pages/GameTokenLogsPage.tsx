import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchRecentPlayLogs,
  fetchWallets,
  fetchLedger,
  LedgerEntry,
  PlayLogEntry,
  revokeGameTokens,
  RevokeGameTokensPayload,
  GrantGameTokensResponse,
  TokenBalance,
} from "../api/adminGameTokenApi";
import { GAME_TOKEN_LABELS, GameTokenType } from "../../types/gameTokens";
import { REWARD_TYPES } from "../constants/rewardTypes";

const tokenOptions: GameTokenType[] = ["ROULETTE_COIN", "DICE_TOKEN", "LOTTERY_TICKET", "CC_COIN"];

const gameLabel = (game?: string | null) => {
  const raw = String(game ?? "").trim();
  const key = raw.toUpperCase();
  if (!raw) return "-";
  if (key.includes("ROULETTE")) return "룰렛";
  if (key.includes("DICE")) return "주사위";
  if (key.includes("LOTTERY")) return "복권";
  return raw;
};

const rewardTypeLabel = (rewardType?: string | null) => {
  const raw = String(rewardType ?? "").trim();
  if (!raw) return "-";
  const match = REWARD_TYPES.find((t) => t.value === raw);
  return match?.label ?? raw;
};

type ActiveTab = "wallets" | "playLogs" | "ledger" | "revoke";

type SortDir = "asc" | "desc";

type PlayLogGameFilterValue = "" | "roulette" | "dice" | "lottery" | string;

const BASE_PLAY_LOG_GAME_FILTERS: Array<{ value: PlayLogGameFilterValue; label: string }> = [
  { value: "roulette", label: "룰렛" },
  { value: "dice", label: "주사위" },
  { value: "lottery", label: "복권" },
];

const GameTokenLogsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>("wallets");

  const [externalIdInput, setExternalIdInput] = useState<string>("");
  const [externalIdFilter, setExternalIdFilter] = useState<string | undefined>();

  const [filterHasBalance, setFilterHasBalance] = useState<boolean | undefined>();
  const [filterTokenType, setFilterTokenType] = useState<string | undefined>();
  const [walletLimit, setWalletLimit] = useState<number>(20);
  const [walletPage, setWalletPage] = useState<number>(0);

  const [walletSearch, setWalletSearch] = useState<string>("");
  const [walletSortKey, setWalletSortKey] = useState<"external_id" | "token_type" | "balance">("balance");
  const [walletSortDir, setWalletSortDir] = useState<SortDir>("desc");

  const [playLogLimit, setPlayLogLimit] = useState<number>(50);
  const [playLogPage, setPlayLogPage] = useState<number>(0);

  const [playLogSearch, setPlayLogSearch] = useState<string>("");
  const [playLogGameFilter, setPlayLogGameFilter] = useState<PlayLogGameFilterValue>("");
  const [playLogRewardTypeFilter, setPlayLogRewardTypeFilter] = useState<string>("");
  const [playLogSortKey, setPlayLogSortKey] = useState<"created_at" | "reward_amount" | "game">("created_at");
  const [playLogSortDir, setPlayLogSortDir] = useState<SortDir>("desc");

  const [revokeExternalId, setRevokeExternalId] = useState<string>("");
  const [revokeTokenType, setRevokeTokenType] = useState<GameTokenType>("ROULETTE_COIN");
  const [revokeAmount, setRevokeAmount] = useState<number>(0);
  const [ledgerLimit, setLedgerLimit] = useState<number>(50);
  const [ledgerPage, setLedgerPage] = useState<number>(0);
  const [revokeResult, setRevokeResult] = useState<GrantGameTokensResponse | null>(null);

  const [ledgerSearch, setLedgerSearch] = useState<string>("");
  const [ledgerTokenTypeFilter, setLedgerTokenTypeFilter] = useState<string>("");
  const [ledgerDeltaFilter, setLedgerDeltaFilter] = useState<"" | "pos" | "neg">("");
  const [ledgerSortKey, setLedgerSortKey] = useState<"created_at" | "delta" | "balance_after" | "id">("created_at");
  const [ledgerSortDir, setLedgerSortDir] = useState<SortDir>("desc");

  const [selectedLedgerIds, setSelectedLedgerIds] = useState<Record<number, boolean>>({});
  const [expandedLedgerId, setExpandedLedgerId] = useState<number | null>(null);

  const walletsQuery = useQuery<TokenBalance[], unknown>({
    queryKey: ["admin-wallets", externalIdFilter, walletLimit, walletPage, filterHasBalance, filterTokenType],
    queryFn: () => fetchWallets(externalIdFilter, walletLimit, walletPage * walletLimit, filterHasBalance, filterTokenType),
    enabled: activeTab === "wallets",
  });

  const playLogsQuery = useQuery<PlayLogEntry[], unknown>({
    queryKey: ["admin-play-logs", externalIdFilter, playLogLimit, playLogPage],
    queryFn: () => fetchRecentPlayLogs(playLogLimit, externalIdFilter, playLogPage * playLogLimit),
    enabled: activeTab === "playLogs",
  });

  const ledgerQuery = useQuery<LedgerEntry[], unknown>({
    queryKey: ["admin-ledger", externalIdFilter, ledgerLimit, ledgerPage],
    queryFn: () => fetchLedger(ledgerLimit, externalIdFilter, ledgerPage * ledgerLimit),
    enabled: activeTab === "ledger",
  });

  const revokeMutation = useMutation({
    mutationFn: (payload: RevokeGameTokensPayload) => revokeGameTokens(payload),
    onSuccess: (data) => {
      setRevokeResult(data);
      queryClient.invalidateQueries({ queryKey: ["admin-wallets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ledger"] });
    },
  });

  const revokeDisabled = useMemo(() => !revokeExternalId.trim() || revokeAmount <= 0, [revokeExternalId, revokeAmount]);

  const inputClass =
    "w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]";
  const selectClass =
    "rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]";

  const PrimaryButton = ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-md bg-[#2D6B3B] px-4 py-2 text-sm font-medium text-white hover:bg-[#91F402] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
      {...props}
    >
      {children}
    </button>
  );

  const SecondaryButton = ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-md border border-[#333333] bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-gray-200 hover:bg-[#2C2C2E] disabled:cursor-not-allowed disabled:opacity-60"
      {...props}
    >
      {children}
    </button>
  );

  const TableShell = ({ children }: { children: React.ReactNode }) => (
    <div className="overflow-hidden rounded-lg border border-[#333333] bg-[#111111] shadow-md">
      <div className="max-h-[520px] overflow-auto">{children}</div>
    </div>
  );

  const formatTime = (value?: string | null) => {
    if (!value) return "-";
    const d = dayjs(value);
    return d.isValid() ? d.format("YYYY-MM-DD HH:mm:ss") : value;
  };

  const normalize = (value: unknown) => String(value ?? "").toLowerCase();
  const includesAny = (hay: string, needle: string) => {
    const n = needle.trim().toLowerCase();
    if (!n) return true;
    return hay.includes(n);
  };

  const compareStr = (a: string, b: string, dir: SortDir) => (dir === "asc" ? a.localeCompare(b) : b.localeCompare(a));
  const compareNum = (a: number, b: number, dir: SortDir) => (dir === "asc" ? a - b : b - a);
  const compareTime = (a: string | null | undefined, b: string | null | undefined, dir: SortDir) => {
    const at = a ? dayjs(a).valueOf() : 0;
    const bt = b ? dayjs(b).valueOf() : 0;
    return compareNum(at, bt, dir);
  };

  const applyExternalId = () => {
    const next = externalIdInput.trim();
    const nextFilter = next ? next : undefined;
    setExternalIdFilter(nextFilter);
    setWalletPage(0);
    setPlayLogPage(0);
    setLedgerPage(0);

    if (!revokeExternalId.trim() && nextFilter) {
      setRevokeExternalId(nextFilter);
    }
  };

  const resetAllFilters = () => {
    setExternalIdInput("");
    setExternalIdFilter(undefined);
    setFilterHasBalance(undefined);
    setFilterTokenType(undefined);
    setWalletPage(0);
    setPlayLogPage(0);
    setLedgerPage(0);

    setWalletSearch("");
    setPlayLogSearch("");
    setPlayLogGameFilter("");
    setPlayLogRewardTypeFilter("");
    setLedgerSearch("");
    setLedgerTokenTypeFilter("");
    setLedgerDeltaFilter("");
  };

  const prettyJson = (value: unknown) => {
    try {
      return JSON.stringify(value ?? {}, null, 2);
    } catch {
      return "{}";
    }
  };

  const walletVisibleRows = useMemo(() => {
    const base = walletsQuery.data ?? [];
    const filtered = base.filter((r) => {
      const hay = normalize(`${r.external_id ?? ""} ${r.user_id} ${r.token_type} ${GAME_TOKEN_LABELS[r.token_type]} ${r.balance}`);
      return includesAny(hay, walletSearch);
    });
    const sorted = [...filtered].sort((a, b) => {
      if (walletSortKey === "balance") return compareNum(a.balance ?? 0, b.balance ?? 0, walletSortDir);
      if (walletSortKey === "token_type") {
        return compareStr(normalize(GAME_TOKEN_LABELS[a.token_type] ?? a.token_type), normalize(GAME_TOKEN_LABELS[b.token_type] ?? b.token_type), walletSortDir);
      }
      const ax = normalize(a.external_id ?? String(a.user_id ?? ""));
      const bx = normalize(b.external_id ?? String(b.user_id ?? ""));
      return compareStr(ax, bx, walletSortDir);
    });
    return sorted;
  }, [walletsQuery.data, walletSearch, walletSortKey, walletSortDir]);

  const playLogVisibleRows = useMemo(() => {
    const base = playLogsQuery.data ?? [];
    const filtered = base.filter((r) => {
      if (playLogGameFilter) {
        const g = normalize(r.game);
        const filter = String(playLogGameFilter).trim().toLowerCase();
        if (filter === "roulette" || filter === "dice" || filter === "lottery") {
          if (!g.includes(filter)) return false;
        } else {
          if (g !== normalize(filter)) return false;
        }
      }
      if (playLogRewardTypeFilter && normalize(r.reward_type) !== normalize(playLogRewardTypeFilter)) return false;
      const hay = normalize(
        `${r.game} ${gameLabel(r.game)} ${r.external_id ?? ""} ${r.user_id} ${r.reward_type} ${rewardTypeLabel(r.reward_type)} ${r.reward_amount} ${r.reward_label ?? ""}`
      );
      return includesAny(hay, playLogSearch);
    });
    const sorted = [...filtered].sort((a, b) => {
      if (playLogSortKey === "reward_amount") return compareNum(a.reward_amount ?? 0, b.reward_amount ?? 0, playLogSortDir);
      if (playLogSortKey === "game") return compareStr(normalize(gameLabel(a.game)), normalize(gameLabel(b.game)), playLogSortDir);
      return compareTime(a.created_at, b.created_at, playLogSortDir);
    });
    return sorted;
  }, [playLogsQuery.data, playLogGameFilter, playLogRewardTypeFilter, playLogSearch, playLogSortKey, playLogSortDir]);

  const ledgerVisibleRows = useMemo(() => {
    const base = ledgerQuery.data ?? [];
    const filtered = base.filter((r) => {
      if (ledgerTokenTypeFilter && String(r.token_type) !== ledgerTokenTypeFilter) return false;
      if (ledgerDeltaFilter === "pos" && !(r.delta >= 0)) return false;
      if (ledgerDeltaFilter === "neg" && !(r.delta < 0)) return false;
      const hay = normalize(`${r.id} ${r.external_id ?? ""} ${r.user_id} ${r.token_type} ${GAME_TOKEN_LABELS[r.token_type]} ${r.delta} ${r.balance_after} ${r.reason ?? ""} ${r.label ?? ""}`);
      return includesAny(hay, ledgerSearch);
    });
    const sorted = [...filtered].sort((a, b) => {
      if (ledgerSortKey === "id") return compareNum(a.id ?? 0, b.id ?? 0, ledgerSortDir);
      if (ledgerSortKey === "delta") return compareNum(a.delta ?? 0, b.delta ?? 0, ledgerSortDir);
      if (ledgerSortKey === "balance_after") return compareNum(a.balance_after ?? 0, b.balance_after ?? 0, ledgerSortDir);
      return compareTime(a.created_at, b.created_at, ledgerSortDir);
    });
    return sorted;
  }, [ledgerQuery.data, ledgerSearch, ledgerTokenTypeFilter, ledgerDeltaFilter, ledgerSortKey, ledgerSortDir]);

  const playLogGameOptions = useMemo(() => {
    const extra: Array<{ value: PlayLogGameFilterValue; label: string }> = [];
    const seen = new Set<string>();

    for (const r of playLogsQuery.data ?? []) {
      const raw = String(r.game ?? "").trim();
      if (!raw) continue;
      const n = raw.toLowerCase();
      if (n.includes("roulette") || n.includes("dice") || n.includes("lottery")) continue;
      if (seen.has(n)) continue;
      seen.add(n);
      extra.push({ value: raw, label: gameLabel(raw) });
    }

    extra.sort((a, b) => String(a.label).localeCompare(String(b.label)));
    return [...BASE_PLAY_LOG_GAME_FILTERS, ...extra];
  }, [playLogsQuery.data]);

  const playLogRewardTypeOptions = useMemo(() => REWARD_TYPES.map((t) => t.value), []);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#91F402]">티켓 로그 / 회수</h2>
          <p className="mt-1 text-sm text-gray-400">external_id 기준으로 잔액, 플레이 로그, 원장을 확인하고 회수할 수 있습니다.</p>
        </div>
      </header>

      <div className="rounded-lg border border-[#333333] bg-[#111111] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm text-gray-400">공통 필터</div>
            <div className="mt-1 text-sm text-white">
              현재 external_id: <span className="font-semibold text-[#91F402]">{externalIdFilter ?? "전체"}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={externalIdInput}
              onChange={(e) => setExternalIdInput(e.target.value)}
              placeholder="external_id 입력"
              className="w-64 rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
            />
            <PrimaryButton
              onClick={() => {
                applyExternalId();
                if (activeTab === "wallets") walletsQuery.refetch();
                if (activeTab === "playLogs") playLogsQuery.refetch();
                if (activeTab === "ledger") ledgerQuery.refetch();
              }}
            >
              검색 적용
            </PrimaryButton>
            <SecondaryButton onClick={resetAllFilters}>초기화</SecondaryButton>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#333333] bg-[#111111] p-2">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "wallets" as const, label: "지갑 잔액" },
              { key: "playLogs" as const, label: "플레이 로그" },
              { key: "ledger" as const, label: "코인 원장" },
              { key: "revoke" as const, label: "티켓 회수" },
            ]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setActiveTab(t.key);
                setRevokeResult(null);
              }}
              className={
                activeTab === t.key
                  ? "rounded-md bg-[#2D6B3B] px-4 py-2 text-sm font-medium text-[#91F402]"
                  : "rounded-md bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-gray-300 hover:bg-[#2C2C2E]"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "wallets" && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#91F402]">지갑 잔액</h3>
              <p className="mt-1 text-xs text-gray-500">대용량 데이터는 필터 적용 후 조회하는 것을 권장합니다.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={walletSearch}
                onChange={(e) => setWalletSearch(e.target.value)}
                className="w-60 rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                placeholder="현재 페이지 내 검색"
                title="현재 페이지 데이터에서만 검색됩니다"
              />
              <select className={selectClass} value={walletSortKey} onChange={(e) => setWalletSortKey(e.target.value as any)}>
                <option value="balance">잔액</option>
                <option value="external_id">external_id</option>
                <option value="token_type">토큰</option>
              </select>
              <select className={selectClass} value={walletSortDir} onChange={(e) => setWalletSortDir(e.target.value as SortDir)}>
                <option value="desc">내림차순</option>
                <option value="asc">오름차순</option>
              </select>
              <select
                className={selectClass}
                value={filterHasBalance === undefined ? "" : filterHasBalance ? "has" : "empty"}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilterHasBalance(v === "" ? undefined : v === "has");
                  setWalletPage(0);
                }}
              >
                <option value="">전체</option>
                <option value="has">잔액 있음</option>
                <option value="empty">잔액 없음</option>
              </select>
              <select
                className={selectClass}
                value={filterTokenType || ""}
                onChange={(e) => {
                  setFilterTokenType(e.target.value || undefined);
                  setWalletPage(0);
                }}
              >
                <option value="">전체 토큰</option>
                <option value="ROULETTE_COIN">룰렛</option>
                <option value="DICE_TOKEN">주사위</option>
                <option value="LOTTERY_TICKET">복권</option>
                <option value="CC_COIN">CC 코인</option>
              </select>
              <input
                type="number"
                min={1}
                max={200}
                value={walletLimit}
                onChange={(e) => {
                  const next = Math.min(200, Math.max(1, Number(e.target.value) || 1));
                  setWalletLimit(next);
                  setWalletPage(0);
                }}
                className="w-24 rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                title="표시 개수 (1-200)"
              />
              <SecondaryButton onClick={() => walletsQuery.refetch()} disabled={walletsQuery.isFetching}>
                새로고침
              </SecondaryButton>
            </div>
          </div>

          {walletsQuery.isError && (
            <div className="rounded-lg border border-red-500/40 bg-red-950 p-3 text-sm text-red-100">잔액 조회 실패</div>
          )}

          <TableShell>
            <table className="w-full">
              <thead className="sticky top-0 z-10 border-b border-[#333333] bg-[#1A1A1A]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">external_id</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">토큰</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">잔액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {walletVisibleRows.map((row, idx) => (
                  <tr key={`${row.user_id}-${row.token_type}`} className={idx % 2 === 0 ? "bg-[#111111]" : "bg-[#1A1A1A]"}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">{row.external_id ?? row.user_id}</div>
                      <div className="text-xs text-gray-500">user_id: {row.user_id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-200">{GAME_TOKEN_LABELS[row.token_type]}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-[#91F402]">{row.balance}</td>
                  </tr>
                ))}
                {walletsQuery.isLoading && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                      불러오는 중...
                    </td>
                  </tr>
                )}
                {!walletsQuery.isLoading && (walletsQuery.data?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableShell>

          <div className="flex items-center justify-between rounded-lg border border-[#333333] bg-[#111111] px-4 py-3 text-sm text-gray-300">
            <div>
              페이지 <span className="font-medium text-white">{walletPage + 1}</span>
              <span className="ml-2 text-gray-500">(표시: {walletLimit}개)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={
                  walletPage === 0 || walletsQuery.isFetching
                    ? "rounded-md border border-[#333333] bg-[#111111] px-3 py-2 text-gray-600"
                    : "rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-gray-200 hover:bg-[#2C2C2E]"
                }
                disabled={walletPage === 0 || walletsQuery.isFetching}
                onClick={() => setWalletPage((p) => Math.max(0, p - 1))}
              >
                이전
              </button>
              <button
                type="button"
                className={
                  (walletsQuery.data?.length ?? 0) < walletLimit || walletsQuery.isFetching
                    ? "rounded-md border border-[#333333] bg-[#111111] px-3 py-2 text-gray-600"
                    : "rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-gray-200 hover:bg-[#2C2C2E]"
                }
                disabled={(walletsQuery.data?.length ?? 0) < walletLimit || walletsQuery.isFetching}
                onClick={() => setWalletPage((p) => p + 1)}
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "playLogs" && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#91F402]">최근 플레이 로그</h3>
              <p className="mt-1 text-xs text-gray-500">external_id 필터는 상단에서 적용합니다.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={playLogSearch}
                onChange={(e) => setPlayLogSearch(e.target.value)}
                className="w-60 rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                placeholder="현재 페이지 내 검색"
                title="현재 페이지 데이터에서만 검색됩니다"
              />
              <select className={selectClass} value={playLogGameFilter} onChange={(e) => setPlayLogGameFilter(e.target.value)}>
                <option value="">전체 게임</option>
                {playLogGameOptions.map((g) => (
                  <option key={String(g.value)} value={String(g.value)}>
                    {g.label}
                  </option>
                ))}
              </select>
              <select className={selectClass} value={playLogRewardTypeFilter} onChange={(e) => setPlayLogRewardTypeFilter(e.target.value)}>
                <option value="">전체 reward_type</option>
                {playLogRewardTypeOptions.map((rt) => (
                  <option key={rt} value={rt}>
                    {rewardTypeLabel(rt)}
                  </option>
                ))}
              </select>
              <select className={selectClass} value={playLogSortKey} onChange={(e) => setPlayLogSortKey(e.target.value as any)}>
                <option value="created_at">시각</option>
                <option value="reward_amount">reward_amount</option>
                <option value="game">game</option>
              </select>
              <select className={selectClass} value={playLogSortDir} onChange={(e) => setPlayLogSortDir(e.target.value as SortDir)}>
                <option value="desc">내림차순</option>
                <option value="asc">오름차순</option>
              </select>
              <input
                type="number"
                min={1}
                max={200}
                value={playLogLimit}
                onChange={(e) => {
                  const next = Math.min(200, Math.max(1, Number(e.target.value) || 1));
                  setPlayLogLimit(next);
                  setPlayLogPage(0);
                }}
                className="w-24 rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                title="표시 개수 (1-200)"
              />
              <SecondaryButton onClick={() => playLogsQuery.refetch()} disabled={playLogsQuery.isFetching}>
                새로고침
              </SecondaryButton>
            </div>
          </div>

          {playLogsQuery.isError && (
            <div className="rounded-lg border border-red-500/40 bg-red-950 p-3 text-sm text-red-100">플레이 로그 조회 실패</div>
          )}

          <TableShell>
            <table className="w-full">
              <thead className="sticky top-0 z-10 border-b border-[#333333] bg-[#1A1A1A]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">game</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">external_id</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">reward</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">label</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">시각</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {playLogVisibleRows.map((row, idx) => (
                  <tr key={`${row.game}-${row.id}`} className={idx % 2 === 0 ? "bg-[#111111]" : "bg-[#1A1A1A]"}>
                    <td className="px-4 py-3 text-sm text-gray-200">{row.game}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">{row.external_id ?? row.user_id}</div>
                      <div className="text-xs text-gray-500">id: {row.id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-200">
                      {row.reward_type} <span className="font-semibold text-white">{row.reward_amount}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{row.reward_label ?? "-"}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400">{formatTime(row.created_at)}</td>
                  </tr>
                ))}
                {playLogsQuery.isLoading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      불러오는 중...
                    </td>
                  </tr>
                )}
                {!playLogsQuery.isLoading && (playLogsQuery.data?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableShell>

          <div className="flex items-center justify-between rounded-lg border border-[#333333] bg-[#111111] px-4 py-3 text-sm text-gray-300">
            <div>
              페이지 <span className="font-medium text-white">{playLogPage + 1}</span>
              <span className="ml-2 text-gray-500">(표시: {playLogLimit}개)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={
                  playLogPage === 0 || playLogsQuery.isFetching
                    ? "rounded-md border border-[#333333] bg-[#111111] px-3 py-2 text-gray-600"
                    : "rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-gray-200 hover:bg-[#2C2C2E]"
                }
                disabled={playLogPage === 0 || playLogsQuery.isFetching}
                onClick={() => setPlayLogPage((p) => Math.max(0, p - 1))}
              >
                이전
              </button>
              <button
                type="button"
                className={
                  (playLogsQuery.data?.length ?? 0) < playLogLimit || playLogsQuery.isFetching
                    ? "rounded-md border border-[#333333] bg-[#111111] px-3 py-2 text-gray-600"
                    : "rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-gray-200 hover:bg-[#2C2C2E]"
                }
                disabled={(playLogsQuery.data?.length ?? 0) < playLogLimit || playLogsQuery.isFetching}
                onClick={() => setPlayLogPage((p) => p + 1)}
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "ledger" && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#91F402]">코인 원장</h3>
              <p className="mt-1 text-xs text-gray-500">external_id 필터는 상단에서 적용합니다.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="w-60 rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                placeholder="사유/라벨/ID 검색"
                title="현재 페이지 데이터에서만 검색됩니다"
              />
              <select className={selectClass} value={ledgerTokenTypeFilter} onChange={(e) => setLedgerTokenTypeFilter(e.target.value)}>
                <option value="">전체 토큰</option>
                {tokenOptions.map((t) => (
                  <option key={t} value={t}>
                    {GAME_TOKEN_LABELS[t]}
                  </option>
                ))}
              </select>
              <select className={selectClass} value={ledgerDeltaFilter} onChange={(e) => setLedgerDeltaFilter(e.target.value as any)}>
                <option value="">증감 전체</option>
                <option value="pos">증가(0 이상)</option>
                <option value="neg">감소(0 미만)</option>
              </select>
              <select className={selectClass} value={ledgerSortKey} onChange={(e) => setLedgerSortKey(e.target.value as any)}>
                <option value="created_at">시각</option>
                <option value="id">id</option>
                <option value="delta">증감</option>
                <option value="balance_after">잔액</option>
              </select>
              <select className={selectClass} value={ledgerSortDir} onChange={(e) => setLedgerSortDir(e.target.value as SortDir)}>
                <option value="desc">내림차순</option>
                <option value="asc">오름차순</option>
              </select>
              <input
                type="number"
                min={1}
                max={500}
                value={ledgerLimit}
                onChange={(e) => {
                  const next = Math.min(500, Math.max(1, Number(e.target.value) || 1));
                  setLedgerLimit(next);
                  setLedgerPage(0);
                }}
                className="w-28 rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                title="표시 개수 (1-500)"
              />
              <SecondaryButton onClick={() => ledgerQuery.refetch()} disabled={ledgerQuery.isFetching}>
                새로고침
              </SecondaryButton>
            </div>
          </div>

          {ledgerQuery.isError && (
            <div className="rounded-lg border border-red-500/40 bg-red-950 p-3 text-sm text-red-100">원장 조회 실패</div>
          )}

          <div className="rounded-lg border border-[#333333] bg-[#111111] px-4 py-3 text-sm text-gray-300">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                선택 <span className="font-medium text-white">{Object.values(selectedLedgerIds).filter(Boolean).length}</span>건
                <span className="ml-2 text-gray-500">(선택 행은 하이라이트됩니다)</span>
              </div>
              <div className="flex gap-2">
                <SecondaryButton
                  onClick={() => {
                    setSelectedLedgerIds({});
                    setExpandedLedgerId(null);
                  }}
                  disabled={Object.values(selectedLedgerIds).filter(Boolean).length === 0 && expandedLedgerId === null}
                >
                  선택/상세 초기화
                </SecondaryButton>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#333333] bg-[#111111] shadow-md">
            <div className="max-h-[520px] overflow-auto">
              <table className="min-w-[1100px] w-full">
                <thead className="sticky top-0 z-10 border-b border-[#333333] bg-[#1A1A1A]">
                  <tr>
                    <th className="w-12 px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        aria-label="현재 페이지 전체 선택"
                        className="h-4 w-4 rounded border-[#333333] bg-[#1A1A1A] text-[#91F402] focus:ring-[#2D6B3B]"
                        checked={
                          ledgerVisibleRows.length > 0 && ledgerVisibleRows.every((r) => selectedLedgerIds[r.id])
                        }
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSelectedLedgerIds((prev) => {
                            const next = { ...prev };
                            for (const r of ledgerVisibleRows) {
                              next[r.id] = checked;
                            }
                            return next;
                          });
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">id</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">external_id</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">토큰</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">증감</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">잔액</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">사유</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">라벨</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">시각</th>
                    <th className="w-24 px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">상세</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333333]">
                  {ledgerVisibleRows.map((row, idx) => {
                    const selected = !!selectedLedgerIds[row.id];
                    const expanded = expandedLedgerId === row.id;
                    const baseRowBg = idx % 2 === 0 ? "bg-[#111111]" : "bg-[#1A1A1A]";
                    const selectedBg = selected ? "bg-[#2D6B3B]/20" : "";
                    return (
                      <React.Fragment key={row.id}>
                        <tr className={`${baseRowBg} ${selectedBg} hover:bg-[#2C2C2E]`}>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              aria-label={`원장 ${row.id} 선택`}
                              className="h-4 w-4 rounded border-[#333333] bg-[#1A1A1A] text-[#91F402] focus:ring-[#2D6B3B]"
                              checked={selected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedLedgerIds((prev) => ({ ...prev, [row.id]: checked }));
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">{row.id}</td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-white">{row.external_id ?? row.user_id}</div>
                            <div className="text-xs text-gray-500">user_id: {row.user_id}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-200">{GAME_TOKEN_LABELS[row.token_type]}</td>
                          <td className={"px-4 py-3 text-right text-sm font-semibold " + (row.delta >= 0 ? "text-[#91F402]" : "text-red-300")}>
                            {row.delta}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-white">{row.balance_after}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">{row.reason ?? "-"}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">{row.label ?? "-"}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-400">{formatTime(row.created_at)}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              className={
                                expanded
                                  ? "rounded-md bg-[#2D6B3B] px-3 py-1 text-xs font-medium text-[#91F402]"
                                  : "rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-1 text-xs font-medium text-gray-200 hover:bg-[#2C2C2E]"
                              }
                              onClick={() => setExpandedLedgerId((prev) => (prev === row.id ? null : row.id))}
                            >
                              {expanded ? "닫기" : "보기"}
                            </button>
                          </td>
                        </tr>

                        {expanded && (
                          <tr className="bg-[#0A0A0A]">
                            <td colSpan={10} className="px-6 py-4">
                              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                <div className="rounded-lg border border-[#333333] bg-[#111111] p-4">
                                  <div className="text-sm font-medium text-[#91F402]">메타(JSON)</div>
                                  <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-[#333333] bg-[#1A1A1A] p-3 text-xs text-gray-200">
                                    {prettyJson(row.meta_json)}
                                  </pre>
                                </div>
                                <div className="rounded-lg border border-[#333333] bg-[#111111] p-4">
                                  <div className="text-sm font-medium text-[#91F402]">요약</div>
                                  <div className="mt-2 space-y-2 text-sm text-gray-200">
                                    <div>
                                      <span className="text-gray-400">external_id:</span> {row.external_id ?? "-"}
                                    </div>
                                    <div>
                                      <span className="text-gray-400">reason:</span> {row.reason ?? "-"}
                                    </div>
                                    <div>
                                      <span className="text-gray-400">label:</span> {row.label ?? "-"}
                                    </div>
                                    <div>
                                      <span className="text-gray-400">created_at:</span> {formatTime(row.created_at)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {ledgerQuery.isLoading && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                        불러오는 중...
                      </td>
                    </tr>
                  )}
                  {!ledgerQuery.isLoading && ledgerVisibleRows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                        데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[#333333] bg-[#111111] px-4 py-3 text-sm text-gray-300">
            <div>
              페이지 <span className="font-medium text-white">{ledgerPage + 1}</span>
              <span className="ml-2 text-gray-500">(표시: {ledgerLimit}개)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={
                  ledgerPage === 0 || ledgerQuery.isFetching
                    ? "rounded-md border border-[#333333] bg-[#111111] px-3 py-2 text-gray-600"
                    : "rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-gray-200 hover:bg-[#2C2C2E]"
                }
                disabled={ledgerPage === 0 || ledgerQuery.isFetching}
                onClick={() => setLedgerPage((p) => Math.max(0, p - 1))}
              >
                이전
              </button>
              <button
                type="button"
                className={
                  (ledgerQuery.data?.length ?? 0) < ledgerLimit || ledgerQuery.isFetching
                    ? "rounded-md border border-[#333333] bg-[#111111] px-3 py-2 text-gray-600"
                    : "rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-gray-200 hover:bg-[#2C2C2E]"
                }
                disabled={(ledgerQuery.data?.length ?? 0) < ledgerLimit || ledgerQuery.isFetching}
                onClick={() => setLedgerPage((p) => p + 1)}
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "revoke" && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#91F402]">티켓 회수</h3>
              <p className="mt-1 text-xs text-gray-500">잔액 부족 시 NOT_ENOUGH_TOKENS가 반환될 수 있습니다.</p>
            </div>
          </div>

          <div className="rounded-lg border border-red-500/30 bg-red-950/40 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={revokeExternalId}
                onChange={(e) => setRevokeExternalId(e.target.value)}
                placeholder="external_id"
                className={inputClass}
              />
              <select className={selectClass} value={revokeTokenType} onChange={(e) => setRevokeTokenType(e.target.value as GameTokenType)}>
                {tokenOptions.map((t) => (
                  <option key={t} value={t}>
                    {GAME_TOKEN_LABELS[t]}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="amount"
                className={inputClass}
                value={Number.isFinite(revokeAmount) ? String(revokeAmount) : "0"}
                onChange={(e) => setRevokeAmount(e.target.value ? Number(e.target.value) : 0)}
              />
            </div>

            {revokeMutation.isError && (
              <div className="mt-3 rounded-md border border-red-500/40 bg-red-950 p-3 text-sm text-red-100">
                {(revokeMutation.error as Error)?.message ?? "회수 실패"}
              </div>
            )}
            {revokeResult && (
              <div className="mt-3 rounded-md border border-[#2D6B3B] bg-[#0A0A0A] p-3 text-sm text-gray-200">
                회수 완료: {revokeResult.external_id ?? revokeResult.user_id} / {GAME_TOKEN_LABELS[revokeResult.token_type]} 잔액 {revokeResult.balance}
              </div>
            )}

            <div className="mt-3 flex justify-end gap-2">
              <SecondaryButton
                onClick={() => {
                  setRevokeAmount(0);
                  setRevokeResult(null);
                }}
              >
                입력 초기화
              </SecondaryButton>
              <button
                type="button"
                disabled={revokeDisabled || revokeMutation.isPending}
                onClick={() => {
                  const ext = revokeExternalId.trim();
                  if (!ext) return;
                  revokeMutation.mutate({ external_id: ext, token_type: revokeTokenType, amount: revokeAmount });
                }}
                className="inline-flex items-center justify-center rounded-md bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {revokeMutation.isPending ? "회수 중..." : "티켓 회수"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default GameTokenLogsPage;

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Coins,
  History,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../../components/common/ToastProvider";
import {
  fetchAdminUserInventory,
  fetchAdminUserInventoryByIdentifier,
} from "../api/adminInventoryApi";
import {
  fetchLedgerByUserId,
  fetchWalletsByUserId,
  grantGameTokens,
  revokeGameTokens,
} from "../api/adminGameTokenApi";
import { GameTokenType } from "../../types/gameTokens";

interface UserGameTokenModalProps {
  memberId: number | string;
  isOpen: boolean;
  onClose: () => void;
  nickname?: string;
  defaultTab?: ActiveTab;
}

type ActionMode = "grant" | "revoke";
type ActiveTab = "grant" | "history";

const TOKEN_GROUPS: Array<{ label: string; keys: GameTokenType[] }> = [
  {
    label: "게임 토큰",
    keys: ["ROULETTE_COIN", "DICE_TOKEN", "LOTTERY_TICKET", "TRIAL_TOKEN"],
  },
  { label: "금고 열쇠", keys: ["GOLD_KEY", "DIAMOND_KEY"] },
  { label: "재화", keys: ["DIAMOND"] },
  { label: "퍼즐", keys: ["PUZZLE_C1", "PUZZLE_C2", "PUZZLE_J", "PUZZLE_M"] },
];

const TOKEN_LABELS: Partial<Record<GameTokenType, string>> = {
  ROULETTE_COIN: "룰렛 코인",
  DICE_TOKEN: "주사위 토큰",
  LOTTERY_TICKET: "복권 티켓",
  TRIAL_TOKEN: "체험 토큰",
  GOLD_KEY: "황금 열쇠",
  DIAMOND_KEY: "다이아 키",
  DIAMOND: "다이아",
  PUZZLE_C1: "퍼즐 C1",
  PUZZLE_C2: "퍼즐 C2",
  PUZZLE_J: "퍼즐 J",
  PUZZLE_M: "퍼즐 M",
};

const UserGameTokenModal: React.FC<UserGameTokenModalProps> = ({
  memberId,
  isOpen,
  onClose,
  nickname,
  defaultTab,
}) => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>(defaultTab ?? "grant");
  const [actionMode, setActionMode] = useState<ActionMode>("grant");
  const [tokenType, setTokenType] = useState<GameTokenType>("GOLD_KEY");
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [ledgerFilter, setLedgerFilter] = useState<GameTokenType | "">("");

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(defaultTab ?? "grant");
  }, [defaultTab, isOpen]);

  const userId = typeof memberId === "number" ? memberId : Number(memberId);
  const isNumericId = Number.isFinite(userId);
  const identifier = String(memberId ?? "").trim();
  const actionLabel = actionMode === "grant" ? "지급" : "회수";

  const walletsQuery = useQuery({
    queryKey: ["admin", "game-tokens", "wallets", memberId],
    queryFn: () =>
      isNumericId ? fetchWalletsByUserId(userId, 100, 0) : Promise.resolve([]),
    enabled: isOpen && isNumericId,
  });

  const inventoryQuery = useQuery({
    queryKey: ["user-inventory", memberId],
    queryFn: () =>
      isNumericId
        ? fetchAdminUserInventory(userId, 50)
        : fetchAdminUserInventoryByIdentifier(identifier, 50),
    enabled: isOpen,
  });

  const ledgerQuery = useQuery({
    queryKey: ["admin", "game-tokens", "ledger", memberId],
    queryFn: () =>
      isNumericId ? fetchLedgerByUserId(userId, 200, 0) : Promise.resolve([]),
    enabled: isOpen && activeTab === "history" && isNumericId,
  });

  const walletBalances = useMemo(() => {
    const map = new Map<string, number>();
    (walletsQuery.data ?? []).forEach((wallet) => {
      map.set(wallet.token_type, wallet.balance);
    });
    return map;
  }, [walletsQuery.data]);

  const diamondBalance = useMemo(() => {
    const items = inventoryQuery.data?.items ?? [];
    return items.find((item) => item.item_type === "DIAMOND")?.quantity ?? 0;
  }, [inventoryQuery.data?.items]);

  const formatTokenLabel = (key: GameTokenType) =>
    `${key} (${TOKEN_LABELS[key] ?? key})`;

  const getTokenBalance = (key: GameTokenType) => {
    if (key === "DIAMOND") return diamondBalance;
    return walletBalances.get(key) ?? 0;
  };

  const combinedLedger = useMemo(() => {
    const walletLogs = (ledgerQuery.data ?? []).map((entry) => ({
      id: `wallet-${entry.id}`,
      token_type: entry.token_type as GameTokenType,
      delta: entry.delta,
      balance_after: entry.balance_after,
      reason: entry.reason || entry.label || "-",
      label: entry.label,
      source: "wallet" as const,
      created_at: entry.created_at,
    }));

    const diamondLogs = (inventoryQuery.data?.ledger ?? [])
      .filter((log) => log.item_type === "DIAMOND")
      .map((log) => ({
        id: `inventory-${log.id}`,
        token_type: "DIAMOND" as GameTokenType,
        delta: log.change_amount,
        balance_after: log.balance_after,
        reason: log.reason || "-",
        label: null,
        source: "inventory" as const,
        created_at: log.created_at,
      }));

    const merged = [...walletLogs, ...diamondLogs];
    merged.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    if (!ledgerFilter) return merged;
    return merged.filter((entry) => entry.token_type === ledgerFilter);
  }, [inventoryQuery.data?.ledger, ledgerFilter, ledgerQuery.data]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "game-tokens"] });
    queryClient.invalidateQueries({
      queryKey: ["admin", "game-tokens", "wallets"],
    });
    queryClient.invalidateQueries({
      queryKey: ["admin", "game-tokens", "ledger"],
    });
    queryClient.invalidateQueries({
      queryKey: ["user-token-ledger", memberId],
    });
    queryClient.invalidateQueries({ queryKey: ["user-inventory", memberId] });
  };

  const grantMutation = useMutation({
    mutationFn: () =>
      grantGameTokens({
        user_identifier: String(memberId),
        token_type: tokenType,
        amount,
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      addToast("지급이 완료되었습니다.", "success");
      invalidateAll();
      walletsQuery.refetch();
      inventoryQuery.refetch();
      ledgerQuery.refetch();
      setAmount(0);
      setReason("");
      setActiveTab("history");
    },
    onError: (err: any) => {
      addToast(err.response?.data?.detail || "지급 실패", "error");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: () =>
      revokeGameTokens({
        user_identifier: String(memberId),
        token_type: tokenType,
        amount,
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      addToast("회수가 완료되었습니다.", "success");
      invalidateAll();
      walletsQuery.refetch();
      inventoryQuery.refetch();
      ledgerQuery.refetch();
      setAmount(0);
      setReason("");
      setActiveTab("history");
    },
    onError: (err: any) => {
      addToast(err.response?.data?.detail || "회수 실패", "error");
    },
  });

  const isSubmitting = grantMutation.isPending || revokeMutation.isPending;
  const canSubmit = amount > 0 && !isSubmitting && Boolean(tokenType);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="admin-card w-full max-w-3xl max-h-[90vh] flex flex-col shadow-admin-glow border-admin-brand/20">
        {/* Header */}
        <div className="p-6 border-b border-admin-border flex items-center justify-between bg-admin-sidebar/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-admin-brand/20 text-admin-brand">
              <Coins size={24} />
            </div>
            <div>
              <h2 className="text-admin-subtitle text-admin-text-primary">
                게임 코드/토큰 제어
              </h2>
              <p className="text-admin-meta text-admin-text-muted">
                {nickname || memberId} 회원 자산 관리
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            title="닫기"
            className="p-2 text-admin-text-muted hover:text-admin-text-primary hover:bg-admin-hover rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-6 pt-4 border-b border-admin-border bg-admin-sidebar/30">
          <button
            onClick={() => setActiveTab("grant")}
            className={`px-4 py-2 text-admin-meta font-bold border-b-2 transition-all ${activeTab === "grant" ? "border-admin-brand text-admin-brand" : "border-transparent text-admin-text-muted hover:text-admin-text-secondary"}`}
          >
            지급/회수
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-admin-meta font-bold border-b-2 transition-all ${activeTab === "history" ? "border-admin-brand text-admin-brand" : "border-transparent text-admin-text-muted hover:text-admin-text-secondary"}`}
          >
            변경 이력
          </button>
          <div className="ml-auto flex items-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => {
                walletsQuery.refetch();
                inventoryQuery.refetch();
                ledgerQuery.refetch();
              }}
              className="btn-admin-secondary text-admin-meta px-3 py-1.5"
              disabled={
                walletsQuery.isFetching ||
                inventoryQuery.isFetching ||
                ledgerQuery.isFetching
              }
              title="새로고침"
              aria-label="새로고침"
            >
              <RefreshCw
                size={14}
                className={
                  walletsQuery.isFetching ||
                  inventoryQuery.isFetching ||
                  ledgerQuery.isFetching
                    ? "animate-spin"
                    : ""
                }
              />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {!isNumericId && (
            <div className="mb-6 rounded-xl border border-admin-danger/30 bg-admin-danger/10 p-4 text-admin-danger text-sm">
              숫자 회원 ID를 확인할 수 없습니다. 회원 식별자를 다시 확인해
              주세요.
            </div>
          )}

          {/* Balance Summary */}
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {TOKEN_GROUPS.flatMap((group) => group.keys).map((key) => (
              <div
                key={key}
                className="rounded-xl border border-admin-border/60 bg-admin-sidebar/40 p-3"
              >
                <div className="text-[10px] text-admin-text-muted font-bold uppercase tracking-widest">
                  {TOKEN_LABELS[key]}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-admin-text-secondary font-mono">
                    {key}
                  </span>
                  <span className="text-base font-black text-admin-brand">
                    {getTokenBalance(key).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {activeTab === "grant" ? (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActionMode("grant")}
                  className={`px-3 py-1.5 rounded-full text-xs font-black ${actionMode === "grant" ? "bg-admin-brand text-white" : "bg-admin-sidebar text-admin-text-muted"}`}
                >
                  지급
                </button>
                <button
                  type="button"
                  onClick={() => setActionMode("revoke")}
                  className={`px-3 py-1.5 rounded-full text-xs font-black ${actionMode === "revoke" ? "bg-admin-danger text-white" : "bg-admin-sidebar text-admin-text-muted"}`}
                >
                  회수
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor={`user-game-token-type-${memberId}`}
                    className="admin-label"
                  >
                    토큰 유형
                  </label>
                  <select
                    id={`user-game-token-type-${memberId}`}
                    value={tokenType}
                    onChange={(e) =>
                      setTokenType(e.target.value as GameTokenType)
                    }
                    aria-label="토큰 유형"
                    title="토큰 유형"
                    className="w-full h-11 bg-admin-sidebar/50 border border-admin-border rounded-admin-lg px-4 text-admin-text-primary focus:ring-2 focus:ring-admin-brand/40 outline-none appearance-none"
                  >
                    {TOKEN_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.keys.map((key) => (
                          <option key={key} value={key}>
                            {formatTokenLabel(key)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="text-[11px] text-admin-text-muted">
                    현재 보유: {getTokenBalance(tokenType).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="admin-label">수량</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="admin-input w-full"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="admin-label">지급 사유</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-24 bg-admin-sidebar/50 border border-admin-border rounded-admin-lg p-4 text-admin-text-primary focus:ring-2 focus:ring-admin-brand/40 outline-none resize-none placeholder:text-admin-text-muted"
                  placeholder="지급 사유를 입력하세요 (예: 이벤트 보상, 버그 보상 등)"
                />
              </div>

              <div className="p-4 rounded-xl bg-admin-brand/5 border border-admin-brand/10 flex items-start gap-3">
                <AlertCircle size={18} className="text-admin-brand mt-0.5" />
                <p className="text-admin-meta text-admin-text-secondary leading-relaxed">
                  토큰을 {actionLabel}하면 즉시 회원의 지갑/인벤토리에 반영되며,
                  운영 트랜잭션 전적에 영구히 기록됩니다. 신중하게 작업해
                  주세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 text-admin-text-muted text-xs">
                  <History size={14} />
                  최근 변경 이력
                </div>
                <div className="ml-auto">
                  <select
                    value={ledgerFilter}
                    onChange={(e) =>
                      setLedgerFilter(e.target.value as GameTokenType | "")
                    }
                    className="admin-input h-9 text-xs"
                    aria-label="토큰 필터"
                  >
                    <option value="">전체 토큰</option>
                    {TOKEN_GROUPS.flatMap((group) => group.keys).map((key) => (
                      <option key={key} value={key}>
                        {formatTokenLabel(key)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {ledgerQuery.isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-admin-text-muted gap-3">
                    <Loader2
                      size={32}
                      className="animate-spin text-admin-brand"
                    />
                    <p className="text-admin-meta">
                      변경 이력을 불러오는 중입니다...
                    </p>
                  </div>
                ) : combinedLedger.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-admin-text-muted border-2 border-dashed border-admin-border rounded-2xl">
                    <History size={40} className="mb-3 opacity-20" />
                    <p className="text-admin-meta">변경 이력이 없습니다.</p>
                  </div>
                ) : (
                  combinedLedger.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 rounded-xl bg-admin-sidebar/40 border border-admin-border flex items-center justify-between hover:bg-admin-hover transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-lg ${entry.delta > 0 ? "bg-admin-accent/10 text-admin-accent" : "bg-admin-danger/10 text-admin-danger"}`}
                        >
                          {entry.delta > 0 ? (
                            <Plus size={16} />
                          ) : (
                            <Minus size={16} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-admin-body font-bold text-admin-text-primary">
                              {formatTokenLabel(entry.token_type)}
                            </span>
                            <span
                              className={`text-admin-body font-black ${entry.delta > 0 ? "text-admin-accent" : "text-admin-danger"}`}
                            >
                              {entry.delta > 0
                                ? `+${entry.delta}`
                                : entry.delta}
                            </span>
                            <span className="text-[10px] text-admin-text-muted bg-admin-bg/40 px-1.5 py-0.5 rounded">
                              {entry.source === "wallet"
                                ? "WALLET"
                                : "INVENTORY"}
                            </span>
                          </div>
                          <p className="text-admin-meta text-admin-text-muted leading-tight mt-0.5">
                            {entry.reason}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-admin-meta text-admin-text-primary mb-1">
                          잔액: {entry.balance_after.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-admin-text-muted font-mono">
                          {new Date(entry.created_at).toLocaleString("ko-KR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-admin-border bg-admin-sidebar/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-admin-secondary text-admin-meta px-4 border-none"
          >
            닫기
          </button>
          {activeTab === "grant" && (
            <button
              onClick={() => {
                if (!canSubmit) return;
                if (actionMode === "grant") grantMutation.mutate();
                else revokeMutation.mutate();
              }}
              disabled={!canSubmit}
              className="btn-admin-primary min-w-[140px]"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  {actionLabel} 확정
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserGameTokenModal;

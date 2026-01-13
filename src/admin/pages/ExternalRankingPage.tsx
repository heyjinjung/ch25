// src/admin/pages/ExternalRankingPage.tsx
import React, { useEffect, useRef, useState } from "react";
import { Plus, Save, Search, RefreshCw, Trash2, ChevronLeft, ChevronRight, Hash, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteExternalRanking,
  ExternalRankingPayload,
  fetchExternalRankingList,
  upsertExternalRanking,
} from "../api/adminExternalRankingApi";
import { resolveAdminUser } from "../api/adminUserApi";
import { formatKstDateTime } from "../../utils/kstTime";

type EditableRow = ExternalRankingPayload & {
  id?: number;
  created_at?: string;
  updated_at?: string;
  __isNew?: boolean;
  __key: string;
};

type SortDir = "asc" | "desc";
type SortKey = "identifier" | "deposit_amount" | "play_count" | "memo";

type ResolveRowStatus =
  | { state: "idle" }
  | { state: "loading" }
  | {
    state: "ok";
    user: {
      id: number;
      external_id?: string | null;
      nickname?: string | null;
      tg_id?: number | null;
      tg_username?: string | null;
      real_name?: string | null;
      phone_number?: string | null;
    };
  }
  | { state: "error"; message: string };

const formatTgUsername = (username?: string | null) => {
  const u = String(username ?? "").trim();
  if (!u) return "-";
  return u.startsWith("@") ? u : `@${u}`;
};

const newRowKey = () => `new:${Date.now()}:${Math.random().toString(16).slice(2)}`;

const formatKst = (iso?: string) => formatKstDateTime(iso);

const ExternalRankingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "external-ranking"],
    queryFn: fetchExternalRankingList,
  });

  const [rows, setRows] = useState<EditableRow[]>([]);
  const newRowInputRef = useRef<HTMLInputElement | null>(null);
  const [rowSearchInput, setRowSearchInput] = useState<string>("");
  const [rowSearchApplied, setRowSearchApplied] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState<number>(0);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const [resolveStatusByKey, setResolveStatusByKey] = useState<Record<string, ResolveRowStatus>>({});

  const [sortKey, setSortKey] = useState<SortKey>("identifier");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    if (data?.items) {
      const mappedRows: EditableRow[] = data.items.map((item) => ({
        __key: `id:${item.id}`,
        id: item.id,
        user_id: item.user_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        // Input field is a unified identifier string.
        external_id: item.telegram_username ?? item.external_id ?? "",
        telegram_username: item.telegram_username ?? "",
        deposit_amount: item.deposit_amount,
        play_count: item.play_count,
        memo: item.memo ?? "",
        __isNew: false,
      }));
      setRows(mappedRows);
      setIsDirty(false);
      setPage(0);
      const initialResolve: Record<string, ResolveRowStatus> = {};
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const key = `id:${item.id}`;
        if (item.user) {
          initialResolve[key] = {
            state: "ok",
            user: {
              id: item.user.id,
              external_id: item.user.external_id,
              nickname: item.user.nickname,
              tg_id: item.user.tg_id,
              tg_username: item.user.tg_username,
              real_name: item.user.real_name,
              phone_number: item.user.phone_number,
            },
          };
        } else {
          initialResolve[key] = { state: "idle" };
        }
      }
      setResolveStatusByKey(initialResolve);
    }
  }, [data]);

  const upsertMutation = useMutation({
    mutationFn: (payloads: ExternalRankingPayload[]) => upsertExternalRanking(payloads),
    onSuccess: (res) => {
      // 즉시 UI??반영 ???�버 ?�이?�도 ?�로고침
      if (res?.items) {
        queryClient.setQueryData(["admin", "external-ranking"], res);
        const mappedRows: EditableRow[] = res.items.map((item) => ({
          __key: `id:${item.id}`,
          id: item.id,
          user_id: item.user_id,
          created_at: item.created_at,
          updated_at: item.updated_at,
          external_id: item.telegram_username ?? item.external_id ?? "",
          telegram_username: item.telegram_username ?? "",
          deposit_amount: item.deposit_amount,
          play_count: item.play_count,
          memo: item.memo ?? "",
          __isNew: false,
        }));
        setRows(mappedRows);
        const nextResolve: Record<string, ResolveRowStatus> = {};
        for (const item of res.items) {
          const key = `id:${item.id}`;
          if (item.user) {
            nextResolve[key] = {
              state: "ok",
              user: {
                id: item.user.id,
                external_id: item.user.external_id,
                nickname: item.user.nickname,
                tg_id: item.user.tg_id,
                tg_username: item.user.tg_username,
                real_name: item.user.real_name,
                phone_number: item.user.phone_number,
              },
            };
          } else {
            nextResolve[key] = { state: "idle" };
          }
        }
        setResolveStatusByKey(nextResolve);
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "external-ranking"] });
      setIsDirty(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteExternalRanking(userId),
    onSuccess: (_res, userId) => {
      // ??�� 직후 목록?�서 ?�거?�고 ?�버 ?�이?�도 ?�로고침
      setRows((prev) => prev.filter((row) => row.user_id !== userId));
      queryClient.invalidateQueries({ queryKey: ["admin", "external-ranking"] });
    },
  });

  const handleChange = (index: number, field: keyof EditableRow, value: string | number) => {
    setRows((prev) =>
      prev.map((row, idx) =>
        idx === index
          ? {
            ...row,
            [field]:
              field === "deposit_amount" || field === "play_count" || field === "user_id"
                ? Number(value)
                : value,
          }
          : row
      )
    );
    setIsDirty(true);
    if (field === "external_id") {
      const key = rows[index]?.__key;
      if (key) setResolveStatusByKey((prev) => ({ ...prev, [key]: { state: "idle" } }));
    }
  };

  const addRow = () => {
    setRowSearchInput("");
    setRowSearchApplied("");
    setPage(0);
    const key = newRowKey();
    setRows((prev) => [
      { __key: key, external_id: "", telegram_username: "", deposit_amount: 0, play_count: 0, memo: "", __isNew: true },
      ...prev.map((r) => ({ ...r, __isNew: false })),
    ]);
    setIsDirty(true);
    setResolveStatusByKey((prev) => ({ ...prev, [key]: { state: "idle" } }));
    setTimeout(() => newRowInputRef.current?.focus(), 0);
  };

  const removeRow = (index: number) => {
    const target = rows[index];
    if (target?.user_id) {
      deleteMutation.mutate(target.user_id);
    }
    const key = target?.__key;
    setRows((prev) => prev.filter((_, idx) => idx !== index));
    setIsDirty(true);
    if (key) {
      setResolveStatusByKey((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const resolveOne = async (index: number) => {
    const identifier = String(rows[index]?.external_id ?? "").trim();
    const key = rows[index]?.__key;
    if (!identifier) {
      if (key) setResolveStatusByKey((prev) => ({ ...prev, [key]: { state: "idle" } }));
      return true;
    }

    if (key) setResolveStatusByKey((prev) => ({ ...prev, [key]: { state: "loading" } }));
    try {
      const res = await resolveAdminUser(identifier);
      if (key) {
        setResolveStatusByKey((prev) => ({
          ...prev,
          [key]: {
            state: "ok",
            user: {
              id: res.user.id,
              external_id: res.user.external_id,
              nickname: res.user.nickname,
              tg_id: res.user.tg_id,
              tg_username: res.user.tg_username,
              real_name: res.user.real_name,
              phone_number: res.user.phone_number,
            },
          },
        }));
      }
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "매칭 실패";
      if (key) setResolveStatusByKey((prev) => ({ ...prev, [key]: { state: "error", message: String(msg) } }));
      return false;
    }
  };

  const resolveAllBeforeSave = async () => {
    const indices = rows
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => String(r.external_id ?? "").trim().length > 0)
      .map(({ idx }) => idx);

    // Avoid calling resolve repeatedly when nothing changed since last verify.
    if (!isDirty && indices.every((i) => resolveStatusByKey[rows[i].__key]?.state === "ok")) return true;

    const results = await Promise.all(indices.map((i) => resolveOne(i)));
    const ok = results.every(Boolean);
    return ok;
  };

  const saveAll = async () => {
    const ok = await resolveAllBeforeSave();
    if (!ok) return;

    const payloads: ExternalRankingPayload[] = rows
      .filter((row) => !!String(row.external_id ?? "").trim())
      .map((row) => ({
        // Unified identifier input; backend resolver handles @username/tg_*/nickname/external_id.
        external_id: String(row.external_id ?? "").trim(),
        deposit_amount: row.deposit_amount ?? 0,
        play_count: row.play_count ?? 0,
        memo: row.memo,
      }));
    upsertMutation.mutate(payloads);
  };

  const normalize = (value: unknown) => String(value ?? "").toLowerCase();
  const includesAny = (hay: string, needle: string) => {
    const n = needle.trim().toLowerCase();
    if (!n) return true;
    return hay.includes(n);
  };

  const applyRowSearch = () => {
    setRowSearchApplied(rowSearchInput.trim());
    setPage(0);
  };

  const clearRowSearch = () => {
    setRowSearchInput("");
    setRowSearchApplied("");
    setPage(0);
  };

  const compareStr = (a: string, b: string, dir: SortDir) => (dir === "asc" ? a.localeCompare(b) : b.localeCompare(a));
  const compareNum = (a: number, b: number, dir: SortDir) => (dir === "asc" ? a - b : b - a);
  const toggleSort = (k: SortKey) => {
    if (sortKey !== k) {
      setSortKey(k);
      setSortDir(k === "identifier" || k === "memo" ? "asc" : "desc");
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const visible = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      if (!rowSearchApplied.trim()) return true;
      const hay = normalize(`${row.external_id ?? ""} ${row.telegram_username ?? ""} ${row.user_id ?? ""} ${row.deposit_amount ?? ""} ${row.play_count ?? ""} ${row.memo ?? ""}`);
      return includesAny(hay, rowSearchApplied);
    });

  const sortedVisible = [...visible].sort((a, b) => {
    if (!!a.row.__isNew !== !!b.row.__isNew) return a.row.__isNew ? -1 : 1;

    if (sortKey === "deposit_amount") return compareNum(a.row.deposit_amount ?? 0, b.row.deposit_amount ?? 0, sortDir);
    if (sortKey === "play_count") return compareNum(a.row.play_count ?? 0, b.row.play_count ?? 0, sortDir);
    if (sortKey === "memo") return compareStr(String(a.row.memo ?? ""), String(b.row.memo ?? ""), sortDir);
    return compareStr(String(a.row.external_id ?? ""), String(b.row.external_id ?? ""), sortDir);
  });

  const totalVisible = sortedVisible.length;
  const totalPages = Math.max(1, Math.ceil(totalVisible / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalVisible);
  const pageItems = sortedVisible.slice(pageStart, pageEnd);


  return (
    <section className="admin-page-container space-y-10 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-admin-text-base tracking-tight uppercase">
            외부 랭킹 관리 <span className="text-admin-brand/40">External Ranking</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={addRow}
            className="btn-admin-secondary flex items-center gap-2 px-5 py-2.5 h-auto text-sm"
          >
            <Plus className="h-4 w-4" /> 행 추가
          </button>
          <button
            onClick={saveAll}
            disabled={upsertMutation.isPending || !isDirty}
            className="btn-admin-primary flex items-center gap-2 px-6 py-2.5 h-auto text-sm shadow-lg shadow-admin-brand/20 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {upsertMutation.isPending ? "저장 중..." : "전체 저장 (Save All)"}
          </button>
        </div>
      </header>

      {isLoading && (
        <div className="admin-card p-4 text-admin-body text-admin-text-secondary">불러오는 중...</div>
      )}
      {isError && (
        <div className="admin-card p-4 text-admin-body text-red-200">불러오기 실패: {(error as Error).message}</div>
      )}

      {/* Transparent Search & Controls */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between px-2">
        <div className="flex-1 max-w-xl">
          <label className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3 block ml-1">매칭 데이터 검색 (Search)</label>
          <div className="relative group">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-admin-brand transition-colors" />
            <input
              value={rowSearchInput}
              onChange={(e) => setRowSearchInput(e.target.value)}
              className="w-full bg-transparent border-b border-zinc-800 py-2.5 pl-8 text-sm text-zinc-200 focus:outline-none focus:border-admin-brand transition-colors placeholder:text-zinc-600 font-medium"
              placeholder="식별자 / 메모 / User ID 검색..."
              onKeyDown={(e) => {
                if (e.key === "Enter") applyRowSearch();
              }}
            />
            {rowSearchInput && (
              <button
                onClick={clearRowSearch}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={applyRowSearch}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95"
          >
            검색 적용 (Search)
          </button>
          {rowSearchApplied && (
            <button
              onClick={clearRowSearch}
              className="px-4 py-2 text-zinc-500 hover:text-zinc-300 text-xs font-bold transition-colors"
            >
              초기화
            </button>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-6 ml-auto">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase text-zinc-500 font-black tracking-widest">ROWS</span>
            <select
              className="bg-zinc-900 border border-zinc-800 rounded-lg pr-8 pl-3 py-1.5 text-xs font-bold text-zinc-300 focus:border-admin-brand outline-none appearance-none cursor-pointer"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <div className="text-right">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter mb-0.5">Showing Results</p>
            <p className="text-xs font-black font-mono text-zinc-400">
              {totalVisible === 0 ? "0" : pageStart + 1}-{pageEnd} <span className="text-zinc-600">/</span> {totalVisible}
            </p>
          </div>
        </div>
      </div>

      <div className="admin-card-premium overflow-hidden mt-6">
        <div className="overflow-x-auto custom-scrollbar max-h-[700px]">
          <table className="admin-table sticky-header">
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-800">
                <th className="px-4 py-3 text-left text-sm font-bold text-zinc-500 uppercase tracking-widest w-[240px]">
                  <button type="button" onClick={() => toggleSort("identifier")} className="flex items-center gap-2 group hover:text-zinc-300 transition-colors">
                    <Hash className="h-4 w-4" />
                    <span>식별자 (Identifier)</span>
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-zinc-500 uppercase tracking-widest">텔레그램 정보 (TG Info)</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-zinc-500 uppercase tracking-widest">프로필 (Profile)</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-zinc-500 uppercase tracking-widest font-black text-admin-brand">매칭유저 (Matched)</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-zinc-500 uppercase tracking-widest">최종 동기화 (Sync)</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-zinc-500 uppercase tracking-widest cursor-pointer hover:text-zinc-300" onClick={() => toggleSort("deposit_amount")}>입금액 (Deposit)</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-zinc-500 uppercase tracking-widest cursor-pointer hover:text-zinc-300" onClick={() => toggleSort("play_count")}>플레이 (Plays)</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-zinc-500 uppercase tracking-widest">메모 (Memo)</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-zinc-500 uppercase tracking-widest">관리 (Action)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border/30">
              {pageItems.map(({ row, index }) => {
                const status = resolveStatusByKey[row.__key];
                const lastInputAt = row.updated_at || row.created_at;
                return (
                  <tr
                    key={row.__key}
                    className={`
                      group hover:bg-white/[0.04] transition-colors border-b border-zinc-800/10
                      ${row.__isNew ? "bg-admin-brand/5 hover:bg-admin-brand/10" : ""}
                    `}
                  >
                    <td className="px-4 py-3 min-w-[240px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            value={row.external_id ?? ""}
                            onChange={(e) => handleChange(index, "external_id", e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-sm font-mono text-zinc-200 focus:ring-0 placeholder:text-zinc-700"
                            placeholder="@ID / 닉네임"
                            ref={row.__isNew ? newRowInputRef : null}
                          />
                          {String(row.external_id ?? "").trim() && (
                            <div className="flex items-center gap-2 h-5">
                              {status?.state === "loading" ? (
                                <RefreshCw className="h-3 w-3 text-admin-brand animate-spin" />
                              ) : status?.state === "ok" ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-px rounded border border-emerald-500/20">
                                  VERIFIED
                                </span>
                              ) : status?.state === "error" ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-rose-400 bg-rose-500/10 px-1.5 py-px rounded border border-rose-500/20">
                                  NOT FOUND
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => resolveOne(index)}
                                  className="text-[9px] font-bold uppercase text-zinc-500 hover:text-admin-brand underline decoration-zinc-700 underline-offset-2 transition-colors"
                                >
                                  Verify Identity
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {status?.state === "ok" ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-mono font-bold text-zinc-300">{status.user.tg_id ?? "-"}</span>
                          <span className="text-[11px] text-zinc-500 font-bold">{formatTgUsername(status.user.tg_username)}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-700 text-xs font-bold">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {status?.state === "ok" ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-zinc-300 font-black">
                            {status.user.real_name || "-"}
                          </span>
                          <span className="text-[11px] text-zinc-600 font-mono font-bold tracking-tighter">
                            {status.user.phone_number || "-"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-700 text-xs font-black">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {status?.state === "ok" ? (
                        <span className="text-sm font-black text-admin-brand uppercase tracking-tight">{status.user.nickname ?? "-"}</span>
                      ) : (
                        <span className="text-zinc-700 text-xs font-black">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-zinc-500 font-mono font-medium">
                        {formatKst(lastInputAt)?.split(" ")[0] || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right relative group/cell">
                      <span className={`text-sm font-black font-mono tracking-tight tabular-nums ${row.deposit_amount ? "text-emerald-400" : "text-zinc-700"}`}>
                        {row.deposit_amount ? row.deposit_amount.toLocaleString() : "0"}
                      </span>
                      {/* Hidden input for editing logic if we want to support inline edit later, currently Read-Only as per design doc */}
                      {/* If editing IS required, we should use a modal or a toggle. For now, assuming direct Input -> Text change based on "Read-Only Data Display" requirement. 
                            However, the logic requires 'handleChange'. Let's keep a tiny hidden input or just render text?
                            Wait, if it's read-only, how do we INPUT data for new rows?
                            Ah, for NEW rows we need inputs. For existing rows, maybe read-only? 
                            The requirement said "Convert... to read-only text". 
                            Let's interpret this as: Display as text, but click-to-edit OR just keep as input but style as text?
                            "Deposit/Plays 값을 입력창에서 순수 텍스트(Text)로 변경" implies strict read-only look.
                            But this table IS the input form. 
                            Let's style the INPUT to look like text (transparent, no border) but keep functionality. */}
                      <input
                        type="number"
                        value={row.deposit_amount}
                        onChange={(e) => handleChange(index, "deposit_amount", Number(e.target.value))}
                        className="w-full bg-transparent text-right text-xs text-transparent focus:text-white absolute inset-0 opacity-0 focus:opacity-100 cursor-pointer"
                        placeholder="0"
                        min={0}
                      />
                      {/* Re-thinking: The user wants to "remove clutter". A transparent input on top of text is a good pattern. */}
                    </td>
                    <td className="px-4 py-3 text-right relative group/cell">
                      <span className={`text-sm font-black font-mono tracking-tight tabular-nums ${row.play_count ? "text-zinc-300" : "text-zinc-700"}`}>
                        {row.play_count ? row.play_count.toLocaleString() : "0"}
                      </span>
                      <input
                        type="number"
                        value={row.play_count}
                        onChange={(e) => handleChange(index, "play_count", Number(e.target.value))}
                        className="w-full bg-transparent text-right text-xs text-transparent focus:text-white absolute inset-0 opacity-0 focus:opacity-100 cursor-pointer"
                        placeholder="0"
                        min={0}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.memo ?? ""}
                        onChange={(e) => handleChange(index, "memo", e.target.value)}
                        className="w-full bg-transparent text-sm text-zinc-400 placeholder:text-zinc-800 focus:text-white focus:outline-none"
                        placeholder="..."
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeRow(index)}
                        className="p-2 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all active:scale-90"
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-admin-text-muted text-sm italic" colSpan={9}>
                    데이터가 존재하지 않습니다. 행을 추가하여 입력을 시작하세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-12 px-2 bg-admin-sidebar/20 p-6 rounded-2xl border border-white/5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage <= 0}
            className="p-2.5 rounded-xl border border-admin-border text-admin-text-secondary hover:bg-admin-sidebar hover:text-white disabled:opacity-20 transition-all active:scale-95"
            aria-label="이전 페이지"
            title="이전 페이지"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-9 h-9 rounded-xl text-xs font-black transition-all active:scale-90 ${safePage === i ? "bg-admin-brand text-white shadow-lg shadow-admin-brand/20" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                  }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="p-2.5 rounded-xl border border-admin-border text-admin-text-secondary hover:bg-admin-sidebar hover:text-white disabled:opacity-20 transition-all active:scale-95"
            aria-label="다음 페이지"
            title="다음 페이지"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">PUBLISH DATA</span>
            <span className="text-xs text-zinc-500 font-medium">변경된 모든 데이터를 서버에 동기화합니다.</span>
          </div>
          <button
            onClick={saveAll}
            disabled={upsertMutation.isPending || !isDirty}
            className="btn-admin-primary px-10 py-3 rounded-xl text-sm font-black shadow-lg shadow-admin-brand/20 active:scale-95 transition-all flex items-center gap-2"
          >
            {upsertMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {upsertMutation.isPending ? "동기화 중..." : "전체 저장 (Save All)"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default ExternalRankingPage;

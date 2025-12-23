// src/admin/pages/UserSegmentsPage.tsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchUserSegments, upsertUserSegment, type AdminUserSegmentRow } from "../api/adminSegmentsApi";
import { SEGMENT_LABELS_KO, segmentLabelKo, shouldShowLabelKo } from "../constants/segmentLabels";

const formatMaybeDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

const UserSegmentsPage: React.FC = () => {
  const [externalId, setExternalId] = useState<string>("");
  const trimmed = useMemo(() => externalId.trim(), [externalId]);

  type SortDir = "asc" | "desc";
  type SortKey =
    | "external_id"
    | "segment"
    | "roulette_plays"
    | "dice_plays"
    | "lottery_plays"
    | "total_play_duration"
    | "last_login_at"
    | "last_charge_at"
    | "segment_updated_at"
    | "activity_updated_at";

  const [sortKey, setSortKey] = useState<SortKey>("last_login_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const inputBase =
    "w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]";

  const PrimaryButton = ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button
      type="button"
      className="inline-flex items-center rounded-md bg-[#2D6B3B] px-4 py-2 text-sm font-medium text-white hover:bg-[#91F402] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
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
      className="inline-flex items-center rounded-md border border-[#333333] bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-gray-200 hover:bg-[#2C2C2E] disabled:cursor-not-allowed disabled:opacity-60"
      {...props}
    >
      {children}
    </button>
  );

  const queryKey = useMemo(() => ["admin", "segments", { external_id: trimmed || undefined }] as const, [trimmed]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    // NOTE: Backend caps limit to 500. When searching by external_id we keep it small,
    // otherwise we fetch the maximum to approximate "전체" 조회 without pagination UI.
    queryFn: () => fetchUserSegments(trimmed ? { external_id: trimmed, limit: 50 } : { limit: 500 }),
  });

  const [editSegment, setEditSegment] = useState<Record<number, string>>({});
  const [savingUserId, setSavingUserId] = useState<number | null>(null);

  const updateMutation = useMutation({
    mutationFn: (payload: { user_id: number; segment: string }) => upsertUserSegment(payload),
    onSuccess: async () => {
      await refetch();
    },
  });

  const rows: AdminUserSegmentRow[] = data ?? [];

  const compareStr = (a: string, b: string, dir: SortDir) => (dir === "asc" ? a.localeCompare(b) : b.localeCompare(a));
  const compareNum = (a: number, b: number, dir: SortDir) => (dir === "asc" ? a - b : b - a);
  const compareDate = (a: string | null | undefined, b: string | null | undefined, dir: SortDir) => {
    const at = a ? new Date(a).getTime() : 0;
    const bt = b ? new Date(b).getTime() : 0;
    return compareNum(Number.isFinite(at) ? at : 0, Number.isFinite(bt) ? bt : 0, dir);
  };

  const visibleRows = useMemo(() => {
    const base = rows;
    const sorted = [...base].sort((a, b) => {
      if (sortKey === "roulette_plays") return compareNum(a.roulette_plays ?? 0, b.roulette_plays ?? 0, sortDir);
      if (sortKey === "dice_plays") return compareNum(a.dice_plays ?? 0, b.dice_plays ?? 0, sortDir);
      if (sortKey === "lottery_plays") return compareNum(a.lottery_plays ?? 0, b.lottery_plays ?? 0, sortDir);
      if (sortKey === "total_play_duration") return compareNum(a.total_play_duration ?? 0, b.total_play_duration ?? 0, sortDir);
      if (sortKey === "last_login_at") return compareDate(a.last_login_at, b.last_login_at, sortDir);
      if (sortKey === "last_charge_at") return compareDate(a.last_charge_at, b.last_charge_at, sortDir);
      if (sortKey === "segment_updated_at") return compareDate(a.segment_updated_at, b.segment_updated_at, sortDir);
      if (sortKey === "activity_updated_at") return compareDate(a.activity_updated_at, b.activity_updated_at, sortDir);
      if (sortKey === "segment") return compareStr((a.segment ?? "").trim(), (b.segment ?? "").trim(), sortDir);
      return compareStr((a.external_id ?? "").trim(), (b.external_id ?? "").trim(), sortDir);
    });
    return sorted;
  }, [rows, sortKey, sortDir]);

  const handleSearch = async () => {
    await refetch();
  };

  const handleSave = async (row: AdminUserSegmentRow) => {
    const next = (editSegment[row.user_id] ?? row.segment).trim();
    if (!next) return;
    setSavingUserId(row.user_id);
    try {
      await updateMutation.mutateAsync({ user_id: row.user_id, segment: next });
      setEditSegment((prev) => {
        const cp = { ...prev };
        delete cp[row.user_id];
        return cp;
      });
    } finally {
      setSavingUserId(null);
    }
  };

  const toggleSort = (nextKey: SortKey) => {
    if (sortKey !== nextKey) {
      setSortKey(nextKey);
      setSortDir("asc");
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const SortHeader = ({ label, k, className }: { label: string; k: SortKey; className?: string }) => (
    <th className={className ?? "px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-200"
        title="정렬"
      >
        <span>{label}</span>
        <span className={sortKey === k ? "text-[#91F402]" : "text-gray-600"}>{sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-2xl font-bold text-[#91F402]">사용자 분류 (세그먼트)</h2>
        <p className="mt-1 text-sm text-gray-400">external_id로 조회 후 세그먼트를 수동 수정할 수 있습니다.</p>
      </header>

      <div className="rounded-lg border border-[#333333] bg-[#111111] p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col">
              <label className="text-xs text-gray-400">external_id</label>
              <input
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                className={inputBase + " max-w-sm"}
                placeholder="external_id로 검색..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSearch();
                }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <SecondaryButton onClick={handleSearch} disabled={isLoading}>
              검색 적용
            </SecondaryButton>
            <SecondaryButton
              onClick={() => {
                setExternalId("");
                void refetch();
              }}
            >
              초기화
            </SecondaryButton>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <div>
            결과: <span className="font-medium text-gray-200">{rows.length}</span>
            <span className="ml-2 text-gray-600">(필터 없음 조회는 최대 500)</span>
          </div>
          <div>
            정렬: <span className="text-gray-300">{sortKey}</span> <span className="text-gray-600">{sortDir}</span>
          </div>
        </div>

        {isLoading && (
          <div className="mt-3 rounded-lg border border-[#333333] bg-[#111111] p-3 text-gray-200">불러오는 중...</div>
        )}
        {isError && (
          <div className="mt-3 rounded-lg border border-red-700/40 bg-red-950 p-3 text-red-100">
            불러오기 실패: {(error as any)?.message ?? "요청에 실패했습니다."}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-[#333333] bg-[#111111] shadow-md">
        <div className="max-h-[640px] overflow-auto">
          <table className="w-full table-fixed">
            <thead className="sticky top-0 z-10 border-b border-[#333333] bg-[#1A1A1A]">
            <tr>
              <SortHeader label="external_id" k="external_id" className="w-[14ch] px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider" />
              <SortHeader label="세그먼트" k="segment" />
              <th className="w-60 px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => toggleSort("roulette_plays")} className="text-gray-400 hover:text-gray-200" title="룰렛 정렬">
                    룰렛{sortKey === "roulette_plays" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                  <button type="button" onClick={() => toggleSort("dice_plays")} className="text-gray-400 hover:text-gray-200" title="주사위 정렬">
                    주사위{sortKey === "dice_plays" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                  <button type="button" onClick={() => toggleSort("lottery_plays")} className="text-gray-400 hover:text-gray-200" title="복권 정렬">
                    복권{sortKey === "lottery_plays" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                  <button type="button" onClick={() => toggleSort("total_play_duration")} className="text-gray-400 hover:text-gray-200" title="플레이 시간 정렬">
                    시간{sortKey === "total_play_duration" ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                  </button>
                </div>
              </th>
              <SortHeader label="마지막 로그인" k="last_login_at" className="hidden px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider xl:table-cell" />
              <SortHeader label="마지막 충전" k="last_charge_at" className="hidden px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider xl:table-cell" />
              <SortHeader label="세그 변경" k="segment_updated_at" className="hidden px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider 2xl:table-cell" />
              <SortHeader label="활동 업데이트" k="activity_updated_at" className="hidden px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider 2xl:table-cell" />
              <th className="w-28 px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333333]">
            {visibleRows.length === 0 && !isLoading ? (
              <tr>
                <td className="px-4 py-10 text-center text-gray-400" colSpan={8}>
                  조회 결과가 없습니다.
                </td>
              </tr>
            ) : (
              visibleRows.map((row, idx) => (
                <tr
                  key={row.user_id}
                  className={(idx % 2 === 0 ? "bg-[#111111]" : "bg-[#1A1A1A]") + " text-white"}
                >
                  <td className="px-4 py-3 align-top">
                    <span className="block truncate" title={row.external_id}>
                      {row.external_id}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex min-w-0 items-center gap-2">
                      <datalist id="segment-suggestions">
                        {Object.keys(SEGMENT_LABELS_KO).map((k) => (
                          <option key={k} value={k} />
                        ))}
                      </datalist>
                      <input
                        value={editSegment[row.user_id] ?? row.segment}
                        onChange={(e) => setEditSegment((prev) => ({ ...prev, [row.user_id]: e.target.value }))}
                        className={inputBase + " px-2 py-1 text-xs"}
                        placeholder="예: NEW / VIP"
                        title={segmentLabelKo(editSegment[row.user_id] ?? row.segment)}
                        list="segment-suggestions"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleSave(row);
                        }}
                      />
                      {shouldShowLabelKo(editSegment[row.user_id] ?? row.segment) && (
                        <span
                          className="hidden max-w-[14rem] truncate rounded-md border border-[#333333] bg-[#111111] px-2 py-1 text-xs text-gray-200 lg:inline"
                          title={segmentLabelKo(editSegment[row.user_id] ?? row.segment)}
                        >
                          {segmentLabelKo(editSegment[row.user_id] ?? row.segment)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-gray-300">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md border border-[#333333] bg-[#111111] px-2 py-1">룰렛 {row.roulette_plays}</span>
                      <span className="rounded-md border border-[#333333] bg-[#111111] px-2 py-1">주사위 {row.dice_plays}</span>
                      <span className="rounded-md border border-[#333333] bg-[#111111] px-2 py-1">복권 {row.lottery_plays}</span>
                      <span className="rounded-md border border-[#333333] bg-[#111111] px-2 py-1">t {row.total_play_duration}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 align-top text-xs text-gray-300 xl:table-cell">
                    <span className="block truncate" title={formatMaybeDate(row.last_login_at)}>
                      {formatMaybeDate(row.last_login_at)}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 align-top text-xs text-gray-300 xl:table-cell">
                    <span className="block truncate" title={formatMaybeDate(row.last_charge_at)}>
                      {formatMaybeDate(row.last_charge_at)}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 align-top text-xs text-gray-300 2xl:table-cell">
                    <span className="block truncate" title={formatMaybeDate(row.segment_updated_at)}>
                      {formatMaybeDate(row.segment_updated_at)}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 align-top text-xs text-gray-300 2xl:table-cell">
                    <span className="block truncate" title={formatMaybeDate(row.activity_updated_at)}>
                      {formatMaybeDate(row.activity_updated_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-center">
                    {(() => {
                      const current = (editSegment[row.user_id] ?? row.segment).trim();
                      const original = (row.segment ?? "").trim();
                      const dirty = current !== original;
                      const disabled = !dirty || updateMutation.isPending;
                      return (
                        <div className="flex flex-col items-center gap-1">
                          <PrimaryButton onClick={() => void handleSave(row)} disabled={disabled}>
                            {savingUserId === row.user_id ? "저장중" : "저장"}
                          </PrimaryButton>
                          {dirty ? <span className="text-[11px] text-[#91F402]">변경됨</span> : <span className="text-[11px] text-gray-600">-</span>}
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default UserSegmentsPage;

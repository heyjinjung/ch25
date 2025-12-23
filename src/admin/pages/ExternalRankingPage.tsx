// src/admin/pages/ExternalRankingPage.tsx
import React, { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteExternalRanking,
  ExternalRankingPayload,
  fetchExternalRankingList,
  upsertExternalRanking,
} from "../api/adminExternalRankingApi";

type EditableRow = ExternalRankingPayload & { id?: number; __isNew?: boolean };

type SortDir = "asc" | "desc";
type SortKey = "external_id" | "deposit_amount" | "play_count" | "memo";

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

  const [sortKey, setSortKey] = useState<SortKey>("external_id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    if (data?.items) {
      setRows(
        data.items.map((item) => ({
          id: item.id,
          user_id: item.user_id,
          external_id: item.external_id,
          deposit_amount: item.deposit_amount,
          play_count: item.play_count,
          memo: item.memo ?? "",
          __isNew: false,
        }))
      );
      setIsDirty(false);
      setPage(0);
    }
  }, [data]);

  const upsertMutation = useMutation({
    mutationFn: (payloads: ExternalRankingPayload[]) => upsertExternalRanking(payloads),
    onSuccess: (res) => {
      // 즉시 UI에 반영 후 서버 데이터도 새로고침
      if (res?.items) {
        queryClient.setQueryData(["admin", "external-ranking"], res);
        setRows(
          res.items.map((item) => ({
            id: item.id,
            user_id: item.user_id,
            external_id: item.external_id,
            deposit_amount: item.deposit_amount,
            play_count: item.play_count,
            memo: item.memo ?? "",
          }))
        );
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "external-ranking"] });
      setIsDirty(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteExternalRanking(userId),
    onSuccess: (_res, userId) => {
      // 삭제 직후 목록에서 제거하고 서버 데이터도 새로고침
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
  };

  const addRow = () => {
    setRowSearchInput("");
    setRowSearchApplied("");
    setPage(0);
    setRows((prev) => [
      { external_id: "", deposit_amount: 0, play_count: 0, memo: "", __isNew: true },
      ...prev.map((r) => ({ ...r, __isNew: false })),
    ]);
    setIsDirty(true);
    setTimeout(() => newRowInputRef.current?.focus(), 0);
  };

  const removeRow = (index: number) => {
    const target = rows[index];
    if (target?.user_id) {
      deleteMutation.mutate(target.user_id);
    }
    setRows((prev) => prev.filter((_, idx) => idx !== index));
    setIsDirty(true);
  };

  const saveAll = () => {
    const payloads: ExternalRankingPayload[] = rows
      .filter((row) => !!row.external_id)
      .map((row) => ({
        external_id: row.external_id,
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
      setSortDir(k === "external_id" || k === "memo" ? "asc" : "desc");
      return;
    }
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  const visible = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      if (!rowSearchApplied.trim()) return true;
      const hay = normalize(`${row.external_id ?? ""} ${row.user_id ?? ""} ${row.deposit_amount ?? ""} ${row.play_count ?? ""} ${row.memo ?? ""}`);
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

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#91F402]">랭킹 입력</h2>
          <p className="mt-1 text-sm text-gray-400">타 플랫폼 입금/게임횟수를 수기로 적어 랭킹에 반영합니다. 숫자는 0 이상으로 입력하세요.</p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton onClick={addRow}>
            <Plus size={18} className="mr-2" />
            행 추가
          </SecondaryButton>
          <PrimaryButton onClick={saveAll} disabled={upsertMutation.isPending || !isDirty}>
            {upsertMutation.isPending ? "저장 중..." : "전체 저장"}
          </PrimaryButton>
        </div>
      </header>

      {isLoading && (
        <div className="rounded-lg border border-[#333333] bg-[#111111] p-4 text-gray-200">불러오는 중...</div>
      )}
      {isError && (
        <div className="rounded-lg border border-red-500/40 bg-red-950 p-4 text-red-100">불러오기 실패: {(error as Error).message}</div>
      )}

      <div className="rounded-lg border border-[#333333] bg-[#111111] px-4 py-3 text-sm text-gray-300">
        총 <span className="font-medium text-white">{rows.length}</span>행
        {rowSearchApplied ? (
          <span className="ml-2 text-gray-500">(검색 적용: {totalVisible}행)</span>
        ) : (
          <span className="ml-2 text-gray-500">(입력 후 전체 저장을 누르세요)</span>
        )}
        <span className="ml-3 text-xs text-gray-500">변경사항: {isDirty ? "있음" : "없음"}</span>
      </div>

      <div className="rounded-lg border border-[#333333] bg-[#0A0A0A] p-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-gray-400">행 검색(적용형)</label>
            <input
              value={rowSearchInput}
              onChange={(e) => setRowSearchInput(e.target.value)}
              className={inputBase + " w-72"}
              placeholder="external_id / memo / user_id"
              onKeyDown={(e) => {
                if (e.key === "Enter") applyRowSearch();
              }}
            />
          </div>
          <SecondaryButton onClick={applyRowSearch}>검색 적용</SecondaryButton>
          <SecondaryButton onClick={clearRowSearch} disabled={!rowSearchInput && !rowSearchApplied}>
            초기화
          </SecondaryButton>

          <div className="ml-auto flex flex-wrap items-end gap-2">
            <div className="flex flex-col">
              <label className="text-xs text-gray-400">페이지 크기</label>
              <select
                className={inputBase + " w-32"}
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
            <div className="text-xs text-gray-500">{totalVisible === 0 ? "0" : pageStart + 1}-{pageEnd} / {totalVisible}</div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#333333] bg-[#111111] shadow-md">
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 border-b border-[#333333] bg-[#1A1A1A]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <button type="button" onClick={() => toggleSort("external_id")} className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-200" title="정렬">
                    external_id
                    <span className={sortKey === "external_id" ? "text-[#91F402]" : "text-gray-600"}>
                      {sortKey === "external_id" ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <button type="button" onClick={() => toggleSort("deposit_amount")} className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-200" title="정렬">
                    입금액
                    <span className={sortKey === "deposit_amount" ? "text-[#91F402]" : "text-gray-600"}>
                      {sortKey === "deposit_amount" ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <button type="button" onClick={() => toggleSort("play_count")} className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-200" title="정렬">
                    게임횟수
                    <span className={sortKey === "play_count" ? "text-[#91F402]" : "text-gray-600"}>
                      {sortKey === "play_count" ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <button type="button" onClick={() => toggleSort("memo")} className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-200" title="정렬">
                    메모
                    <span className={sortKey === "memo" ? "text-[#91F402]" : "text-gray-600"}>
                      {sortKey === "memo" ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333333]">
              {pageItems.map(({ row, index }, viewIdx) => (
                <tr
                  key={index}
                  className={
                    row.__isNew
                      ? "bg-[#2D6B3B]/20"
                      : viewIdx % 2 === 0
                      ? "bg-[#111111]"
                      : "bg-[#1A1A1A]"
                  }
                >
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.external_id ?? ""}
                      onChange={(e) => handleChange(index, "external_id", e.target.value)}
                      className={inputBase}
                      placeholder="external_id"
                      ref={row.__isNew ? newRowInputRef : null}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={row.deposit_amount}
                      onChange={(e) => handleChange(index, "deposit_amount", Number(e.target.value))}
                      className={inputBase + " text-right"}
                      min={0}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={row.play_count}
                      onChange={(e) => handleChange(index, "play_count", Number(e.target.value))}
                      className={inputBase + " text-right"}
                      min={0}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.memo ?? ""}
                      onChange={(e) => handleChange(index, "memo", e.target.value)}
                      className={inputBase}
                      placeholder="예: 5만원 입금"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      disabled={deleteMutation.isPending}
                      className="rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm font-medium text-gray-200 hover:bg-red-950 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-gray-400" colSpan={5}>
                    아직 입력된 데이터가 없습니다. “행 추가”로 시작하세요.
                  </td>
                </tr>
              )}
              {rows.length > 0 && totalVisible === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-gray-400" colSpan={5}>
                    검색 결과가 없습니다. “초기화”를 눌러 전체를 확인하세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#333333] bg-[#0A0A0A] p-3">
          <div className="text-xs text-gray-500">페이지 {safePage + 1} / {totalPages}</div>
          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage <= 0}
            >
              이전
            </SecondaryButton>
            <SecondaryButton
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
            >
              다음
            </SecondaryButton>
            <PrimaryButton onClick={saveAll} disabled={upsertMutation.isPending || !isDirty}>
              {upsertMutation.isPending ? "저장 중..." : "전체 저장"}
            </PrimaryButton>
          </div>
        </div>
      )}
    </section>
  );
};

export default ExternalRankingPage;

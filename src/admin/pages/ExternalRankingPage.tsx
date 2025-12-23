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

const ExternalRankingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "external-ranking"],
    queryFn: fetchExternalRankingList,
  });

  const [rows, setRows] = useState<EditableRow[]>([]);
  const newRowInputRef = useRef<HTMLInputElement | null>(null);

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
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { external_id: "", deposit_amount: 0, play_count: 0, memo: "", __isNew: true },
    ]);
    setTimeout(() => newRowInputRef.current?.focus(), 0);
  };

  const removeRow = (index: number) => {
    const target = rows[index];
    if (target?.user_id) {
      deleteMutation.mutate(target.user_id);
    }
    setRows((prev) => prev.filter((_, idx) => idx !== index));
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
          <PrimaryButton onClick={saveAll} disabled={upsertMutation.isPending}>
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
        <span className="ml-2 text-gray-500">(입력 후 전체 저장을 누르세요)</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#333333] bg-[#111111] shadow-md">
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 border-b border-[#333333] bg-[#1A1A1A]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">external_id</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">입금액</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">게임횟수</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">메모</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333333]">
              {rows.map((row, idx) => (
                <tr
                  key={idx}
                  className={
                    row.__isNew
                      ? "bg-[#2D6B3B]/20"
                      : idx % 2 === 0
                      ? "bg-[#111111]"
                      : "bg-[#1A1A1A]"
                  }
                >
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.external_id ?? ""}
                      onChange={(e) => handleChange(idx, "external_id", e.target.value)}
                      className={inputBase}
                      placeholder="external_id"
                      ref={idx === rows.length - 1 && row.__isNew ? newRowInputRef : null}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={row.deposit_amount}
                      onChange={(e) => handleChange(idx, "deposit_amount", Number(e.target.value))}
                      className={inputBase + " text-right"}
                      min={0}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={row.play_count}
                      onChange={(e) => handleChange(idx, "play_count", Number(e.target.value))}
                      className={inputBase + " text-right"}
                      min={0}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.memo ?? ""}
                      onChange={(e) => handleChange(idx, "memo", e.target.value)}
                      className={inputBase}
                      placeholder="예: 5만원 입금"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
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
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default ExternalRankingPage;

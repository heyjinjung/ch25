// src/admin/pages/ExternalRankingPage.tsx
import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteExternalRanking,
  ExternalRankingPayload,
  fetchExternalRankingList,
  upsertExternalRanking,
} from "../api/adminExternalRankingApi";
import Button from "../../components/common/Button";

type EditableRow = ExternalRankingPayload & { id?: number };

const ExternalRankingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "external-ranking"],
    queryFn: fetchExternalRankingList,
  });

  const [rows, setRows] = useState<EditableRow[]>([]);

  useEffect(() => {
    if (data?.items) {
      setRows(
        data.items.map((item) => ({
          id: item.id,
          user_id: item.user_id,
          deposit_amount: item.deposit_amount,
          play_count: item.play_count,
          memo: item.memo ?? "",
        }))
      );
    }
  }, [data]);

  const upsertMutation = useMutation({
    mutationFn: (payloads: ExternalRankingPayload[]) => upsertExternalRanking(payloads),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "external-ranking"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteExternalRanking(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "external-ranking"] });
    },
  });

  const handleChange = (index: number, field: keyof EditableRow, value: string | number) => {
    setRows((prev) =>
      prev.map((row, idx) =>
        idx === index
          ? {
              ...row,
              [field]: field === "memo" ? value : Number(value),
            }
          : row
      )
    );
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { user_id: 0, deposit_amount: 0, play_count: 0, memo: "" },
    ]);
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
      .filter((row) => row.user_id > 0)
      .map((row) => ({
        user_id: row.user_id,
        deposit_amount: row.deposit_amount ?? 0,
        play_count: row.play_count ?? 0,
        memo: row.memo,
      }));
    upsertMutation.mutate(payloads);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-100">외부 랭킹 입력</h1>
        <p className="text-sm text-slate-300">
          타 플랫폼 입금/게임횟수를 수기로 적어 랭킹에 반영합니다. 숫자는 0 이상으로 입력하세요.
        </p>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-emerald-800/40 bg-slate-900 p-4 text-slate-200">
          불러오는 중...
        </div>
      )}
      {isError && (
        <div className="rounded-lg border border-red-500/40 bg-red-950 p-4 text-red-100">
          불러오기 실패: {(error as Error).message}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex justify-between">
          <Button variant="secondary" onClick={addRow}>
            행 추가
          </Button>
          <Button onClick={saveAll} disabled={upsertMutation.isPending}>
            {upsertMutation.isPending ? "저장 중..." : "전체 저장"}
          </Button>
        </div>

        <div className="overflow-auto rounded-lg border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 bg-slate-900 text-sm text-slate-100">
            <thead className="bg-slate-800/60">
              <tr>
                <th className="px-3 py-2 text-left">User ID</th>
                <th className="px-3 py-2 text-left">입금액</th>
                <th className="px-3 py-2 text-left">게임횟수</th>
                <th className="px-3 py-2 text-left">메모</th>
                <th className="px-3 py-2 text-right">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={row.user_id}
                      onChange={(e) => handleChange(idx, "user_id", Number(e.target.value))}
                      className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-right"
                      min={0}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={row.deposit_amount}
                      onChange={(e) => handleChange(idx, "deposit_amount", Number(e.target.value))}
                      className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-right"
                      min={0}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={row.play_count}
                      onChange={(e) => handleChange(idx, "play_count", Number(e.target.value))}
                      className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-right"
                      min={0}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={row.memo ?? ""}
                      onChange={(e) => handleChange(idx, "memo", e.target.value)}
                      className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1"
                      placeholder="예: 5만원 입금"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="secondary" onClick={() => removeRow(idx)} disabled={deleteMutation.isPending}>
                      삭제
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-slate-400" colSpan={5}>
                    아직 입력된 데이터가 없습니다. "행 추가" 버튼을 눌러주세요.
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

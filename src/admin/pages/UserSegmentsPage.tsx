// src/admin/pages/UserSegmentsPage.tsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Button from "../../components/common/Button";
import { fetchUserSegments, upsertUserSegment, type AdminUserSegmentRow } from "../api/adminSegmentsApi";
import { segmentLabelKo, shouldShowLabelKo } from "../constants/segmentLabels";

const formatMaybeDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

const UserSegmentsPage: React.FC = () => {
  const [externalId, setExternalId] = useState<string>("");
  const trimmed = useMemo(() => externalId.trim(), [externalId]);

  const queryKey = useMemo(() => ["admin", "segments", { external_id: trimmed || undefined }] as const, [trimmed]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    // NOTE: Backend caps limit to 500. When searching by external_id we keep it small,
    // otherwise we fetch the maximum to approximate "전체" 조회 without pagination UI.
    queryFn: () => fetchUserSegments(trimmed ? { external_id: trimmed, limit: 50 } : { limit: 500 }),
  });

  const [editSegment, setEditSegment] = useState<Record<number, string>>({});

  const updateMutation = useMutation({
    mutationFn: (payload: { user_id: number; segment: string }) => upsertUserSegment(payload),
    onSuccess: async () => {
      await refetch();
    },
  });

  const rows: AdminUserSegmentRow[] = data ?? [];

  const handleSearch = async () => {
    await refetch();
  };

  const handleSave = async (row: AdminUserSegmentRow) => {
    const next = (editSegment[row.user_id] ?? row.segment).trim();
    if (!next) return;
    await updateMutation.mutateAsync({ user_id: row.user_id, segment: next });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-emerald-200">유저 세그먼트</h1>
        <p className="text-sm text-slate-300">외부 ID(external_id)로 조회 후 세그먼트를 수동 수정할 수 있습니다.</p>
      </header>

      <section className="rounded-2xl border border-emerald-800/40 bg-slate-900/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-200">외부 ID(external_id)</label>
            <input
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="예: test-qa-999"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={isLoading}>
              검색
            </Button>
            <Button
              onClick={() => {
                setExternalId("");
                void refetch();
              }}
              variant="secondary"
            >
              초기화
            </Button>
          </div>
        </div>
        {isError && (
          <div className="mt-3 rounded-lg border border-red-700/40 bg-red-900/20 px-3 py-2 text-sm text-red-200">
            {(error as any)?.message ?? "요청에 실패했습니다."}
          </div>
        )}
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/60 text-slate-200">
            <tr>
              <th className="whitespace-nowrap px-3 py-2 text-left">유저 ID</th>
              <th className="whitespace-nowrap px-3 py-2 text-left">외부 ID</th>
              <th className="whitespace-nowrap px-3 py-2 text-left">세그먼트</th>
              <th className="hidden whitespace-nowrap px-3 py-2 text-left xl:table-cell">세그 변경시각</th>
              <th className="whitespace-nowrap px-3 py-2 text-left">플레이</th>
              <th className="hidden whitespace-nowrap px-3 py-2 text-left lg:table-cell">마지막 로그인</th>
              <th className="hidden whitespace-nowrap px-3 py-2 text-left lg:table-cell">마지막 충전</th>
              <th className="hidden whitespace-nowrap px-3 py-2 text-left xl:table-cell">마지막 보너스 사용</th>
              <th className="hidden whitespace-nowrap px-3 py-2 text-left xl:table-cell">활동 업데이트</th>
              <th className="whitespace-nowrap px-3 py-2 text-left">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 && !isLoading ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-400" colSpan={10}>
                  조회 결과가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.user_id} className="text-slate-100">
                  <td className="px-3 py-2 align-top">{row.user_id}</td>
                  <td className="px-3 py-2 align-top">
                    <span className="block max-w-[14rem] truncate" title={row.external_id}>
                      {row.external_id}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center gap-2">
                      <input
                        value={editSegment[row.user_id] ?? row.segment}
                        onChange={(e) => setEditSegment((prev) => ({ ...prev, [row.user_id]: e.target.value }))}
                        className="w-40 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                        placeholder="예: NEW / VIP"
                        title={segmentLabelKo(editSegment[row.user_id] ?? row.segment)}
                      />
                      {shouldShowLabelKo(editSegment[row.user_id] ?? row.segment) && (
                        <span className="whitespace-nowrap text-xs text-slate-400">
                          {segmentLabelKo(editSegment[row.user_id] ?? row.segment)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-3 py-2 align-top text-xs text-slate-300 xl:table-cell">
                    {formatMaybeDate(row.segment_updated_at)}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-slate-300">
                    <div className="whitespace-nowrap">룰렛 {row.roulette_plays} · 주사위 {row.dice_plays}</div>
                    <div className="whitespace-nowrap">복권 {row.lottery_plays} · t {row.total_play_duration}</div>
                  </td>
                  <td className="hidden px-3 py-2 align-top text-xs text-slate-300 lg:table-cell">{formatMaybeDate(row.last_login_at)}</td>
                  <td className="hidden px-3 py-2 align-top text-xs text-slate-300 lg:table-cell">{formatMaybeDate(row.last_charge_at)}</td>
                  <td className="hidden px-3 py-2 align-top text-xs text-slate-300 xl:table-cell">{formatMaybeDate(row.last_bonus_used_at)}</td>
                  <td className="hidden px-3 py-2 align-top text-xs text-slate-300 xl:table-cell">{formatMaybeDate(row.activity_updated_at)}</td>
                  <td className="px-3 py-2 align-top">
                    <Button
                      onClick={() => void handleSave(row)}
                      disabled={updateMutation.isPending}
                    >
                      저장
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default UserSegmentsPage;

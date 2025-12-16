// src/admin/pages/UserSegmentsPage.tsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Button from "../../components/common/Button";
import { fetchUserSegments, upsertUserSegment, type AdminUserSegmentRow } from "../api/adminSegmentsApi";

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
    queryFn: () => fetchUserSegments(trimmed ? { external_id: trimmed, limit: 50 } : { limit: 50 }),
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
        <h1 className="text-2xl font-bold text-emerald-200">User Segments</h1>
        <p className="text-sm text-slate-300">external_id로 조회 후 segment를 수동 수정할 수 있습니다.</p>
      </header>

      <section className="rounded-2xl border border-emerald-800/40 bg-slate-900/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-200">external_id</label>
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
              <th className="px-3 py-2 text-left">user_id</th>
              <th className="px-3 py-2 text-left">external_id</th>
              <th className="px-3 py-2 text-left">segment</th>
              <th className="px-3 py-2 text-left">segment_updated_at</th>
              <th className="px-3 py-2 text-left">plays</th>
              <th className="px-3 py-2 text-left">last_login_at</th>
              <th className="px-3 py-2 text-left">last_charge_at</th>
              <th className="px-3 py-2 text-left">last_bonus_used_at</th>
              <th className="px-3 py-2 text-left">activity_updated_at</th>
              <th className="px-3 py-2 text-left">actions</th>
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
                  <td className="px-3 py-2 align-top">{row.external_id}</td>
                  <td className="px-3 py-2 align-top">
                    <input
                      value={editSegment[row.user_id] ?? row.segment}
                      onChange={(e) => setEditSegment((prev) => ({ ...prev, [row.user_id]: e.target.value }))}
                      className="w-48 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                      placeholder="NEW / VIP / DORMANT_SHORT ..."
                    />
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-slate-300">{formatMaybeDate(row.segment_updated_at)}</td>
                  <td className="px-3 py-2 align-top text-xs text-slate-300">
                    R:{row.roulette_plays} D:{row.dice_plays} L:{row.lottery_plays} · t:{row.total_play_duration}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-slate-300">{formatMaybeDate(row.last_login_at)}</td>
                  <td className="px-3 py-2 align-top text-xs text-slate-300">{formatMaybeDate(row.last_charge_at)}</td>
                  <td className="px-3 py-2 align-top text-xs text-slate-300">{formatMaybeDate(row.last_bonus_used_at)}</td>
                  <td className="px-3 py-2 align-top text-xs text-slate-300">{formatMaybeDate(row.activity_updated_at)}</td>
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

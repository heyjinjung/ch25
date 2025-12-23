// src/admin/pages/UserSegmentsPage.tsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
              <th className="w-[14ch] px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">external_id</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">세그먼트</th>
              <th className="w-56 px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">플레이</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider xl:table-cell">마지막 로그인</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider xl:table-cell">마지막 충전</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider 2xl:table-cell">세그 변경</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider 2xl:table-cell">활동 업데이트</th>
              <th className="w-28 px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333333]">
            {rows.length === 0 && !isLoading ? (
              <tr>
                <td className="px-4 py-10 text-center text-gray-400" colSpan={8}>
                  조회 결과가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.user_id}
                  className={(row.user_id % 2 === 0 ? "bg-[#111111]" : "bg-[#1A1A1A]") + " text-white"}
                >
                  <td className="px-4 py-3 align-top">
                    <span className="block truncate" title={row.external_id}>
                      {row.external_id}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex min-w-0 items-center gap-2">
                      <input
                        value={editSegment[row.user_id] ?? row.segment}
                        onChange={(e) => setEditSegment((prev) => ({ ...prev, [row.user_id]: e.target.value }))}
                        className={inputBase + " px-2 py-1 text-xs"}
                        placeholder="예: NEW / VIP"
                        title={segmentLabelKo(editSegment[row.user_id] ?? row.segment)}
                      />
                      {shouldShowLabelKo(editSegment[row.user_id] ?? row.segment) && (
                        <span
                          className="hidden max-w-[14rem] truncate text-xs text-gray-400 lg:inline"
                          title={segmentLabelKo(editSegment[row.user_id] ?? row.segment)}
                        >
                          {segmentLabelKo(editSegment[row.user_id] ?? row.segment)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-gray-300">
                    <div className="truncate">룰렛 {row.roulette_plays} · 주사위 {row.dice_plays}</div>
                    <div className="truncate">복권 {row.lottery_plays} · t {row.total_play_duration}</div>
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
                    <PrimaryButton onClick={() => void handleSave(row)} disabled={updateMutation.isPending}>
                      저장
                    </PrimaryButton>
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

// src/admin/pages/NewMemberDiceEligibilityPage.tsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "../../components/common/Button";
import {
  AdminNewMemberDiceEligibility,
  fetchNewMemberDiceEligibilityByExternalId,
  upsertNewMemberDiceEligibility,
  updateNewMemberDiceEligibilityByExternalId,
  deleteNewMemberDiceEligibilityByExternalId,
} from "../api/adminNewMemberDiceApi";

const pickUpdatePayload = (payload: Partial<AdminNewMemberDiceEligibility>) => {
  const next: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(payload, "is_eligible")) next.is_eligible = payload.is_eligible;
  if (Object.prototype.hasOwnProperty.call(payload, "campaign_key")) next.campaign_key = payload.campaign_key;
  if (Object.prototype.hasOwnProperty.call(payload, "granted_by")) next.granted_by = payload.granted_by;
  if (Object.prototype.hasOwnProperty.call(payload, "expires_at")) next.expires_at = payload.expires_at;
  if (Object.prototype.hasOwnProperty.call(payload, "revoked_at")) next.revoked_at = payload.revoked_at;
  return next as any;
};

const normalizeExternalId = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toIsoOrNull = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const fromIsoToLocalInput = (iso?: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const NewMemberDiceEligibilityPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [filterExternalId, setFilterExternalId] = useState<string>("");
  const parsedFilterExternalId = useMemo(() => normalizeExternalId(filterExternalId) ?? undefined, [filterExternalId]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "new-member-dice", "eligibility", parsedFilterExternalId],
    queryFn: () => fetchNewMemberDiceEligibilityByExternalId(parsedFilterExternalId),
  });

  const [form, setForm] = useState({
    external_id: "",
    is_eligible: true,
    expires_at: "",
  });

  const parsedFormExternalId = useMemo(() => normalizeExternalId(form.external_id), [form.external_id]);

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!parsedFormExternalId) {
        throw new Error("external_id는 필수입니다.");
      }
      return upsertNewMemberDiceEligibility({
        external_id: parsedFormExternalId,
        is_eligible: form.is_eligible,
        campaign_key: null,
        granted_by: null,
        expires_at: toIsoOrNull(form.expires_at),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "new-member-dice", "eligibility"] });
      setForm({ external_id: "", is_eligible: true, expires_at: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ externalId, payload }: { externalId: string; payload: Partial<AdminNewMemberDiceEligibility> }) =>
      updateNewMemberDiceEligibilityByExternalId(externalId, pickUpdatePayload(payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "new-member-dice", "eligibility"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (externalId: string) => deleteNewMemberDiceEligibilityByExternalId(externalId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "new-member-dice", "eligibility"] }),
  });

  const handleQuickRevoke = (row: AdminNewMemberDiceEligibility) => {
    const externalId = row.external_id ?? "";
    if (!externalId) return;
    updateMutation.mutate({
      externalId,
      payload: {
        is_eligible: false,
        revoked_at: new Date().toISOString(),
        expires_at: row.expires_at ?? null,
      },
    });
  };

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">신규회원 판정(Eligibility) 관리</h1>
        <p className="text-sm text-slate-300">운영자 등록된 유저만 `/new-member/dice`에서 1회 판정이 가능합니다.</p>
      </header>

      <div className="rounded-xl border border-emerald-800/40 bg-slate-900/70 p-4 shadow-lg shadow-emerald-900/30">
        <h2 className="mb-3 text-lg font-bold text-emerald-100">대상자 등록/갱신(Upsert)</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1">
            <span className="text-xs text-slate-300">external_id (필수)</span>
            <input
              value={form.external_id}
              onChange={(e) => setForm((p) => ({ ...p, external_id: e.target.value }))}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="예: ext-56"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-slate-300">expires_at (옵션)</span>
            <input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </label>

          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={form.is_eligible}
              onChange={(e) => setForm((p) => ({ ...p, is_eligible: e.target.checked }))}
              className="h-4 w-4"
            />
            <span className="text-sm text-slate-200">eligible</span>
          </label>

          <div className="flex items-end">
            <Button
              onClick={() => upsertMutation.mutate()}
              disabled={upsertMutation.isPending || !parsedFormExternalId}
              className="w-full"
            >
              {upsertMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="external_id로 필터링 (옵션)"
          value={filterExternalId}
          onChange={(e) => setFilterExternalId(e.target.value)}
          className="w-full max-w-xs rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
        />
        <span className="text-xs text-slate-500">(입력 시 자동 조회)</span>
      </div>

      {isLoading && <div className="rounded-lg border border-emerald-800/40 bg-slate-900 p-3 text-slate-200">불러오는 중...</div>}
      {isError && (
        <div className="rounded-lg border border-red-700/40 bg-red-950 p-3 text-red-100">불러오기 실패: {(error as Error).message}</div>
      )}

      <div className="overflow-x-hidden rounded-lg border border-slate-800">
        <table className="w-full table-fixed divide-y divide-slate-800 bg-slate-900 text-sm text-slate-100">
          <thead className="bg-slate-800/60">
            <tr>
              <th className="w-20 px-3 py-2 text-left">user_id</th>
              <th className="w-[12ch] px-3 py-2 text-left">external_id</th>
              <th className="w-[12ch] px-3 py-2 text-left">nickname</th>
              <th className="w-24 px-3 py-2 text-left">eligible</th>
              <th className="w-56 px-3 py-2 text-left">expires_at</th>
              <th className="hidden w-56 px-3 py-2 text-left xl:table-cell">revoked_at</th>
              <th className="hidden w-56 px-3 py-2 text-left xl:table-cell">updated_at</th>
              <th className="w-28 px-3 py-2 text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {(data ?? []).map((row) => (
              <tr key={row.user_id}>
                <td className="px-3 py-2">{row.user_id}</td>
                <td className="px-3 py-2">
                  <div className="truncate" title={row.external_id ?? "-"}>
                    {row.external_id ?? "-"}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="truncate" title={row.nickname ?? "-"}>
                    {row.nickname ?? "-"}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.is_eligible ? "true" : "false"}
                    onChange={(e) =>
                      row.external_id
                        ? updateMutation.mutate({
                            externalId: row.external_id,
                            payload: { is_eligible: e.target.value === "true" },
                          })
                        : undefined
                    }
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1"
                    disabled={updateMutation.isPending || !row.external_id}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="datetime-local"
                    defaultValue={fromIsoToLocalInput(row.expires_at)}
                    onBlur={(e) =>
                      row.external_id
                        ? updateMutation.mutate({
                            externalId: row.external_id,
                            payload: { expires_at: toIsoOrNull(e.target.value) },
                          })
                        : undefined
                    }
                    className="w-full min-w-0 rounded border border-slate-700 bg-slate-800 px-2 py-1"
                    disabled={updateMutation.isPending || !row.external_id}
                  />
                </td>
                <td className="hidden px-3 py-2 xl:table-cell">
                  <div className="truncate" title={row.revoked_at ?? "-"}>
                    {row.revoked_at ?? "-"}
                  </div>
                </td>
                <td className="hidden px-3 py-2 xl:table-cell">
                  <div className="truncate" title={row.updated_at}>
                    {row.updated_at}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2 whitespace-nowrap">
                    <Button
                      variant="secondary"
                      onClick={() => handleQuickRevoke(row)}
                      disabled={updateMutation.isPending || !row.external_id}
                    >
                      회수
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => (row.external_id ? deleteMutation.mutate(row.external_id) : undefined)}
                      disabled={deleteMutation.isPending || !row.external_id}
                    >
                      삭제
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 && !isLoading && !isError && (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center text-slate-400">
                  데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default NewMemberDiceEligibilityPage;

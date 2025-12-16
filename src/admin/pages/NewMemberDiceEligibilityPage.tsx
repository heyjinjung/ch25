// src/admin/pages/NewMemberDiceEligibilityPage.tsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "../../components/common/Button";
import {
  AdminNewMemberDiceEligibility,
  fetchNewMemberDiceEligibility,
  upsertNewMemberDiceEligibility,
  updateNewMemberDiceEligibility,
  deleteNewMemberDiceEligibility,
} from "../api/adminNewMemberDiceApi";

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

  const [filterUserId, setFilterUserId] = useState<string>("");

  const parsedFilterUserId = useMemo(() => {
    const trimmed = filterUserId.trim();
    if (!trimmed) return undefined;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return n;
  }, [filterUserId]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "new-member-dice", "eligibility", parsedFilterUserId],
    queryFn: () => fetchNewMemberDiceEligibility(parsedFilterUserId),
  });

  const [form, setForm] = useState({
    user_id: "",
    is_eligible: true,
    campaign_key: "",
    granted_by: "",
    expires_at: "",
  });

  const upsertMutation = useMutation({
    mutationFn: () =>
      upsertNewMemberDiceEligibility({
        user_id: Number(form.user_id),
        is_eligible: form.is_eligible,
        campaign_key: form.campaign_key ? form.campaign_key : null,
        granted_by: form.granted_by ? form.granted_by : null,
        expires_at: toIsoOrNull(form.expires_at),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "new-member-dice", "eligibility"] });
      setForm({ user_id: "", is_eligible: true, campaign_key: "", granted_by: "", expires_at: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: Partial<AdminNewMemberDiceEligibility> }) =>
      updateNewMemberDiceEligibility(userId, {
        is_eligible: payload.is_eligible,
        campaign_key: payload.campaign_key ?? null,
        granted_by: payload.granted_by ?? null,
        expires_at: payload.expires_at ?? null,
        revoked_at: payload.revoked_at ?? null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "new-member-dice", "eligibility"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteNewMemberDiceEligibility(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "new-member-dice", "eligibility"] }),
  });

  const handleQuickRevoke = (row: AdminNewMemberDiceEligibility) => {
    updateMutation.mutate({
      userId: row.user_id,
      payload: {
        is_eligible: false,
        revoked_at: new Date().toISOString(),
        campaign_key: row.campaign_key ?? null,
        granted_by: row.granted_by ?? null,
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs text-slate-300">user_id (필수)</span>
            <input
              value={form.user_id}
              onChange={(e) => setForm((p) => ({ ...p, user_id: e.target.value }))}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="예: 123"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-slate-300">campaign_key (옵션)</span>
            <input
              value={form.campaign_key}
              onChange={(e) => setForm((p) => ({ ...p, campaign_key: e.target.value }))}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="예: 2025-xmas"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-slate-300">granted_by (옵션)</span>
            <input
              value={form.granted_by}
              onChange={(e) => setForm((p) => ({ ...p, granted_by: e.target.value }))}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder="예: admin_jimin"
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
              disabled={upsertMutation.isPending || !form.user_id.trim()}
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
          placeholder="user_id로 필터링 (옵션)"
          value={filterUserId}
          onChange={(e) => setFilterUserId(e.target.value)}
          className="w-full max-w-xs rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
        />
        <span className="text-xs text-slate-500">(입력 시 자동 조회)</span>
      </div>

      {isLoading && <div className="rounded-lg border border-emerald-800/40 bg-slate-900 p-3 text-slate-200">불러오는 중...</div>}
      {isError && (
        <div className="rounded-lg border border-red-700/40 bg-red-950 p-3 text-red-100">불러오기 실패: {(error as Error).message}</div>
      )}

      <div className="overflow-auto rounded-lg border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800 bg-slate-900 text-sm text-slate-100">
          <thead className="bg-slate-800/60">
            <tr>
              <th className="px-3 py-2 text-left">user_id</th>
              <th className="px-3 py-2 text-left">eligible</th>
              <th className="px-3 py-2 text-left">campaign_key</th>
              <th className="px-3 py-2 text-left">granted_by</th>
              <th className="px-3 py-2 text-left">expires_at</th>
              <th className="px-3 py-2 text-left">revoked_at</th>
              <th className="px-3 py-2 text-left">updated_at</th>
              <th className="px-3 py-2 text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {(data ?? []).map((row) => (
              <tr key={row.user_id}>
                <td className="px-3 py-2">{row.user_id}</td>
                <td className="px-3 py-2">
                  <select
                    value={row.is_eligible ? "true" : "false"}
                    onChange={(e) =>
                      updateMutation.mutate({
                        userId: row.user_id,
                        payload: { is_eligible: e.target.value === "true" },
                      })
                    }
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1"
                    disabled={updateMutation.isPending}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    defaultValue={row.campaign_key ?? ""}
                    onBlur={(e) =>
                      updateMutation.mutate({
                        userId: row.user_id,
                        payload: { campaign_key: e.target.value ? e.target.value : null },
                      })
                    }
                    className="w-40 rounded border border-slate-700 bg-slate-800 px-2 py-1"
                    placeholder="(옵션)"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    defaultValue={row.granted_by ?? ""}
                    onBlur={(e) =>
                      updateMutation.mutate({
                        userId: row.user_id,
                        payload: { granted_by: e.target.value ? e.target.value : null },
                      })
                    }
                    className="w-40 rounded border border-slate-700 bg-slate-800 px-2 py-1"
                    placeholder="(옵션)"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="datetime-local"
                    defaultValue={fromIsoToLocalInput(row.expires_at)}
                    onBlur={(e) =>
                      updateMutation.mutate({
                        userId: row.user_id,
                        payload: { expires_at: toIsoOrNull(e.target.value) },
                      })
                    }
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2">{row.revoked_at ?? "-"}</td>
                <td className="px-3 py-2">{row.updated_at}</td>
                <td className="px-3 py-2 text-right space-x-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleQuickRevoke(row)}
                    disabled={updateMutation.isPending}
                  >
                    회수
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => deleteMutation.mutate(row.user_id)}
                    disabled={deleteMutation.isPending}
                  >
                    삭제
                  </Button>
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

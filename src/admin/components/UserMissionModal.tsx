import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, X } from "lucide-react";

import { useToast } from "../../components/common/ToastProvider";
import { AdminUser } from "../api/adminUserApi";
import {
  AdminUserMissionDetail,
  AdminUserMissionUpdatePayload,
  fetchUserMissions,
  updateUserMission,
} from "../api/adminUserMissionApi";

interface UserMissionModalProps {
  user: AdminUser;
  onClose: () => void;
}

const asBool = (value: unknown): boolean => Boolean(value);

const UserMissionModal: React.FC<UserMissionModalProps> = ({ user, onClose }) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "user-missions", user.id],
    queryFn: () => fetchUserMissions(user.id),
    staleTime: 5_000,
    retry: false,
  });

  const [rows, setRows] = useState<AdminUserMissionDetail[]>([]);

  useEffect(() => {
    if (Array.isArray(data)) {
      setRows(data);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: ({ missionId, payload }: { missionId: number; payload: AdminUserMissionUpdatePayload }) =>
      updateUserMission(user.id, missionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "user-missions", user.id] });
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.detail || err?.message || "ÎØ∏ÏÖò ?Ä??Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.", "error");
    },
  });

  const hasChanges = useMemo(() => {
    if (!Array.isArray(data) || data.length !== rows.length) return true;
    for (let i = 0; i < rows.length; i += 1) {
      const a = data[i];
      const b = rows[i];
      if (
        a.mission_id !== b.mission_id ||
        a.current_value !== b.current_value ||
        asBool(a.is_completed) !== asBool(b.is_completed) ||
        asBool(a.is_claimed) !== asBool(b.is_claimed) ||
        String(a.approval_status ?? "") !== String(b.approval_status ?? "")
      ) {
        return true;
      }
    }
    return false;
  }, [data, rows]);

  const setRow = (missionId: number, patch: Partial<AdminUserMissionDetail>) => {
    setRows((prev) => prev.map((r) => (r.mission_id === missionId ? { ...r, ...patch } : r)));
  };

  const saveAll = async () => {
    if (!Array.isArray(data)) return;

    const originalById = new Map<number, AdminUserMissionDetail>();
    for (const r of data) originalById.set(r.mission_id, r);

    const changed = rows
      .map((r) => {
        const o = originalById.get(r.mission_id);
        if (!o) return { missionId: r.mission_id, payload: r };

        const payload: AdminUserMissionUpdatePayload = {};
        if (r.current_value !== o.current_value) payload.current_value = r.current_value;
        if (asBool(r.is_completed) !== asBool(o.is_completed)) payload.is_completed = asBool(r.is_completed);
        if (asBool(r.is_claimed) !== asBool(o.is_claimed)) payload.is_claimed = asBool(r.is_claimed);
        if (String(r.approval_status ?? "") !== String(o.approval_status ?? "")) {
          payload.approval_status = String(r.approval_status ?? "");
        }

        const hasAny = Object.keys(payload).length > 0;
        return hasAny ? { missionId: r.mission_id, payload } : null;
      })
      .filter(Boolean) as { missionId: number; payload: AdminUserMissionUpdatePayload }[];

    if (changed.length === 0) {
      addToast("Î≥ÄÍ≤ΩÎêú ?¥Ïö©???ÜÏäµ?àÎã§.", "info");
      return;
    }

    try {
      await Promise.all(changed.map((c) => updateMutation.mutateAsync(c)));
      addToast("ÎØ∏ÏÖò ?Ä???ÑÎ£å", "success");
    } catch {
      // handled by onError
    }
  };

  const errorMsg = (error as any)?.response?.data?.detail || (error as any)?.message || "Î∂àÎü¨?§Í∏∞ ?§Ìå®";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-lg border border-[#333333] bg-[#111111] shadow-xl">
        <header className="flex items-center justify-between border-b border-[#333333] px-6 py-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white truncate">ÎØ∏ÏÖò Í¥ÄÎ¶?/h3>
            <p className="mt-0.5 text-xs text-gray-400 truncate">
              ?¨Ïö©?? <span className="text-gray-200">{user.nickname ?? `#${user.id}`}</span> (ID: {user.id})
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="?´Í∏∞" title="?´Í∏∞">
            <X size={20} />
          </button>
        </header>

        <div className="p-6">
          {isLoading ? <div className="text-sm text-gray-300">Î∂àÎü¨?§Îäî Ï§?..</div> : null}
          {isError ? <div className="text-sm text-red-300">{errorMsg}</div> : null}

          {!isLoading && !isError ? (
            <div className="max-h-[70vh] overflow-auto rounded-md border border-[#333333]">
              <table className="min-w-full divide-y divide-[#333333] text-sm">
                <thead className="sticky top-0 bg-[#0B0B0B]">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-400">ÎØ∏ÏÖò</th>
                    <th className="px-3 py-2 text-left text-gray-400">Ïπ¥ÌÖåÍ≥†Î¶¨</th>
                    <th className="px-3 py-2 text-left text-gray-400">Target</th>
                    <th className="px-3 py-2 text-left text-gray-400">Current</th>
                    <th className="px-3 py-2 text-left text-gray-400">?ÑÎ£å</th>
                    <th className="px-3 py-2 text-left text-gray-400">?¥Î†à??/th>
                    <th className="px-3 py-2 text-left text-gray-400">?πÏù∏</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#333333]">
                  {rows.map((m) => (
                    <tr key={m.mission_id} className="hover:bg-[#1A1A1A]">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-white">{m.title}</div>
                        <div className="text-xs text-gray-500">{m.logic_key}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-200">{m.category}</td>
                      <td className="px-3 py-2 text-gray-200">{m.target_value}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={m.current_value}
                          onChange={(e) => setRow(m.mission_id, { current_value: Number(e.target.value) })}
                          aria-label={`${m.title} ?ÑÏû¨Í∞?}
                          title={`${m.title} ?ÑÏû¨Í∞?}
                          placeholder="?ÑÏû¨Í∞?
                          className="w-24 rounded-md border border-[#333333] bg-[#0B0B0B] p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={asBool(m.is_completed)}
                          onChange={(e) => setRow(m.mission_id, { is_completed: e.target.checked })}
                          aria-label={`${m.title} ?ÑÎ£å ?¨Î?`}
                          title={`${m.title} ?ÑÎ£å ?¨Î?`}
                          className="h-4 w-4 accent-[#91F402]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={asBool(m.is_claimed)}
                          onChange={(e) => setRow(m.mission_id, { is_claimed: e.target.checked })}
                          aria-label={`${m.title} ?¥Î†à???¨Î?`}
                          title={`${m.title} ?¥Î†à???¨Î?`}
                          className="h-4 w-4 accent-[#91F402]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={String(m.approval_status ?? "NONE")}
                          onChange={(e) => setRow(m.mission_id, { approval_status: e.target.value })}
                          aria-label={`${m.title} ?πÏù∏ ?ÅÌÉú`}
                          title={`${m.title} ?πÏù∏ ?ÅÌÉú`}
                          className="rounded-md border border-[#333333] bg-[#0B0B0B] p-2 text-sm text-white"
                        >
                          <option value="NONE">NONE</option>
                          <option value="PENDING">PENDING</option>
                          <option value="APPROVED">APPROVED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-[#333333] px-6 py-4">
          <div className="text-xs text-gray-500">{hasChanges ? "Î≥ÄÍ≤ΩÏÇ¨???àÏùå" : "Î≥ÄÍ≤ΩÏÇ¨???ÜÏùå"}</div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-[#333333] px-4 py-2 text-sm text-gray-300 hover:bg-[#1A1A1A]"
            >
              ?´Í∏∞
            </button>
            <button
              onClick={saveAll}
              disabled={updateMutation.isPending || !hasChanges}
              className="flex items-center gap-2 rounded-md bg-[#2D6B3B] px-4 py-2 text-sm font-bold text-white hover:bg-[#91F402] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              ?Ä??
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default UserMissionModal;

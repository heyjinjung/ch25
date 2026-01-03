import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, X } from "lucide-react";
import { fetchAuditLogsByUserId, type AdminAuditLogEntry } from "../api/adminAuditApi";

type AdminUser = {
  id: number;
  external_id?: string | null;
  telegram_id?: number | null;
  telegram_username?: string | null;
  nickname?: string | null;
};

type Props = {
  user: AdminUser;
  onClose: () => void;
};

const formatKst = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const summarize = (e: AdminAuditLogEntry) => {
  const after = (e.after ?? {}) as any;
  const before = (e.before ?? {}) as any;

  const reqId = after?.request?.id ?? before?.request?.id;
  if (reqId) {
    const amount = after?.request?.amount ?? before?.request?.amount;
    const status = after?.request?.status ?? before?.request?.status;
    return `withdraw#${reqId}${amount != null ? ` · ${Number(amount).toLocaleString()}` : ""}${status ? ` · ${String(status)}` : ""}`;
  }

  const itemType = after?.item_type ?? after?.itemType ?? before?.item_type;
  const delta = after?.delta ?? after?.change_amount ?? before?.delta;
  const qty = after?.quantity ?? after?.balance_after ?? before?.quantity;
  if (itemType) {
    const parts = [String(itemType)];
    if (delta != null) parts.push(`delta ${String(delta)}`);
    if (qty != null) parts.push(`qty ${String(qty)}`);
    return parts.join(" · ");
  }

  return "-";
};

const UserAuditLogModal: React.FC<Props> = ({ user, onClose }) => {
  const headerName =
    user.nickname ||
    user.external_id ||
    (user.telegram_username ? `@${String(user.telegram_username).replace(/^@/, "")}` : String(user.id));

  const logsQuery = useQuery<AdminAuditLogEntry[]>({
    queryKey: ["admin", "audit", "user", user.id],
    queryFn: () => fetchAuditLogsByUserId(user.id, 80, 0),
    enabled: !!user.id,
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#333333] bg-[#111111] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-[#333333] p-4 sm:p-6 bg-[#1A1A1A]">
          <div>
            <h3 className="text-xl font-bold text-[#91F402] flex items-center gap-2">
              <Shield size={18} /> 운영/감사 로그: {headerName}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              ID: {user.id}
              {user.telegram_username ? ` · TG: @${String(user.telegram_username).replace(/^@/, "")}` : user.telegram_id ? ` · TG ID: ${user.telegram_id}` : ""}
              {user.external_id ? ` · external_id: ${user.external_id}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-[#333333] hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="rounded-2xl border border-[#333333] bg-[#0B0B0B] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#222222]">
              <div className="text-sm font-bold text-[#91F402]">최근 운영 조치</div>
              <div className="text-[11px] text-gray-600 mt-1">vault/inventory 등 고위험 액션 위주로 기록됩니다.</div>
            </div>

            {logsQuery.isLoading ? (
              <div className="py-12 text-center text-gray-500">Loading…</div>
            ) : (logsQuery.data ?? []).length === 0 ? (
              <div className="py-12 text-center text-gray-500">로그가 없습니다.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-[#111111] text-gray-400">
                  <tr>
                    <th className="py-3 px-4">시간</th>
                    <th className="py-3 px-4">action</th>
                    <th className="py-3 px-4">요약</th>
                    <th className="py-3 px-4 text-right">admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {(logsQuery.data ?? []).slice(0, 80).map((e) => (
                    <tr key={e.id} className="hover:bg-[#111111]">
                      <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{formatKst(e.created_at)}</td>
                      <td className="py-3 px-4 text-xs text-gray-300 font-mono">{e.action}</td>
                      <td className="py-3 px-4 text-gray-200 truncate max-w-[440px]" title={summarize(e)}>
                        {summarize(e)}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-gray-500">#{e.admin_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {logsQuery.error && (
              <div className="p-4 text-xs text-red-300">조회 실패: {(logsQuery.error as any)?.message ?? "unknown"}</div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-[#333333] bg-[#1A1A1A] flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-[#333333] px-6 py-2 text-sm font-bold text-white hover:bg-[#444444]">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserAuditLogModal;

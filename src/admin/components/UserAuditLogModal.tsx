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
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden admin-card flex flex-col">
        <div className="flex items-center justify-between border-b border-admin-border p-4 sm:p-6 bg-admin-sidebar/80">
          <div>
            <h3 className="text-admin-subtitle text-admin-text-primary flex items-center gap-2">
              <Shield size={18} className="text-admin-brand" /> ?�영/감사 로그: {headerName}
            </h3>
            <p className="mt-1 text-admin-meta text-admin-text-secondary">
              ID: {user.id}
              {user.telegram_username ? ` · TG: @${String(user.telegram_username).replace(/^@/, "")}` : user.telegram_id ? ` · TG ID: ${user.telegram_id}` : ""}
              {user.external_id ? ` · external_id: ${user.external_id}` : ""}
            </p>
          </div>
          <button onClick={onClose} aria-label="?�기" className="btn-admin-ghost rounded-full p-2">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="admin-card overflow-hidden">
            <div className="px-4 py-3 border-b border-admin-border">
              <div className="text-admin-body font-bold text-admin-text-primary">최근 ?�영 조치</div>
              <div className="mt-1 text-admin-meta text-admin-text-secondary">vault/inventory ??고위???�션 ?�주�?기록?�니??</div>
            </div>

            {logsQuery.isLoading ? (
              <div className="py-12 text-center text-admin-text-secondary">Loading...</div>
            ) : (logsQuery.data ?? []).length === 0 ? (
              <div className="py-12 text-center text-admin-text-secondary">로그가 ?�습?�다.</div>
            ) : (
              <table className="admin-table">
                <thead className="bg-admin-sidebar/60">
                  <tr>
                    <th className="admin-th">?�간</th>
                    <th className="admin-th">action</th>
                    <th className="admin-th">?�약</th>
                    <th className="admin-th text-right">admin</th>
                  </tr>
                </thead>
                <tbody>
                  {(logsQuery.data ?? []).slice(0, 80).map((e) => (
                    <tr key={e.id} className="admin-tr">
                      <td className="admin-td text-xs text-admin-text-secondary whitespace-nowrap">{formatKst(e.created_at)}</td>
                      <td className="admin-td text-xs font-mono text-admin-text-primary">{e.action}</td>
                      <td className="admin-td truncate max-w-[440px]" title={summarize(e)}>
                        {summarize(e)}
                      </td>
                      <td className="admin-td text-right text-xs text-admin-text-secondary">#{e.admin_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {logsQuery.error && (
              <div className="p-4 text-xs text-admin-danger">조회 ?�패: {(logsQuery.error as any)?.message ?? "unknown"}</div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-admin-border bg-admin-sidebar/80 flex justify-end">
          <button onClick={onClose} className="btn-admin-secondary">
            ?�기
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserAuditLogModal;

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { History, X, Info } from "lucide-react";
import { adminApi } from "../api/httpClient";
import type { AdminUser } from "../api/adminUserApi";

type UserIdentityHistoryEntry = {
    id: number;
    user_id: number;
    field_name: string;
    old_value?: string | null;
    new_value?: string | null;
    changed_by?: number | null;
    created_at: string;
};

const fetchUserIdentityHistory = async (userId: number) => {
    const { data } = await adminApi.get<UserIdentityHistoryEntry[]>(`/admin/api/users/${userId}/identity-history`);
    return data;
};

type Props = {
    user: AdminUser;
    onClose: () => void;
};

const formatKst = (iso: string) => {
    try {
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return iso;

        return new Intl.DateTimeFormat("ko-KR", {
            timeZone: "Asia/Seoul",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        }).format(date);
    } catch {
        return iso;
    }
};

const fieldLabels: Record<string, string> = {
    nickname: "닉네임",
    real_name: "실명",
    telegram_id: "텔레그램 ID",
    telegram_username: "텔레그램 핸들",
};

const UserIdentityHistoryModal: React.FC<Props> = ({ user, onClose }) => {
    const headerName =
        user.nickname ||
        user.external_id ||
        (user.telegram_username ? `@${String(user.telegram_username).replace(/^@/, "")}` : String(user.id));

    const historyQuery = useQuery<UserIdentityHistoryEntry[]>({
        queryKey: ["admin", "users", user.id, "identity-history"],
        queryFn: () => fetchUserIdentityHistory(user.id),
        enabled: !!user.id,
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div
                className="admin-card w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-scaleIn"
                role="dialog"
                aria-modal="true"
                aria-labelledby="user-identity-history-title"
            >
                <div className="flex items-start justify-between border-b border-admin-border p-4 sm:p-6 bg-admin-sidebar/60">
                    <div className="min-w-0">
                        <h3 id="user-identity-history-title" className="text-admin-subtitle text-admin-text-primary font-bold flex items-center gap-2">
                            <History size={18} className="text-admin-brand" />
                            신원 정보 변경 이력: <span className="truncate">{headerName}</span>
                        </h3>
                        <p className="text-admin-meta text-admin-text-secondary mt-1">
                            ID: <span className="text-admin-mono text-admin-text-primary">{String(user.id)}</span> · 닉네임/실명/텔레그램 정보의 변경 이력을 확인합니다.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-admin-ghost shrink-0"
                        aria-label="닫기"
                        title="닫기"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                    <div className="admin-card overflow-hidden">
                        {historyQuery.isLoading ? (
                            <div className="py-12 text-center text-admin-text-secondary">불러오는 중...</div>
                        ) : (historyQuery.data ?? []).length === 0 ? (
                            <div className="py-12 text-center flex flex-col items-center gap-3">
                                <Info size={32} className="text-admin-text-muted" />
                                <p className="text-admin-body text-admin-text-secondary">변경 이력이 없습니다.</p>
                            </div>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th className="admin-th">일시(KST)</th>
                                        <th className="admin-th">항목</th>
                                        <th className="admin-th">변경 전</th>
                                        <th className="admin-th">변경 후</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(historyQuery.data ?? []).map((entry) => (
                                        <tr
                                            key={entry.id}
                                            className="admin-tr before:absolute before:left-0 before:top-0 before:h-full before:w-[2px] before:bg-admin-brand before:opacity-0 hover:before:opacity-100"
                                        >
                                            <td className="admin-td text-admin-mono text-admin-text-secondary whitespace-nowrap">{formatKst(entry.created_at)}</td>
                                            <td className="admin-td font-semibold">
                                                {fieldLabels[entry.field_name] || entry.field_name}
                                            </td>
                                            <td
                                                className="admin-td text-admin-danger line-through truncate max-w-[220px]"
                                                title={entry.old_value || "(없음)"}
                                            >
                                                {entry.old_value || "(없음)"}
                                            </td>
                                            <td
                                                className="admin-td text-admin-brand font-bold truncate max-w-[220px]"
                                                title={entry.new_value || "(없음)"}
                                            >
                                                {entry.new_value || "(없음)"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {historyQuery.error && (
                            <div className="p-4 text-admin-meta text-admin-danger bg-admin-danger/10">
                                조회 실패: {(historyQuery.error as any)?.message ?? "unknown"}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 sm:p-6 border-t border-admin-border bg-admin-sidebar/60 flex justify-end">
                    <button type="button" onClick={onClose} className="btn-admin-secondary" aria-label="닫기">
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserIdentityHistoryModal;

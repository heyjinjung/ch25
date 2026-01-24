import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Users, Clock, Activity, ShieldAlert } from "lucide-react";
import { adminApi } from "../api/httpClient";
import { useToast } from "../../components/common/ToastProvider";

type MissionApprovalStatus = "APPROVED" | "REJECTED";

interface AdminMissionApprovalDetail {
    id: number;
    user_id: number;
    nickname: string | null;
    telegram_id: string | null;
    mission_id: number;
    mission_title: string;
    current_value: number;
    target_value: number;
    completed_at: string | null;
    approval_status: string;
}

async function fetchMissionApprovalQueue() {
    const { data } = await adminApi.get<AdminMissionApprovalDetail[]>("/admin/api/user-missions/approvals/queue");
    return data;
}

async function batchUpdateMissionStatus(ids: number[], status: MissionApprovalStatus) {
    const { data } = await adminApi.post<{ success: boolean; count: number }>(
        "/admin/api/user-missions/approvals/batch",
        { ids, status }
    );
    return data;
}

const MissionApprovalQueue: React.FC = () => {
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const { data: queue = [], isLoading } = useQuery<AdminMissionApprovalDetail[]>({
        queryKey: ["admin", "mission-approvals"],
        queryFn: fetchMissionApprovalQueue,
        refetchInterval: 15000,
    });

    const mutation = useMutation({
        mutationFn: ({ ids, status }: { ids: number[], status: MissionApprovalStatus }) =>
            batchUpdateMissionStatus(ids, status),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "mission-approvals"] });
            setSelectedIds([]);
            addToast(
                `${variables.ids.length}Í±¥Ïùò ÎØ∏ÏÖò ?πÏù∏ ?îÏ≤≠??${variables.status === "APPROVED" ? "?πÏù∏" : "Í±∞Ï†à"} Ï≤òÎ¶¨?àÏäµ?àÎã§.`,
                "success"
            );
        },
        onError: (err: any) => {
            addToast(`Ï≤òÎ¶¨ Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§: ${String(err?.message ?? err)}`, "error");
        }
    });

    const toggleSelect = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === queue.length) {
            setSelectedIds([]);
            return;
        }
        setSelectedIds(queue.map((q) => q.id));
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-20 bg-admin-sidebar/30 rounded-2xl border border-admin-border animate-pulse">
            <Activity size={32} className="text-admin-brand mb-4 animate-spin" />
            <p className="text-xs font-bold text-admin-text-muted uppercase tracking-[0.2em]">?πÏù∏ ?ÄÍ∏?Î™©Î°ù ?ôÍ∏∞??Ï§?..</p>
        </div>
    );

    if (queue.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-admin-sidebar/20 rounded-2xl border border-admin-border border-dashed">
                <div className="h-16 w-16 rounded-full bg-admin-success/10 border border-admin-success/20 flex items-center justify-center mb-6">
                    <CheckCircle size={32} className="text-admin-success opacity-40" />
                </div>
                <h3 className="text-lg font-bold text-admin-text-base uppercase tracking-tight">?πÏù∏ ?ÄÍ∏??ÜÏùå</h3>
                <p className="mt-1 text-xs font-bold text-admin-text-muted">?ÑÏû¨ ?πÏù∏ ?ÄÍ∏?Ï§ëÏù∏ ?¨Ïö©??ÎØ∏ÏÖò Í∏∞Î°ù???ÜÏäµ?àÎã§.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Batch Action Bar */}
            <div className="flex items-center justify-between bg-admin-sidebar/80 backdrop-blur-md p-4 rounded-xl border border-admin-border sticky top-0 z-10 shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-admin-bg border border-admin-border">
                        <Users size={14} className="text-admin-brand" />
                        <span className="text-xs font-bold text-admin-text-base uppercase tracking-wider">
                            ?πÏù∏ ?ÄÍ∏?<span className="text-admin-brand">{queue.length}</span>
                        </span>
                    </div>
                    {selectedIds.length > 0 && (
                        <div className="h-6 w-px bg-admin-border" />
                    )}
                    {selectedIds.length > 0 && (
                        <span className="text-[11px] font-bold text-admin-success animate-in slide-in-from-left-2 uppercase tracking-widest">
                            <span className="mr-1">{selectedIds.length}</span>Í±??†ÌÉù??
                        </span>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => mutation.mutate({ ids: selectedIds, status: "REJECTED" })}
                        disabled={selectedIds.length === 0 || mutation.isPending}
                        className="flex items-center gap-2 rounded-lg bg-admin-bg px-5 py-2.5 text-[11px] font-bold text-admin-danger/80 hover:text-admin-danger hover:bg-admin-danger/10 border border-admin-border hover:border-admin-danger/30 transition-all disabled:opacity-30 disabled:grayscale uppercase tracking-widest"
                    >
                        <XCircle size={16} /> ?ºÍ¥Ñ Í±∞Ï†à
                    </button>
                    <button
                        type="button"
                        onClick={() => mutation.mutate({ ids: selectedIds, status: "APPROVED" })}
                        disabled={selectedIds.length === 0 || mutation.isPending}
                        className="flex items-center gap-2 rounded-lg bg-admin-brand px-6 py-2.5 text-[11px] font-bold text-white hover:bg-admin-brand/90 shadow-lg shadow-admin-brand/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale uppercase tracking-widest"
                    >
                        <CheckCircle size={16} /> ?ºÍ¥Ñ ?πÏù∏
                    </button>
                </div>
            </div>

            {/* Queue Table */}
            <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-sidebar shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th className="admin-th w-12 text-center">
                                    <div className="flex justify-center">
                                        <input
                                            type="checkbox"
                                            checked={queue.length > 0 && selectedIds.length === queue.length}
                                            onChange={toggleSelectAll}
                                            aria-label="?ÑÏ≤¥ ?†ÌÉù"
                                            title="?ÑÏ≤¥ ?†ÌÉù"
                                            className="h-4 w-4 rounded border-admin-border bg-admin-bg text-admin-brand focus:ring-admin-brand/20 accent-admin-brand cursor-pointer"
                                        />
                                    </div>
                                </th>
                                <th className="admin-th">?îÏ≤≠??/th>
                                <th className="admin-th">ÎØ∏ÏÖò</th>
                                <th className="admin-th">?ÑÎ£å ?úÍ∞Å</th>
                                <th className="admin-th text-right">Ï≤òÎ¶¨</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-admin-border/50">
                            {queue.map(item => (
                                <tr key={item.id} className="admin-tr group">
                                    <td className="admin-td text-center">
                                        <div className="flex justify-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(item.id)}
                                                onChange={() => toggleSelect(item.id)}
                                                aria-label={`?†ÌÉù: ${item.nickname || "?¨Ïö©??} (${item.user_id})`}
                                                title={`?†ÌÉù: ${item.nickname || "?¨Ïö©??} (${item.user_id})`}
                                                className="h-4 w-4 rounded border-admin-border bg-admin-bg text-admin-brand focus:ring-admin-brand/20 accent-admin-brand cursor-pointer"
                                            />
                                        </div>
                                    </td>
                                    <td className="admin-td">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-admin-bg border border-admin-border flex items-center justify-center text-admin-text-muted group-hover:text-admin-brand group-hover:border-admin-brand/30 transition-all shadow-inner">
                                                <Users size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="text-sm font-bold text-admin-text-base group-hover:text-admin-brand transition-colors">{item.nickname || "(?âÎÑ§???ÜÏùå)"}</p>
                                                <p className="text-[10px] text-admin-text-muted font-medium tracking-tight mt-0.5">
                                                    UID: <span className="text-admin-text-subtle font-mono font-bold">{item.user_id}</span>
                                                    {item.telegram_id && (
                                                        <>
                                                            <span className="mx-1.5 opacity-20">|</span>
                                                            TG: <span className="text-admin-brand/60 font-mono font-bold">{item.telegram_id}</span>
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="admin-td">
                                        <div className="flex flex-col gap-2">
                                            <p className="text-sm font-bold text-admin-text-base leading-none uppercase tracking-tight">{item.mission_title}</p>
                                            <div className="flex items-center gap-3">
                                                <progress
                                                    className="h-2 w-32 overflow-hidden rounded-full border border-admin-border bg-admin-bg accent-admin-brand flex-shrink-0"
                                                    value={Math.min(item.current_value, item.target_value)}
                                                    max={Math.max(1, item.target_value)}
                                                    aria-label="ÏßÑÌñâÎ•?
                                                />
                                                <span className="text-[10px] font-bold text-admin-text-muted uppercase tracking-widest font-mono">
                                                    {item.current_value.toLocaleString()}<span className="opacity-30"> / </span>{item.target_value.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="admin-td">
                                        <div className="flex items-center gap-2 text-admin-text-muted">
                                            <div className="p-1 rounded bg-admin-bg border border-admin-border">
                                                <Clock size={12} />
                                            </div>
                                            <p className="text-xs font-bold text-admin-text-subtle">
                                                {item.completed_at ? new Date(item.completed_at).toLocaleString('ko-KR', {
                                                    year: '2-digit', month: '2-digit', day: '2-digit',
                                                    hour: '2-digit', minute: '2-digit', hour12: false
                                                }) : "-"}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="admin-td text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                                            <button
                                                type="button"
                                                onClick={() => mutation.mutate({ ids: [item.id], status: "REJECTED" })}
                                                className="h-9 w-9 flex items-center justify-center rounded-lg border border-admin-border bg-admin-bg text-admin-text-muted hover:text-admin-danger hover:border-admin-danger/30 hover:bg-admin-danger/5 transition-all active:scale-90"
                                                title="Í±∞Ï†à"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => mutation.mutate({ ids: [item.id], status: "APPROVED" })}
                                                className="h-9 w-9 flex items-center justify-center rounded-lg border border-admin-border bg-admin-bg text-admin-text-muted hover:text-admin-success hover:border-admin-success/30 hover:bg-admin-success/5 transition-all active:scale-90"
                                                title="?πÏù∏"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Audit Log / Helper */}
            <div className="p-5 rounded-2xl bg-admin-warning/5 border border-admin-warning/20 flex items-start gap-4">
                <div className="p-2 rounded-lg bg-admin-warning/10 border border-admin-warning/20">
                    <ShieldAlert className="text-admin-warning" size={20} />
                </div>
                <div>
                    <h4 className="text-xs font-bold text-admin-warning uppercase tracking-[0.2em] mb-1.5">?¥ÏòÅ ?àÎÇ¥</h4>
                    <p className="text-[11px] font-bold text-admin-text-muted/80 leading-relaxed max-w-2xl">
                        ?πÏù∏ Ï≤òÎ¶¨ ???¥Îãπ Í∏∞Î°ù???ÅÌÉúÍ∞Ä Ï¶âÏãú Î≥ÄÍ≤ΩÎê©?àÎã§. ?πÏù∏/Í±∞Ï†à ?ÑÏóê??ÏßÑÌñâ ?òÏπò?Ä ÎØ∏ÏÖò ?¥Ïö©???ïÏù∏?òÏÑ∏??
                        Î∂àÎ™Ö?ïÌïú ?îÏ≤≠?Ä <span className="text-admin-warning/90">Í±∞Ï†à</span> ???¨Ïö©?êÏóêÍ≤??¨ÏöîÏ≤?ïò??Í≤ÉÏùÑ Í∂åÏû•?©Îãà??
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MissionApprovalQueue;

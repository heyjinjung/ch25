
import React, { useState, useEffect } from "react";
import {
    CheckCircle2,
    XCircle,
    Search,
    Edit3,
    Save,
    X,
    AlertCircle,
    User as UserIcon,
    CreditCard
} from "lucide-react";
import dayjs from "dayjs";
import { adminApi } from "../../api/httpClient";
import { useToast } from "../../../components/common/ToastProvider";

interface VaultRequest {
    id: number;
    user_id: number;
    amount: number;
    status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
    created_at: string;
    processed_at: string | null;
    admin_memo: string | null;
    user?: {
        nickname: string;
        external_id: string;
    };
}

interface VaultRequestManagerProps {
    refreshKey?: number;
}

export const VaultRequestManager: React.FC<VaultRequestManagerProps> = ({ refreshKey }) => {
    const [requests, setRequests] = useState<VaultRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>("PENDING");
    const [searchTerm, setSearchTerm] = useState("");
    const { addToast } = useToast();

    // Approval Modal State
    const [approvalModal, setApprovalModal] = useState<{ id: number; amount: number; nickname: string } | null>(null);
    const [approveAmount, setApproveAmount] = useState<string>("");
    const [approveMemo, setApproveMemo] = useState<string>("");

    // Editing State (Legacy Adjust)
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editAmount, setEditAmount] = useState<string>("");

    // Arbitrary Balance Modal State
    const [balanceModal, setBalanceModal] = useState<{ userId: number; nickname: string; currentLocked: number; currentAvailable: number } | null>(null);
    const [newLocked, setNewLocked] = useState<string>("");
    const [newAvailable, setNewAvailable] = useState<string>("");
    const [balanceLoading, setBalanceLoading] = useState(false);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await adminApi.get(`/admin/api/vault/admin/requests?status=${filterStatus}`);
            setRequests(res.data);
        } catch (error) {
            console.error("Failed to fetch vault requests:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [filterStatus, refreshKey]);

    const openApproveModal = (req: VaultRequest) => {
        setApprovalModal({
            id: req.id,
            amount: req.amount,
            nickname: req.user?.nickname || "Unknown"
        });
        setApproveAmount(req.amount.toString());
        setApproveMemo("");
    };

    const handleConfirmApprove = async () => {
        if (!approvalModal) return;
        const finalAmount = parseInt(approveAmount);
        if (isNaN(finalAmount) || finalAmount <= 0) {
            addToast("?�효??금액???�력?�주?�요.", "error");
            return;
        }

        try {
            await adminApi.post("/admin/api/vault/admin/process", {
                request_id: approvalModal.id,
                action: "APPROVE",
                admin_memo: approveMemo,
                approved_amount: finalAmount
            });
            setApprovalModal(null);
            fetchRequests();
            addToast("?�인 처리 ?�료", "success");
        } catch (error) {
            console.error("Approve failed:", error);
            addToast("?�인 처리 ?�패", "error");
        }
    };

    const handleReject = async (requestId: number) => {
        if (!window.confirm("?�말 반려?�시겠습?�까?")) return;
        try {
            await adminApi.post("/admin/api/vault/admin/process", {
                request_id: requestId,
                action: "REJECT"
            });
            fetchRequests();
            addToast("반려 처리 ?�료", "success");
        } catch (error) {
            console.error("Reject failed:", error);
            addToast("반려 처리 ?�패", "error");
        }
    };

    const handleAdjustAmount = async (requestId: number) => {
        const amount = parseInt(editAmount);
        if (isNaN(amount) || amount <= 0) return;

        try {
            await adminApi.post("/admin/api/vault/admin/adjust-amount", {
                request_id: requestId,
                new_amount: amount,
                admin_memo: "금액 ?�동 조정"
            });
            setEditingId(null);
            fetchRequests();
            addToast("금액 조정 ?�료", "success");
        } catch (error) {
            console.error("Adjust amount failed:", error);
            addToast("금액 조정 ?�패", "error");
        }
    };

    const openBalanceModal = async (req: VaultRequest) => {
        try {
            // Fetch latest balance for this user
            const userId = req.user_id;
            const res = await adminApi.get(`/admin/api/vault/${userId}`);
            const state = res.data;
            setBalanceModal({
                userId,
                nickname: req.user?.nickname || "Unknown",
                currentLocked: state.locked_balance,
                currentAvailable: state.available_balance
            });
            setNewLocked(state.locked_balance.toString());
            setNewAvailable(state.available_balance.toString());
        } catch (error) {
            console.error("Open balance modal failed:", error);
            addToast("?��? ?�액 ?�보�?가?�오지 못했?�니??", "error");
        }
    };

    const handleUpdateBalance = async () => {
        if (!balanceModal) return;
        setBalanceLoading(true);
        try {
            await adminApi.post(`/admin/api/vault/${balanceModal.userId}/balance`, {
                locked_amount: parseInt(newLocked),
                available_amount: parseInt(newAvailable),
                reason: "ADMIN_MANUAL_SET"
            });
            setBalanceModal(null);
            addToast?.("?�액???�공?�으�??�정?�었?�니??", "success");
            // Optional: refresh if needed, but usually this is standalone
        } catch (error) {
            console.error("Update balance failed:", error);
            addToast?.("?�액 ?�정 ?�패", "error");
        } finally {
            setBalanceLoading(false);
        }
    };

    const filteredRequests = requests.filter(r =>
        r.user_id.toString().includes(searchTerm) ||
        r.user?.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-zinc-900/20">
            {/* Compact Header Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1 py-1 bg-zinc-900/50 border-b border-zinc-800">
                <div className="flex items-center gap-1.5 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                    {["PENDING", "APPROVED", "REJECTED"].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all duration-200 ${filterStatus === status
                                ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                                }`}
                        >
                            {status === "PENDING" ? "?��? : status === "APPROVED" ? "?�인" : "반려"}
                        </button>
                    ))}
                </div>

                <div className="relative group w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="검??.."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-60 h-9 bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 text-xs text-zinc-300 focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-700"
                    />
                </div>
            </div>

            {/* Dense Table */}
            <div className="overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                        <tr className="bg-zinc-900/50 border-y border-zinc-800">
                            <th className="w-[30%] px-4 py-2 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">?��?</th>
                            <th className="w-[25%] px-4 py-2 text-right text-[11px] font-bold text-zinc-500 uppercase tracking-wider">?�청??/th>
                            <th className="w-[20%] px-4 py-2 text-center text-[11px] font-bold text-zinc-500 uppercase tracking-wider">?�간</th>
                            <th className="w-[25%] px-4 py-2 text-right text-[11px] font-bold text-zinc-500 uppercase tracking-wider">처리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-admin-border">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-20 text-center text-admin-meta text-admin-text-secondary">로딩 �?..</td>
                            </tr>
                        ) : filteredRequests.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-20 text-center text-admin-body text-admin-text-muted">?�역???�습?�다.</td>
                            </tr>
                        ) : (
                            filteredRequests.map((req) => (
                                <tr key={req.id} className="admin-tr group relative">
                                    <td className="px-4 py-2 align-middle">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 shrink-0">
                                                <UserIcon className="h-4 w-4 text-zinc-400" />
                                            </div>
                                            <div className="overflow-hidden flex-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-sm font-bold text-zinc-200 capitalize truncate" title={req.user?.nickname}>
                                                        {req.user?.nickname || "Unknown"}
                                                    </div>
                                                    <button
                                                        onClick={() => openBalanceModal(req)}
                                                        className="p-1 rounded bg-zinc-800 hover:bg-admin-brand hover:text-white text-zinc-500 transition-colors"
                                                        title="?�액 ?�정"
                                                    >
                                                        <CreditCard className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                <div className="text-xs font-mono text-zinc-500 truncate">
                                                    #{req.user?.external_id || req.user_id}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-right align-middle">
                                        {editingId === req.id ? (
                                            <div className="flex items-center justify-end gap-1">
                                                <input
                                                    type="number"
                                                    value={editAmount}
                                                    onChange={(e) => setEditAmount(e.target.value)}
                                                    className="w-20 h-7 bg-zinc-900 border border-brand-500/50 rounded-md px-1 text-right text-xs text-white outline-none"
                                                    autoFocus
                                                    aria-label="?�정 금액"
                                                    placeholder="금액"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleAdjustAmount(req.id)}
                                                    className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                                                    aria-label="금액 ?�??
                                                    title="금액 ?�??
                                                >
                                                    <Save className="h-3 w-3" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingId(null)}
                                                    className="p-1 rounded bg-zinc-700 text-zinc-400 hover:text-white"
                                                    aria-label="?�정 취소"
                                                    title="?�정 취소"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span className="text-sm font-bold text-emerald-400 tabular-nums tracking-tight">
                                                    {req.amount.toLocaleString()}
                                                </span>
                                                {filterStatus === "PENDING" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setEditingId(req.id); setEditAmount(req.amount.toString()); }}
                                                        className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-white transition-colors"
                                                        title="금액 ?�정"
                                                    >
                                                        <Edit3 className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-center align-middle">
                                        <div className="text-xs text-zinc-500 font-mono">
                                            {req.created_at ? dayjs(req.created_at).format("MM/DD HH:mm") : "-"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right align-middle">
                                        {req.status === "PENDING" ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openApproveModal(req)}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-admin-accent/10 text-admin-accent hover:bg-admin-accent hover:text-white transition-all duration-200 border border-admin-accent/20"
                                                >
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    <span className="font-bold">?�인</span>
                                                </button>
                                                <button
                                                    onClick={() => handleReject(req.id)}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-admin-danger/10 text-admin-danger hover:bg-admin-danger hover:text-white transition-all duration-200 border border-admin-danger/20"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                    <span className="font-bold">반려</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-tight justify-end ${req.status === "APPROVED" ? "bg-admin-accent/10 text-admin-accent border border-admin-accent/30" : "bg-admin-danger/10 text-admin-danger border border-admin-danger/30"}`}>
                                                {req.status === "APPROVED" ? (<><CheckCircle2 className="h-3 w-3" /> ?�인 ?�료</>) : (<><XCircle className="h-3 w-3" /> 반려 처리</>)}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center gap-4 px-2">
                <div className="flex items-center gap-2 text-admin-meta text-admin-text-muted">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>?�인 ???�당 ?��???가???�액??즉시 차감?�니?? (부�??�인???�하?�면 ?�인 버튼 ??금액???�정?�세??</span>
                </div>
            </div>

            {/* Approval Modal */}
            {
                approvalModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-admin-card w-full max-w-md rounded-2xl border border-admin-border shadow-2xl p-6 space-y-6">
                            <div className="flex justify-between items-start">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <CheckCircle2 className="text-admin-accent" />
                                    출금 ?�인 처리
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setApprovalModal(null)}
                                    className="text-admin-text-muted hover:text-white"
                                    aria-label="?�인 모달 ?�기"
                                    title="?�기"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-admin-sidebar p-4 rounded-xl border border-admin-border">
                                    <div className="text-admin-meta text-admin-text-secondary mb-1">?�청 ?�용??/div>
                                    <div className="text-lg font-bold text-admin-text-primary">{approvalModal.nickname}</div>
                                    <div className="text-admin-mono text-admin-text-muted">?�청 금액: {approvalModal.amount.toLocaleString()} KRW</div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-admin-meta text-admin-text-secondary font-bold">?�인 금액 (변�?가??</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={approveAmount}
                                            onChange={(e) => setApproveAmount(e.target.value)}
                                            className="w-full h-12 bg-admin-bg border border-admin-border rounded-xl px-4 text-admin-body font-bold focus:border-admin-accent focus:ring-1 focus:ring-admin-accent outline-none"
                                            aria-label="?�인 금액"
                                            title="?�인 금액"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-admin-text-muted text-sm font-bold">KRW</span>
                                    </div>
                                    <p className="text-xs text-admin-text-muted">
                                        * ?�제 출금 ?�인??금액???�력?�세?? 기본값�? ?�청 금액?�니??
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-admin-meta text-admin-text-secondary font-bold">관리자 메모 (?�택)</label>
                                    <textarea
                                        value={approveMemo}
                                        onChange={(e) => setApproveMemo(e.target.value)}
                                        placeholder="처리 ?�유 ??메모..."
                                        className="w-full h-20 bg-admin-bg border border-admin-border rounded-xl p-3 text-admin-body resize-none focus:border-admin-brand outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setApprovalModal(null)}
                                    className="flex-1 py-3 bg-admin-sidebar text-admin-text-secondary hover:bg-admin-hover rounded-xl font-bold transition-all"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleConfirmApprove}
                                    className="flex-1 py-3 bg-admin-accent hover:bg-admin-accent/90 text-white rounded-xl font-bold shadow-lg shadow-admin-accent/20 transition-all"
                                >
                                    ?�인 ?�정
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Balance Modal */}
            {
                balanceModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
                        <div className="bg-admin-card w-full max-w-sm rounded-2xl border border-admin-border shadow-2xl p-6 space-y-6">
                            <div className="flex justify-between items-start">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <CreditCard className="text-admin-brand" />
                                    ?�액 직접 ?�정
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setBalanceModal(null)}
                                    className="text-admin-text-muted hover:text-white"
                                    aria-label="?�액 ?�정 모달 ?�기"
                                    title="?�기"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-admin-sidebar/50 p-4 rounded-xl border border-admin-border space-y-1">
                                    <div className="text-admin-meta text-admin-text-secondary uppercase font-bold tracking-widest">Target User</div>
                                    <div className="text-base font-bold text-admin-text-primary">{balanceModal.nickname}</div>
                                    <div className="text-admin-mono text-admin-text-muted">ID: {balanceModal.userId}</div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-admin-text-secondary">금고 ?�금 금액 (Locked)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={newLocked}
                                                onChange={(e) => setNewLocked(e.target.value)}
                                                className="w-full h-10 bg-admin-bg border border-admin-border rounded-xl px-3 text-sm font-bold text-admin-brand outline-none focus:border-admin-brand"
                                                aria-label="금고 ?�금 금액(Locked)"
                                                title="금고 ?�금 금액(Locked)"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-admin-text-muted font-bold">KRW</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-admin-text-secondary">가???�화 ?�액 (Available)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={newAvailable}
                                                onChange={(e) => setNewAvailable(e.target.value)}
                                                className="w-full h-10 bg-admin-bg border border-admin-border rounded-xl px-3 text-sm font-bold text-admin-accent outline-none focus:border-admin-accent"
                                                aria-label="가???�화 ?�액(Available)"
                                                title="가???�화 ?�액(Available)"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-admin-text-muted font-bold">KRW</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 bg-admin-danger/10 border border-admin-danger/20 rounded-xl">
                                    <p className="text-[11px] text-admin-danger font-medium leading-relaxed">
                                        <AlertCircle className="inline h-3 w-3 mr-1 align-sub" />
                                        주의: ???�정?� ?�재 ?�액??무시?�고 ?�당 금액?�로 강제 ?�팅?�니??
                                        변�??�역?� ?�산 ?�장??기록?�니??
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setBalanceModal(null)}
                                    className="flex-1 py-2.5 bg-admin-sidebar text-admin-text-secondary hover:bg-admin-hover rounded-xl font-bold transition-all text-sm"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleUpdateBalance}
                                    disabled={balanceLoading}
                                    className="flex-1 py-2.5 bg-admin-brand hover:brightness-110 text-white rounded-xl font-bold shadow-lg shadow-admin-brand/20 transition-all text-sm"
                                >
                                    {balanceLoading ? "반영 �?.." : "?�정 반영"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

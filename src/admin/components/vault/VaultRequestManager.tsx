import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Clock, Loader2, Pencil, Ban, Save, Undo2 } from "lucide-react";
import userApi from "../../../api/httpClient";

interface VaultRequest {
    id: number;
    user_id: number;
    amount: number;
    status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
    created_at: string;
    processed_at?: string;
    admin_memo?: string;
}

const fetchRequests = async (status: string) => {
    const res = await userApi.get<VaultRequest[]>("/api/vault/admin/requests", { params: { status } });
    return res.data;
};

const processRequest = async (payload: { request_id: number; action: "APPROVE" | "REJECT"; admin_memo?: string }) => {
    return userApi.post("/api/vault/admin/process", payload);
};

const adjustAmount = async (payload: { request_id: number; new_amount: number; admin_memo?: string }) => {
    return userApi.post("/api/vault/admin/adjust-amount", payload);
};

const cancelRequest = async (payload: { request_id: number; admin_memo?: string }) => {
    return userApi.post("/api/vault/admin/cancel", payload);
};

const VaultRequestManager: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED" | "CANCELLED">("PENDING");
    const [memo, setMemo] = useState("");
    const [editingRequestId, setEditingRequestId] = useState<number | null>(null);
    const [editingAmount, setEditingAmount] = useState<string>("");

    const { data: requests, isLoading } = useQuery({
        queryKey: ["vault-requests", activeTab],
        queryFn: () => fetchRequests(activeTab),
        refetchInterval: 10000,
    });

    const mutation = useMutation({
        mutationFn: processRequest,
        onSuccess: () => {
            alert("처리가 완료되었습니다.");
            queryClient.invalidateQueries({ queryKey: ["vault-requests"] });
            setMemo("");
        },
        onError: (err: any) => {
            alert(`처리 실패: ${err.message}`);
        }
    });

    const adjustMutation = useMutation({
        mutationFn: adjustAmount,
        onSuccess: () => {
            alert("금액 조정이 완료되었습니다.");
            queryClient.invalidateQueries({ queryKey: ["vault-requests"] });
            setEditingRequestId(null);
            setEditingAmount("");
            setMemo("");
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.detail || err?.message || "조정 실패";
            alert(`조정 실패: ${msg}`);
        },
    });

    const cancelMutation = useMutation({
        mutationFn: cancelRequest,
        onSuccess: () => {
            alert("요청이 취소(CANCELLED) 처리되었습니다.");
            queryClient.invalidateQueries({ queryKey: ["vault-requests"] });
            setEditingRequestId(null);
            setEditingAmount("");
            setMemo("");
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.detail || err?.message || "취소 실패";
            alert(`취소 실패: ${msg}`);
        },
    });

    const handleAction = (id: number, action: "APPROVE" | "REJECT") => {
        if (!confirm(`${action === "APPROVE" ? "승인" : "거절"}하시겠습니까?`)) return;
        mutation.mutate({ request_id: id, action, admin_memo: memo || undefined });
    };

    const pendingBusy = mutation.isPending || adjustMutation.isPending || cancelMutation.isPending;

    const startEditAmount = (req: VaultRequest) => {
        setEditingRequestId(req.id);
        setEditingAmount(String(req.amount));
    };

    const submitEditAmount = (requestId: number) => {
        const nextAmount = Number(editingAmount);
        if (!Number.isFinite(nextAmount) || !Number.isInteger(nextAmount)) {
            alert("금액은 정수로 입력해주세요.");
            return;
        }
        if (nextAmount < 10000) {
            alert("최소 금액은 10,000 입니다.");
            return;
        }
        if (!confirm("해당 요청 금액을 조정하시겠습니까?")) return;
        adjustMutation.mutate({ request_id: requestId, new_amount: nextAmount, admin_memo: memo || undefined });
    };

    const submitCancel = (requestId: number) => {
        if (!confirm("해당 요청을 취소(CANCELLED) 처리하시겠습니까?")) return;
        cancelMutation.mutate({ request_id: requestId, admin_memo: memo || undefined });
    };

    const headerHint = useMemo(() => {
        if (activeTab !== "PENDING") return "";
        return "PENDING 탭에서는 승인/거절 외에도 금액조정/취소가 가능합니다.";
    }, [activeTab]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-400" />
                    출금(전환) 요청 관리
                </h3>
                <div className="flex bg-[#111] rounded-lg p-1 border border-[#333]">
                    {["PENDING", "APPROVED", "REJECTED", "CANCELLED"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-4 py-1.5 text-xs font-bold rounded ${activeTab === tab ? "bg-[#333] text-white" : "text-gray-500 hover:text-gray-300"}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-[#222] bg-[#0b0b0b] p-4">
                <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-bold text-gray-400">관리자 메모(선택)</label>
                    {headerHint && <div className="text-[11px] text-gray-600">{headerHint}</div>}
                </div>
                <input
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="예: 고객 요청으로 금액 조정 / 중복 신청 취소"
                    className="w-full rounded-md border border-[#333] bg-[#111] px-3 py-2 text-sm text-white placeholder:text-gray-600"
                />
                <div className="text-[11px] text-gray-600">승인/거절/조정/취소 모두 동일 메모가 사용됩니다.</div>
            </div>

            <div className="rounded-xl border border-[#333] bg-[#0f0f0f] overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-gray-500" /></div>
                ) : (requests?.length ?? 0) === 0 ? (
                    <div className="p-12 text-center text-gray-600 font-bold">요청 내역이 없습니다.</div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#1a1a1a] text-gray-400">
                            <tr>
                                <th className="py-3 px-4">ID</th>
                                <th className="py-3 px-4">User</th>
                                <th className="py-3 px-4 text-right">Amount</th>
                                <th className="py-3 px-4">Time</th>
                                <th className="py-3 px-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222]">
                            {requests?.map(req => (
                                <tr key={req.id} className="hover:bg-[#151515]">
                                    <td className="py-3 px-4 text-gray-500 text-xs">#{req.id}</td>
                                    <td className="py-3 px-4 font-bold text-white">{req.user_id}</td>
                                    <td className="py-3 px-4 text-right font-mono text-figma-accent">
                                        {editingRequestId === req.id ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <input
                                                    value={editingAmount}
                                                    onChange={(e) => setEditingAmount(e.target.value)}
                                                    disabled={pendingBusy}
                                                    className="w-[140px] rounded-md border border-[#333] bg-[#111] px-2 py-1 text-right text-sm text-white"
                                                    inputMode="numeric"
                                                />
                                                <button
                                                    onClick={() => submitEditAmount(req.id)}
                                                    disabled={pendingBusy}
                                                    className="p-2 rounded bg-[#2D6B3B]/30 text-[#91F402] hover:bg-[#2D6B3B]/50 border border-[#2D6B3B]/40"
                                                    title="저장"
                                                >
                                                    <Save className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEditingRequestId(null);
                                                        setEditingAmount("");
                                                    }}
                                                    disabled={pendingBusy}
                                                    className="p-2 rounded bg-gray-900/30 text-gray-300 hover:bg-gray-900/50 border border-gray-800/30"
                                                    title="취소"
                                                >
                                                    <Undo2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            req.amount.toLocaleString()
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-xs text-gray-400">{new Date(req.created_at).toLocaleString()}</td>
                                    <td className="py-3 px-4 flex items-center justify-center gap-2">
                                        {req.status === "PENDING" && (
                                            <>
                                                <button
                                                    onClick={() => handleAction(req.id, "APPROVE")}
                                                    disabled={pendingBusy}
                                                    className="p-2 rounded bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-800/30"
                                                    title="승인"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(req.id, "REJECT")}
                                                    disabled={pendingBusy}
                                                    className="p-2 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800/30"
                                                    title="거절"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>

                                                <button
                                                    onClick={() => (editingRequestId === req.id ? null : startEditAmount(req))}
                                                    disabled={pendingBusy || editingRequestId !== null}
                                                    className="p-2 rounded bg-blue-900/20 text-blue-300 hover:bg-blue-900/40 border border-blue-800/30 disabled:opacity-60"
                                                    title="금액 조정"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>

                                                <button
                                                    onClick={() => submitCancel(req.id)}
                                                    disabled={pendingBusy}
                                                    className="p-2 rounded bg-gray-800/40 text-gray-300 hover:bg-gray-800/60 border border-gray-700/30 disabled:opacity-60"
                                                    title="취소(CANCELLED)"
                                                >
                                                    <Ban className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                        {req.status !== "PENDING" && (
                                            <span
                                                className={`text-xs font-bold px-2 py-1 rounded ${
                                                    req.status === "APPROVED"
                                                        ? "bg-green-900/20 text-green-500"
                                                        : req.status === "REJECTED"
                                                          ? "bg-red-900/20 text-red-500"
                                                          : "bg-gray-800/40 text-gray-300"
                                                }`}
                                            >
                                                {req.status}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default VaultRequestManager;

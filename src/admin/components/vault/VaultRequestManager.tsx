import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Clock, Loader2 } from "lucide-react";
import userApi from "../../../api/httpClient";

interface VaultRequest {
    id: number;
    user_id: number;
    amount: number;
    status: "PENDING" | "APPROVED" | "REJECTED";
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

const VaultRequestManager: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
    const [memo, setMemo] = useState("");

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

    const handleAction = (id: number, action: "APPROVE" | "REJECT") => {
        if (!confirm(`${action === "APPROVE" ? "승인" : "거절"}하시겠습니까?`)) return;
        mutation.mutate({ request_id: id, action, admin_memo: memo || undefined });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-400" />
                    출금(전환) 요청 관리
                </h3>
                <div className="flex bg-[#111] rounded-lg p-1 border border-[#333]">
                    {["PENDING", "APPROVED", "REJECTED"].map(tab => (
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
                                    <td className="py-3 px-4 text-right font-mono text-figma-accent">{req.amount.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-xs text-gray-400">{new Date(req.created_at).toLocaleString()}</td>
                                    <td className="py-3 px-4 flex items-center justify-center gap-2">
                                        {req.status === "PENDING" && (
                                            <>
                                                <button
                                                    onClick={() => handleAction(req.id, "APPROVE")}
                                                    disabled={mutation.isPending}
                                                    className="p-2 rounded bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-800/30"
                                                    title="승인"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(req.id, "REJECT")}
                                                    disabled={mutation.isPending}
                                                    className="p-2 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800/30"
                                                    title="거절"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                        {req.status !== "PENDING" && (
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${req.status === "APPROVED" ? "bg-green-900/20 text-green-500" : "bg-red-900/20 text-red-500"}`}>
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

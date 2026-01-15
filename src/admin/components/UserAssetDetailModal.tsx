import React, { useEffect, useState } from "react";
import { X, Users, Wallet, ScrollText, History, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchRecentPlayLogs, fetchLedger, fetchWalletSummary } from "../api/adminGameTokenApi";
import { adminInventoryApi } from "../api/adminInventoryApi";
import { GAME_TOKEN_LABELS, GameTokenType } from "../../types/gameTokens";

interface UserAssetDetailModalProps {
    isVisible: boolean;
    onClose: () => void;
    userId: number | null;
}


function sumBalances(balances: Record<string, number> | undefined) {
    if (!balances) return 0;
    return Object.values(balances).reduce((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
}

function formatKSTTime(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(d).replace(/\. /g, "/").replace(/\.$/, "");
}

const UserAssetDetailModal: React.FC<UserAssetDetailModalProps> = ({ isVisible, onClose, userId }) => {
    const [activeTab, setActiveTab] = useState<"summary" | "playLogs" | "ledger" | "inventory">("summary");

    // Check if user is selected
    const enabled = isVisible && !!userId;

    // Queries
    const summaryQuery = useQuery({
        queryKey: ["admin", "user-detail", userId, "summary"],
        queryFn: async () => {
            if (!userId) return null;
            const summaries = await fetchWalletSummary();
            return summaries.find(u => u.user_id === userId) || null;
        },
        enabled,
    });

    const playLogsQuery = useQuery({
        queryKey: ["admin", "user-detail", userId, "play-logs"],
        queryFn: () => userId ? fetchRecentPlayLogs(100, String(userId)) : Promise.resolve([]),
        enabled: enabled && activeTab === "playLogs",
    });

    const ledgerQuery = useQuery({
        queryKey: ["admin", "user-detail", userId, "ledger"],
        queryFn: () => userId ? fetchLedger(100, String(userId)) : Promise.resolve([]),
        enabled: enabled && activeTab === "ledger",
    });

    const inventoryQuery = useQuery({
        queryKey: ["admin", "user-detail", userId, "inventory"],
        queryFn: () => userId ? adminInventoryApi.fetchUserInventory(userId, 100) : Promise.resolve(null),
        enabled: enabled && (activeTab === "inventory" || activeTab === "summary"),
    });

    // Reset tab when modal opens
    useEffect(() => {
        if (isVisible) setActiveTab("summary");
    }, [isVisible]);

    if (!isVisible || !userId) return null;

    const userSummary = summaryQuery.data;
    const inventoryData = inventoryQuery.data;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-admin-brand/10 rounded-lg">
                            <Users className="h-6 w-6 text-admin-brand" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {userSummary?.nickname || `User #${userId}`}
                                <span className="text-sm font-normal text-zinc-500 font-mono">ID: {userId}</span>
                            </h3>
                            <div className="text-xs text-zinc-500 font-mono mt-0.5">
                                Ext: {userSummary?.external_id || "-"} | Tel: {userSummary?.telegram_username ? `@${userSummary.telegram_username}` : "-"}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-none px-6 border-b border-zinc-800 bg-zinc-900/30">
                    <div className="flex gap-6">
                        {[
                            { id: "summary", label: "자산 요약", icon: Wallet },
                            { id: "playLogs", label: "플레이 로그", icon: ScrollText },
                            { id: "ledger", label: "지갑 원장", icon: History },
                            { id: "inventory", label: "인벤토리", icon: Package },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 py-4 border-b-2 text-sm font-bold transition-colors ${activeTab === tab.id
                                    ? "border-admin-brand text-white"
                                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                                    }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 bg-black/20 custom-scrollbar">
                    {activeTab === "summary" && (
                        <div className="space-y-6">
                            {/* Wallet Balances */}
                            <div>
                                <h4 className="text-sm font-bold text-zinc-400 mb-3 uppercase tracking-wider">티켓 지갑 (Wallet)</h4>
                                {userSummary ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {Object.entries(userSummary.balances).map(([key, val]) => {
                                            if (val === 0) return null;
                                            return (
                                                <div key={key} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
                                                    <div className="text-xs text-zinc-500 font-bold mb-1">{GAME_TOKEN_LABELS[key as GameTokenType] || key}</div>
                                                    <div className="text-2xl font-black text-white font-mono tabular-nums">{val.toLocaleString()}</div>
                                                </div>
                                            );
                                        })}
                                        {sumBalances(userSummary.balances) === 0 && (
                                            <div className="col-span-full py-4 text-zinc-500 text-sm italic">보유한 티켓이 없습니다.</div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-zinc-500">데이터를 불러오는 중...</div>
                                )}
                            </div>

                            {/* Inventory Summary */}
                            <div>
                                <h4 className="text-sm font-bold text-zinc-400 mb-3 uppercase tracking-wider">인벤토리 (Inventory)</h4>
                                {inventoryData ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {inventoryData.items.length > 0 ? (
                                            inventoryData.items.map(item => (
                                                <div key={item.item_type} className="flex items-center justify-between bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
                                                    <div className="text-sm font-bold text-zinc-200">{item.item_type}</div>
                                                    <div className="text-lg font-black text-emerald-400 font-mono tabular-nums">
                                                        x{item.quantity.toLocaleString()}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-full py-4 text-zinc-500 text-sm italic">인벤토리 아이템이 없습니다.</div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-zinc-500">데이터를 불러오는 중...</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "playLogs" && (
                        <div className="space-y-4">
                            {playLogsQuery.isLoading ? (
                                <div className="text-center py-10 text-zinc-500">불러오는 중...</div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-800">
                                        <tr>
                                            <th className="px-4 py-3">시간</th>
                                            <th className="px-4 py-3">게임</th>
                                            <th className="px-4 py-3 text-right">보상</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {(playLogsQuery.data || []).map((log) => (
                                            <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-sm text-zinc-400 font-mono">{formatKSTTime(log.created_at)}</td>
                                                <td className="px-4 py-3 text-sm text-white font-bold">{log.game}</td>
                                                <td className="px-4 py-3 text-right text-sm font-mono text-emerald-400">
                                                    {log.reward_amount > 0 ? `+${log.reward_amount.toLocaleString()}` : "-"}
                                                </td>
                                            </tr>
                                        ))}
                                        {(playLogsQuery.data || []).length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">기록이 없습니다.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {activeTab === "ledger" && (
                        <div className="space-y-4">
                            {ledgerQuery.isLoading ? (
                                <div className="text-center py-10 text-zinc-500">불러오는 중...</div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-800">
                                        <tr>
                                            <th className="px-4 py-3">시간</th>
                                            <th className="px-4 py-3">티켓</th>
                                            <th className="px-4 py-3 text-right">변동</th>
                                            <th className="px-4 py-3 text-right">잔액</th>
                                            <th className="px-4 py-3">사유</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {(ledgerQuery.data || []).map((entry) => (
                                            <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-sm text-zinc-400 font-mono">{formatKSTTime(entry.created_at)}</td>
                                                <td className="px-4 py-3 text-sm text-white">{GAME_TOKEN_LABELS[entry.token_type] || entry.token_type}</td>
                                                <td className={`px-4 py-3 text-right text-sm font-mono font-bold ${entry.delta > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                                    {entry.delta > 0 ? "+" : ""}{entry.delta.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-mono text-zinc-300">
                                                    {entry.balance_after.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-zinc-500 break-all max-w-[200px]">{entry.reason}</td>
                                            </tr>
                                        ))}
                                        {(ledgerQuery.data || []).length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">기록이 없습니다.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {activeTab === "inventory" && (
                        <div className="space-y-8">
                            {/* Current Items */}
                            <div>
                                <h4 className="text-sm font-bold text-zinc-400 mb-3 uppercase tracking-wider border-b border-zinc-800 pb-2">보유 아이템</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {(inventoryData?.items || []).map(item => (
                                        <div key={item.item_type} className="flex items-center justify-between bg-zinc-800/30 px-4 py-3 rounded-lg">
                                            <span className="text-sm font-bold text-zinc-200">{item.item_type}</span>
                                            <span className="text-sm font-mono font-bold text-emerald-400">x{item.quantity.toLocaleString()}</span>
                                        </div>
                                    ))}
                                    {(inventoryData?.items || []).length === 0 && (
                                        <div className="text-zinc-500 text-sm py-2">보유 중인 아이템이 없습니다.</div>
                                    )}
                                </div>
                            </div>

                            {/* Inventory History (Ledger) */}
                            <div>
                                <h4 className="text-sm font-bold text-zinc-400 mb-3 uppercase tracking-wider border-b border-zinc-800 pb-2">인벤토리 기록 (Recent 100)</h4>
                                <table className="w-full text-left border-collapse">
                                    <thead className="text-xs text-zinc-500 uppercase border-b border-zinc-800">
                                        <tr>
                                            <th className="px-4 py-3">시간</th>
                                            <th className="px-4 py-3">아이템</th>
                                            <th className="px-4 py-3 text-right">변동</th>
                                            <th className="px-4 py-3 text-right">잔여</th>
                                            <th className="px-4 py-3">사유</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {(inventoryData?.ledger || []).map((entry) => (
                                            <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-sm text-zinc-400 font-mono">{formatKSTTime(entry.created_at)}</td>
                                                <td className="px-4 py-3 text-sm text-white break-all max-w-[150px]">{entry.item_type}</td>
                                                <td className={`px-4 py-3 text-right text-sm font-mono font-bold ${entry.change_amount > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                                    {entry.change_amount > 0 ? "+" : ""}{entry.change_amount.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-mono text-zinc-300">
                                                    {entry.balance_after.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-zinc-500 break-all max-w-[150px]">{entry.reason}</td>
                                            </tr>
                                        ))}
                                        {(inventoryData?.ledger || []).length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">기록이 없습니다.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserAssetDetailModal;

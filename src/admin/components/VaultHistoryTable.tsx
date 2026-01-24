import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchUserVaultHistory, VaultEarnEvent, fetchUserVaultState } from "../api/adminUserApi";
import { X, Vault } from "lucide-react";

interface VaultHistoryTableProps {
    user: { id: number; nickname?: string; external_id?: string; telegram_username?: string | null };
    onClose: () => void;
}

const VaultHistoryTable: React.FC<VaultHistoryTableProps> = ({ user, onClose }) => {
    const { data: history, isLoading, isError } = useQuery<VaultEarnEvent[]>({
        queryKey: ["admin", "users", user.id, "vault", "history"],
        queryFn: () => fetchUserVaultHistory(user.id),
    });

    const { data: vaultState } = useQuery({
        queryKey: ["admin", "users", user.id, "vault", "state"],
        queryFn: () => fetchUserVaultState(user.id),
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-5xl rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-900/50">
                    <div className="space-y-1">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            ?èÜ Í∏àÍ≥† ?ÅÎ¶Ω/?¨Ïö© ?¥Ïó≠
                            <span className="text-sm font-normal text-zinc-400">
                                (User: {user.nickname || user.telegram_username || user.external_id})
                            </span>
                        </h2>
                        <p className="text-xs text-zinc-500">ÏµúÍ∑º 100Í±¥Ïùò Í∏àÍ≥† Î≥Ä???¥Ïó≠??Ï°∞Ìöå?©Îãà??</p>
                        {vaultState && (
                            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-zinc-800/50">
                                <div className="flex items-center gap-2">
                                    <Vault size={16} className="text-emerald-400" />
                                    <span className="text-sm font-semibold text-emerald-400">
                                        ?ÑÏû¨ ?ÑÏ†Å Í∏àÍ≥†?? {vaultState.locked_balance.toLocaleString()}??
                                    </span>
                                </div>
                                <div className="text-xs text-zinc-500">
                                    (?¨Ïö©Í∞Ä?? {vaultState.available_balance.toLocaleString()}??
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-0 custom-scrollbar bg-zinc-900">
                    {isLoading && (
                        <div className="flex h-64 items-center justify-center text-zinc-500">
                            ?∞Ïù¥?∞Î? Î∂àÎü¨?§Îäî Ï§ëÏûÖ?àÎã§...
                        </div>
                    )}

                    {isError && (
                        <div className="flex h-64 items-center justify-center text-red-400">
                            ?¥Ïó≠??Î∂àÎü¨?§Îäî???§Ìå®?àÏäµ?àÎã§.
                        </div>
                    )}

                    {!isLoading && !isError && history && history.length === 0 && (
                        <div className="flex h-64 items-center justify-center text-zinc-500">
                            Í∏∞Î°ù???¥Ïó≠???ÜÏäµ?àÎã§.
                        </div>
                    )}

                    {!isLoading && !isError && history && history.length > 0 && (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur z-10 border-b border-zinc-800">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Time (KST)</th>
                                    <th className="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Event ID</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Source / Game</th>
                                    <th className="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Meta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {history.map((event) => {
                                    const isPositive = event.amount > 0;
                                    const isNegative = event.amount < 0;
                                    const utcDate = new Date(event.created_at);
                                    // Basic KST conversion
                                    const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
                                    const dateStr = kstDate.toISOString().replace("T", " ").substring(0, 19);

                                    return (
                                        <tr key={event.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-3 text-sm text-zinc-400 font-mono whitespace-nowrap">
                                                {dateStr}
                                            </td>
                                            <td className="px-6 py-3 text-sm font-medium text-white">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded textxs font-medium ${event.earn_type === "GAME_PLAY" ? "bg-emerald-500/10 text-emerald-400" :
                                                    event.earn_type === "MISSION_REWARD" ? "bg-amber-500/10 text-amber-400" :
                                                        event.earn_type === "TRIAL_PAYOUT" ? "bg-blue-500/10 text-blue-400" :
                                                            "bg-zinc-800 text-zinc-300"
                                                    }`}>
                                                    {event.earn_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-xs text-zinc-500 font-mono max-w-[200px] truncate" title={event.earn_event_id}>
                                                {event.earn_event_id}
                                            </td>
                                            <td className={`px-6 py-3 text-sm font-bold text-right font-mono ${isPositive ? "text-emerald-400" : isNegative ? "text-red-400" : "text-zinc-500"
                                                }`}>
                                                {isPositive ? "+" : ""}{event.amount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-3 text-sm text-zinc-300">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{event.source}</span>
                                                    {event.game_type && event.game_type !== event.source && (
                                                        <span className="text-xs text-zinc-500">{event.game_type}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-xs text-zinc-500 max-w-[300px]">
                                                <pre className="whitespace-pre-wrap font-mono text-[10px] leading-tight text-zinc-600 group-hover:text-zinc-400 transition-colors">
                                                    {JSON.stringify(event.payout_raw_json, null, 2)}
                                                </pre>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VaultHistoryTable;

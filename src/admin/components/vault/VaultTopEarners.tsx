import React, { useEffect, useState } from "react";
import { fetchVaultStatsDetails } from "../../api/adminVaultApi";
import { AlertOctagon } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";

interface VaultTopEarnersProps {
    refreshKey?: number;
}

export const VaultTopEarners: React.FC<VaultTopEarnersProps> = ({ refreshKey }) => {
    const [topUsers, setTopUsers] = useState<any[]>([]);
    const [riskUsers, setRiskUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [refreshKey]);

    const loadData = async () => {
        try {
            // Fetch Top Earners
            const { items: earners } = await fetchVaultStatsDetails("top_accrual", 5);
            setTopUsers(earners || []);

            // Fetch Risk Users (Mock logic or specific type if implemented)
            // Assuming 'high_velocity' type exists or we simulate
            try {
                const { items: risks } = await fetchVaultStatsDetails("high_velocity", 3);
                setRiskUsers(risks || []);
            } catch {
                // Ignore if type not supported yet
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-900/20">
            {/* List Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                {loading ? (
                    <div className="space-y-1 p-3">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-zinc-800/50 rounded animate-pulse" />)}
                    </div>
                ) : topUsers.length === 0 ? (
                    <div className="text-center py-12 text-zinc-600 text-xs">
                        ?∞Ïù¥?∞Í? ?ÜÏäµ?àÎã§.
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-800/50">
                        {topUsers.map((user, idx) => (
                            <div key={user.user_id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                        idx === 1 ? 'bg-zinc-700/50 text-zinc-400' :
                                            idx === 2 ? 'bg-orange-700/20 text-orange-600' :
                                                'text-zinc-600'
                                        }`}>
                                        {idx + 1}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                                            {user.nickname || `User ${user.user_id}`}
                                        </div>
                                        <div className="text-[10px] text-zinc-600 font-mono">
                                            ID: {user.user_id}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-emerald-500 font-mono tracking-tight">
                                        +{formatCurrency(user.amount || 0)}
                                    </div>
                                    <div className="text-[10px] text-zinc-600">?§Îäò ?ÅÎ¶Ω</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Risk Radar Section (Bottom Fixed) */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-2 mb-2 text-rose-500">
                    <AlertOctagon size={14} />
                    <span className="text-xs font-bold uppercase tracking-wider">Risk Radar</span>
                </div>
                {riskUsers.length > 0 ? (
                    <div className="space-y-1">
                        {riskUsers.map(u => (
                            <div key={u.user_id} className="flex justify-between items-center px-2 py-1.5 rounded bg-rose-500/10 border border-rose-500/20">
                                <span className="text-xs text-rose-200 font-bold">{u.nickname}</span>
                                <span className="text-[10px] text-rose-400 uppercase tracking-tight">Abnormal Velocity</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-zinc-600 px-2 py-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-xs">?ÑÏû¨ Í∞êÏ????ÑÌóò ?†Ìò∏ ?ÜÏùå</span>
                    </div>
                )}
            </div>
        </div>
    );
};

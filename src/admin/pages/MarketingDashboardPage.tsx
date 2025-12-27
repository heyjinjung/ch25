import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Users,
    Crown,
    TrendingUp,
    Zap,
    Activity,
    Target,
    Send,
    Droplets
} from "lucide-react";
import { fetchCrmStats } from "../api/adminCrmApi";
import { useToast } from "../../components/common/ToastProvider";
import { useNavigate } from "react-router-dom";

const MarketingDashboardPage: React.FC = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const { data: stats, isLoading } = useQuery({
        queryKey: ["admin", "crm", "stats"],
        queryFn: fetchCrmStats,
        refetchInterval: 30000, // Refresh every 30s
    });

    // Navigation helper to pre-fill message
    // In a real app, we'd pass state to the route or use a context.
    // For now, we'll just navigate to Message Center.
    const goToMessage = (targetType: string, targetValue: string) => {
        // In future: pass params to pre-fill form
        navigate("/admin/messages");
        addToast(`Tip: Select Target '${targetType}' and Value '${targetValue}' to blast this segment.`, "info");
    };

    return (
        <section className="space-y-8 max-w-7xl mx-auto pb-10">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Marketing Center</h2>
                    <p className="mt-1 text-gray-400">Real-time audience insights & campaign operations</p>
                </div>
                <button
                    onClick={() => navigate("/admin/messages")}
                    className="flex items-center gap-2 rounded-lg bg-[#91F402] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#a3ff12] transition-colors shadow-[0_0_15px_rgba(145,244,2,0.3)]"
                >
                    <Send size={18} /> New Campaign
                </button>
            </header>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Reach */}
                <div className="rounded-xl border border-[#333333] bg-[#111111] p-6 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 h-32 w-32 bg-blue-500/10 blur-3xl transition-opacity group-hover:opacity-40" />
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-400">Total Audience</p>
                            <div className="mt-2 text-3xl font-bold text-white">{isLoading ? "-" : stats?.total_users?.toLocaleString()}</div>
                        </div>
                        <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg"><Users size={20} /></div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-green-400 gap-1">
                        <Activity size={14} />
                        <span>{stats?.active_users} Active Now</span>
                    </div>
                </div>

                {/* Paying Users (Conversion) */}
                <div className="rounded-xl border border-[#333333] bg-[#111111] p-6 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 h-32 w-32 bg-[#91F402]/10 blur-3xl transition-opacity group-hover:opacity-40" />
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-400">Conversion Rate</p>
                            <div className="mt-2 text-3xl font-bold text-[#91F402]">{isLoading ? "-" : `${stats?.conversion_rate}% `}</div>
                        </div>
                        <div className="p-3 bg-[#91F402]/20 text-[#91F402] rounded-lg"><TrendingUp size={20} /></div>
                    </div>
                    <div className="mt-4 text-sm text-gray-400">
                        {stats?.paying_users} Paying Users
                    </div>
                </div>

                {/* Whales */}
                <div className="rounded-xl border border-[#333333] bg-[#111111] p-6 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 h-32 w-32 bg-purple-500/10 blur-3xl transition-opacity group-hover:opacity-40" />
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-400">Whale Count</p>
                            <div className="mt-2 text-3xl font-bold text-purple-400">{isLoading ? "-" : stats?.whale_count}</div>
                        </div>
                        <div className="p-3 bg-purple-500/20 text-purple-400 rounded-lg"><Crown size={20} /></div>
                    </div>
                    <div className="mt-4 text-sm text-gray-400">
                        High Value Segment
                    </div>
                </div>

                {/* Empty Tank (Opportunity) */}
                <div className="rounded-xl border border-[#333333] bg-[#111111] p-6 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 h-32 w-32 bg-red-500/10 blur-3xl transition-opacity group-hover:opacity-40" />
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-400">Empty Tanks</p>
                            <div className="mt-2 text-3xl font-bold text-red-400">{isLoading ? "-" : stats?.empty_tank_count}</div>
                        </div>
                        <div className="p-3 bg-red-500/20 text-red-400 rounded-lg"><Droplets size={20} /></div>
                    </div>
                    <div className="mt-4 text-sm text-gray-400">
                        Needs Refill (Opportunity)
                    </div>
                </div>
            </div>

            {/* Actionable Segments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Retention / Activity Panel */}
                <div className="rounded-xl border border-[#333333] bg-[#111111] p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Target size={20} className="text-[#91F402]" /> Suggested Campaigns
                    </h3>

                    <div className="space-y-4">
                        {/* VIP Care */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-[#1A1A1A] border border-[#333333] hover:border-purple-500/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                                    <Crown size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">VIP Care Package</h4>
                                    <p className="text-sm text-gray-400">Target {stats?.whale_count || 0} Whales with a specialized bonus.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => goToMessage("SEGMENT", "WHALE")}
                                className="px-4 py-2 rounded-md bg-purple-600/20 text-purple-400 text-sm font-bold hover:bg-purple-600 hover:text-white transition-colors"
                            >
                                Draft Blast
                            </button>
                        </div>

                        {/* Refill */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-[#1A1A1A] border border-[#333333] hover:border-red-500/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Empty Tank Refill</h4>
                                    <p className="text-sm text-gray-400">Target {stats?.empty_tank_count || 0} users with 0 balance.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => goToMessage("SEGMENT", "EMPTY_TANK")}
                                className="px-4 py-2 rounded-md bg-red-600/20 text-red-400 text-sm font-bold hover:bg-red-600 hover:text-white transition-colors"
                            >
                                Send Offer
                            </button>
                        </div>

                        {/* General Newsletter */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-[#1A1A1A] border border-[#333333] hover:border-blue-500/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Send size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Weekly Newsletter</h4>
                                    <p className="text-sm text-gray-400">Broadcast updates to all {stats?.total_users || 0} users.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => goToMessage("ALL", "")}
                                className="px-4 py-2 rounded-md bg-blue-600/20 text-blue-400 text-sm font-bold hover:bg-blue-600 hover:text-white transition-colors"
                            >
                                Compose
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Insights / Visuals */}
                <div className="rounded-xl border border-[#333333] bg-[#111111] p-6">
                    <h3 className="text-lg font-bold text-white mb-6">Audience Health</h3>

                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-400">Retention (Active / Total)</span>
                                <span className="text-white font-bold">{stats?.retention_rate}%</span>
                            </div>
                            <div className="h-2 w-full bg-[#333333] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                                    style={{ width: `${Math.min(stats?.retention_rate || 0, 100)}% ` }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-400">Monetization (Paying / Total)</span>
                                <span className="text-white font-bold">{stats?.conversion_rate}%</span>
                            </div>
                            <div className="h-2 w-full bg-[#333333] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-[#91F402] to-green-600"
                                    style={{ width: `${Math.min(stats?.conversion_rate || 0, 100)}% ` }}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-[#333333]">
                            <h4 className="text-sm font-medium text-white mb-3">Segment Distribution</h4>
                            <div className="flex gap-2">
                                {/* Visual representation of Whale vs Others */}
                                <div
                                    className="h-20 rounded-lg bg-purple-500/20 border border-purple-500/50 flex flex-col items-center justify-center min-w-[80px]"
                                    title="Whales"
                                >
                                    <span className="text-purple-400 font-bold">{stats?.whale_count}</span>
                                    <span className="text-[10px] text-gray-400 uppercase">Whales</span>
                                </div>
                                <div
                                    className="h-20 rounded-lg bg-red-500/20 border border-red-500/50 flex flex-col items-center justify-center min-w-[80px]"
                                    title="Empty Tank"
                                >
                                    <span className="text-red-400 font-bold">{stats?.empty_tank_count}</span>
                                    <span className="text-[10px] text-gray-400 uppercase">Empty</span>
                                </div>
                                <div
                                    className="h-20 rounded-lg bg-[#333333] flex-1 flex flex-col items-center justify-center"
                                >
                                    <span className="text-gray-300 font-bold">{stats ? stats.total_users - stats.whale_count - stats.empty_tank_count : 0}</span>
                                    <span className="text-[10px] text-gray-500 uppercase">Regular</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default MarketingDashboardPage;

import React from "react";
import {
    Users,
    Coins,
    Target,
    Activity,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchComprehensiveOverview, ComprehensiveOverviewResponse, fetchDashboardMetrics, DashboardMetricsResponse } from "../api/adminDashboardApi";

interface StatCardProps {
    title: string;
    value: string | number;
    change: string;
    isPositive: boolean;
    icon: React.ReactNode;
    compact?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, isPositive, icon, compact }) => {
    if (compact) {
        return (
            <div className="admin-card p-4 group hover:border-admin-brand/30 transition-all duration-300">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-admin-brand/10 text-admin-brand group-hover:scale-105 transition-transform">
                        {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-admin-text-muted uppercase tracking-wider truncate">
                            {title}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-lg font-black text-admin-text-primary">{value}</span>
                            <span className={`text-[10px] font-bold flex items-center ${isPositive ? "text-admin-accent" : "text-admin-danger"}`}>
                                {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                {change}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-card p-6 group hover:border-admin-brand/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-admin-brand/10 text-admin-brand group-hover:scale-110 transition-transform duration-300">
                    {icon}
                </div>
                <div className={`flex items-center text-admin-meta font-bold ${isPositive ? "text-admin-accent" : "text-admin-danger"}`}>
                    {isPositive ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
                    {change}
                </div>
            </div>
            <div>
                <p className="text-admin-meta font-bold text-admin-text-muted uppercase tracking-widest mb-1">
                    {title}
                </p>
                <p className="text-admin-title text-admin-text-primary">
                    {value}
                </p>
            </div>
        </div>
    );
};

interface DailyOpsSummaryProps {
    variant?: "default" | "compact";
}

const DailyOpsSummary: React.FC<DailyOpsSummaryProps> = ({ variant = "default" }) => {
    const { data, isLoading, error } = useQuery<ComprehensiveOverviewResponse>({
        queryKey: ["admin", "dashboard", "comprehensive"],
        queryFn: fetchComprehensiveOverview,
        refetchInterval: 60000, // Refresh every minute
        staleTime: 30000,
    });

    const metricsQuery = useQuery<DashboardMetricsResponse>({
        queryKey: ["admin", "dashboard", "metrics", 24],
        queryFn: () => fetchDashboardMetrics(24),
        refetchInterval: 60000,
        staleTime: 30000,
    });

    const formatCurrency = (value: number) => {
        if (value >= 1000000) return `??{(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `??{(value / 1000).toFixed(1)}K`;
        return `??{value}`;
    };

    const dauValue = metricsQuery.isLoading ? null : metricsQuery.data?.active_users?.value;
    const dauDiff = metricsQuery.isLoading ? null : metricsQuery.data?.active_users?.diff_percent;
    const dauChangeText = dauDiff == null ? "-" : `${dauDiff >= 0 ? "+" : ""}${dauDiff.toFixed(1)}%`;
    const dauIsPositive = dauDiff == null ? true : dauDiff >= 0;

    const stats = [
        {
            title: "Í∏àÏùº ?úÏÑ±",
            value: metricsQuery.isLoading ? "..." : (dauValue?.toLocaleString() || "0"),
            change: metricsQuery.isLoading ? "..." : dauChangeText,
            isPositive: dauIsPositive,
            icon: <Users size={variant === "compact" ? 16 : 20} />,
        },
        {
            title: "Í∏àÏùº ?ÖÍ∏à",
            value: isLoading ? "..." : formatCurrency(data?.today_deposit_sum || 0),
            change: `${data?.today_deposit_count || 0}Í±?,
            isPositive: true,
            icon: <Coins size={variant === "compact" ? 16 : 20} />,
        },
        {
            title: "?¥ÌÉà Î¶¨Ïä§??,
            value: isLoading ? "..." : (data?.churn_risk_count?.toLocaleString() || "0"),
            change: data?.welcome_retention_rate ? `${data.welcome_retention_rate.toFixed(1)}% ?†Ï?` : "-",
            isPositive: (data?.churn_risk_count || 0) < 10,
            icon: <Target size={variant === "compact" ? 16 : 20} />,
        },
        {
            title: "Í≤åÏûÑ ?åÎ†à??,
            value: isLoading ? "..." : (data?.today_game_plays?.toLocaleString() || "0"),
            change: data?.today_ticket_usage ? `${data.today_ticket_usage} ?∞Ïºì` : "0 ?∞Ïºì",
            isPositive: true,
            icon: <Activity size={variant === "compact" ? 16 : 20} />,
        },
    ];

    if (error) {
        return (
            <div className="admin-card p-6 text-center text-admin-danger">
                <p>?∞Ïù¥??Î°úÎî© ?§Ìå®</p>
                <p className="text-sm text-admin-text-muted mt-2">{error instanceof Error ? error.message : "Unknown error"}</p>
            </div>
        );
    }

    if (variant === "compact") {
        return (
            <div className="admin-card-premium p-4 h-full flex flex-col">
                <h3 className="text-xs font-bold text-admin-text-muted uppercase tracking-wider mb-4">Îπ†Î•∏ ?µÍ≥Ñ</h3>
                <div className="flex-1 grid grid-cols-1 gap-3">
                    {stats.map((stat, idx) => (
                        <StatCard key={idx} {...stat} compact />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-admin-subtitle text-admin-text-primary">?¥ÏòÅ ÏßÄ???îÏïΩ</h2>
                    <p className="text-admin-meta text-admin-text-muted">?§ÏãúÍ∞?Ï£ºÏöî ?¥ÏòÅ ?ÑÌô©?ÖÎãà??</p>
                </div>
                <button type="button" className="btn-admin-secondary text-admin-meta py-2">
                    ?ÅÏÑ∏ Î≥¥Í≥†??Î≥¥Í∏∞
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <StatCard key={idx} {...stat} />
                ))}
            </div>
        </section>
    );
};

export default DailyOpsSummary;

// src/admin/components/DailyOpsSummary.tsx
import React, { useEffect, useState } from "react";
import {
    Users,
    TrendingDown,
    Wallet,
    Activity,
    Flame,
    Trophy,
    ArrowUpRight,
    Gamepad2,
    Package,
} from "lucide-react";
import {
    fetchComprehensiveOverview,
    ComprehensiveOverviewResponse,
} from "../api/adminDashboardApi";

const baseAccent = "#91F402";

const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "--";
    return value.toLocaleString();
};

const formatKRW = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "--";
    return `₩${value.toLocaleString()}`;
};

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    subtitle?: string;
    color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, subtitle, color = "bg-[#1F3D24]" }) => (
    <div className="group/card relative rounded-lg border border-[#262626] bg-[#111111] p-4 shadow-md hover:border-[#91F402]/30 transition-colors">
        <div className="flex items-start justify-between">
            <div className="space-y-1">
                <p className="text-xs text-gray-400">{title}</p>
                <h3 className="text-xl font-bold text-white">{value}</h3>
                {subtitle && <p className="text-[11px] text-gray-500">{subtitle}</p>}
            </div>
            <div className={`rounded-full p-2.5 ${color}`} aria-hidden>
                {icon}
            </div>
        </div>
    </div>
);

const DailyOpsSummary: React.FC = () => {
    const [data, setData] = useState<ComprehensiveOverviewResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchComprehensiveOverview();
            setData(res);
        } catch {
            setError("지표를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    if (loading) {
        return (
            <div className="rounded-lg border border-[#262626] bg-[#111111] p-5 shadow-md">
                <p className="text-sm text-gray-400">일일 운영 요약 로딩 중...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-[#3A1F1F] bg-[#1A0D0D] p-4 text-sm text-red-200">
                <div className="flex items-center justify-between">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={load}
                        className="rounded border border-red-300 px-3 py-1 text-red-100 hover:bg-red-800/40"
                    >
                        다시 불러오기
                    </button>
                </div>
            </div>
        );
    }

    const streakCounts = data?.streak_counts ?? { NORMAL: 0, HOT: 0, LEGEND: 0 };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#91F402]">daily ops</p>
                    <h2 className="text-lg font-bold text-white">일일 운영 요약</h2>
                </div>
                <button
                    type="button"
                    onClick={load}
                    className="rounded border border-[#333] px-3 py-1 text-sm text-gray-200 hover:bg-[#171717]"
                >
                    새로고침
                </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {/* Retention/Activity */}
                <MetricCard
                    title="금일 접속자"
                    value={formatNumber(data?.today_active_users)}
                    icon={<Users className="h-4 w-4" style={{ color: baseAccent }} />}
                />
                <MetricCard
                    title="금일 게임 플레이"
                    value={formatNumber(data?.today_game_plays)}
                    icon={<Gamepad2 className="h-4 w-4" style={{ color: baseAccent }} />}
                />
                <MetricCard
                    title="이탈 위험 (어제 활동, 오늘 미접속)"
                    value={formatNumber(data?.churn_risk_count)}
                    icon={<TrendingDown className="h-4 w-4" style={{ color: "#F97935" }} />}
                    color="bg-[#3A2A1F]"
                />
                <MetricCard
                    title="웰컴 리텐션 (D-2)"
                    value={`${data?.welcome_retention_rate?.toFixed(1) ?? "--"}%`}
                    icon={<ArrowUpRight className="h-4 w-4" style={{ color: baseAccent }} />}
                />

                {/* Financials */}
                <MetricCard
                    title="금일 입금 총액"
                    value={formatKRW(data?.today_deposit_sum)}
                    icon={<Wallet className="h-4 w-4" style={{ color: "#FFD700" }} />}
                    subtitle={`${formatNumber(data?.today_deposit_count)}건`}
                    color="bg-[#2A2A1F]"
                />
                <MetricCard
                    title="외부 랭킹 입금액"
                    value={formatKRW(data?.external_ranking_deposit)}
                    icon={<Trophy className="h-4 w-4" style={{ color: "#FFD700" }} />}
                    color="bg-[#2A2A1F]"
                />
                <MetricCard
                    title="외부 랭킹 플레이 수"
                    value={formatNumber(data?.external_ranking_play_count)}
                    icon={<Activity className="h-4 w-4" style={{ color: baseAccent }} />}
                />

                {/* Liabilities */}
                <MetricCard
                    title="전체 금고 보유액"
                    value={formatKRW(data?.total_vault_balance)}
                    icon={<Package className="h-4 w-4" style={{ color: "#A0D8EF" }} />}
                    subtitle="(잠금 + 해금)"
                    color="bg-[#1F2A3A]"
                />
                <MetricCard
                    title="인벤토리 자산"
                    value={formatNumber(data?.total_inventory_liability)}
                    icon={<Package className="h-4 w-4" style={{ color: "#A0D8EF" }} />}
                    subtitle="아이템 수량 합계"
                    color="bg-[#1F2A3A]"
                />
            </div>

            {/* Streak Status (Compact Table) */}
            <div className="rounded-lg border border-[#262626] bg-[#0F0F0F] p-4">
                <p className="mb-2 text-xs font-semibold text-gray-400">스트릭 현황</p>
                <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-300">Normal (0~2일)</span>
                        <span className="rounded bg-gray-700 px-2 py-0.5 text-sm font-bold text-white">
                            {formatNumber(streakCounts.NORMAL)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-orange-400" />
                        <span className="text-sm text-orange-300">Hot (3~6일)</span>
                        <span className="rounded bg-orange-700/50 px-2 py-0.5 text-sm font-bold text-orange-200">
                            {formatNumber(streakCounts.HOT)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-purple-400" />
                        <span className="text-sm text-purple-300">Legend (7일+)</span>
                        <span className="rounded bg-purple-700/50 px-2 py-0.5 text-sm font-bold text-purple-200">
                            {formatNumber(streakCounts.LEGEND)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyOpsSummary;

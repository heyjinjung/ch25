// src/admin/components/DailyOpsSummary.tsx
import React, { useEffect, useState } from "react";
import {
    Users,
    TrendingDown,

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
    MetricDetailItem,
    fetchMetricDetails
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

// Mapping of title to backend key + description
const MetricConfig: Record<string, { key: string; description: string }> = {
    "이탈 위험": {
        key: "churn_risk",
        description: "어제(D-1) 활동 기록이 있으나, 오늘(D-Day) 현재까지 접속하지 않은 사용자 상세 목록입니다."
    },
    "금일 접속자": {
        key: "today_active",
        description: "오늘 접속한 유니크 사용자(최근 50명) 목록입니다."
    },
    "금일 입금 총액": {
        key: "today_deposit",
        description: "오늘 발생한 입금/충전 거래 내역(최근 50건)입니다."
    },
    "웰컴 리텐션 (D-2)": {
        key: "welcome_retention",
        description: "2일 전 가입한 신규 유저들의 현재 안착 상태입니다."
    },
    "금일 게임 플레이": {
        key: "today_game_plays",
        description: "오늘 발생한 게임 플레이 실시간 내역입니다."
    },
    "외부 랭킹 입금액": {
        key: "external_ranking_deposit",
        description: "외부 랭킹 시스템 집계 기준 상위 입금 유저입니다."
    },
    "외부 랭킹 플레이 수": {
        key: "external_ranking_play_count",
        description: "외부 랭킹 시스템 집계 기준 상위 플레이 유저입니다."
    },
    "전체 금고 보유액": {
        key: "total_vault_balance",
        description: "금고(Vault) 보유액 상위 유저 목록입니다."
    },
    "인벤토리 자산": {
        key: "total_inventory_liability",
        description: "아이템 최다 보유 유저(수량 기준) 목록입니다."
    },
    "티켓 사용량": {
        key: "today_ticket_usage",
        description: "오늘 소모된 총 티켓(룰렛,주사위,복권) 수량 상세 내역입니다."
    },
};

const MetricDetailModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    value: string | number;
}> = ({ isOpen, onClose, title, value }) => {
    const [details, setDetails] = useState<MetricDetailItem[]>([]);
    const [loading, setLoading] = useState(false);
    const config = MetricConfig[title] || MetricConfig[title.split(" (")[0]];

    // Fallback description if config missing
    const description = config?.description || "상세 데이터가 지원되지 않는 지표입니다.";

    useEffect(() => {
        if (isOpen && config?.key) {
            setLoading(true);
            fetchMetricDetails(config.key)
                .then(setDetails)
                .catch(() => setDetails([]))
                .finally(() => setLoading(false));
        } else {
            setDetails([]);
        }
    }, [isOpen, config]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl rounded-xl border border-[#333] bg-[#111111] shadow-2xl flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-6 border-b border-[#262626]">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-white">{title}</h3>
                            <span className="text-lg text-[#91F402] font-mono">({value})</span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{description}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-2">✕</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {!config ? (
                        <div className="text-center py-10 text-gray-500">
                            이 지표는 상세 데이터 조회를 지원하지 않습니다.
                        </div>
                    ) : loading ? (
                        <div className="text-center py-10 text-[#91F402] animate-pulse">
                            데이터를 불러오는 중입니다...
                        </div>
                    ) : details.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            데이터가 없습니다.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#333] text-xs uppercase text-gray-400">
                                    <th className="py-3 px-2">Label</th>
                                    <th className="py-3 px-2">Info</th>
                                    <th className="py-3 px-2 text-right">Value</th>
                                    <th className="py-3 px-2 text-right">Tag</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#222]">
                                {details.map((item) => (
                                    <tr key={item.id} className="hover:bg-[#1A1A1A] transition-colors">
                                        <td className="py-3 px-2 font-medium text-white">{item.label}</td>
                                        <td className="py-3 px-2 text-sm text-gray-400">{item.sub_label}</td>
                                        <td className="py-3 px-2 text-right font-medium text-[#91F402]">{item.value}</td>
                                        <td className="py-3 px-2 text-right">
                                            {item.tags.map(tag => (
                                                <span key={tag} className="inline-block text-[10px] bg-[#262626] border border-[#333] text-gray-300 px-1.5 py-0.5 rounded ml-1">
                                                    {tag}
                                                </span>
                                            ))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="p-4 border-t border-[#262626] flex justify-end bg-[#0F0F0F] rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-[#262626] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#333] transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    subtitle?: string;
    color?: string;
    onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, subtitle, color = "bg-[#1F3D24]", onClick }) => (
    <div
        onClick={onClick}
        className={`group/card relative rounded-lg border border-[#262626] bg-[#111111] p-4 shadow-md transition-all 
      ${onClick ? "cursor-pointer hover:border-[#91F402]/50 hover:bg-[#161616] active:scale-[0.98]" : "hover:border-[#91F402]/30"}`}
    >
        <div className="flex items-start justify-between">
            <div className="space-y-1">
                <p className="text-xs text-gray-400 group-hover/card:text-gray-300">{title}</p>
                <h3 className="text-xl font-bold text-white">{value}</h3>
                {subtitle && <p className="text-[11px] text-gray-500">{subtitle}</p>}
            </div>
            <div className={`rounded-full p-2.5 ${color} transition-transform group-hover/card:scale-110`} aria-hidden>
                {icon}
            </div>
        </div>
    </div>
);

const DailyOpsSummary: React.FC = () => {
    const [data, setData] = useState<ComprehensiveOverviewResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [selectedMetric, setSelectedMetric] = useState<{ title: string, value: string | number } | null>(null);

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

    const handleCardClick = (title: string, value: string | number) => {
        setSelectedMetric({ title, value });
    };

    const closeModal = () => {
        setSelectedMetric(null);
    };

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
                    onClick={() => handleCardClick("금일 접속자", formatNumber(data?.today_active_users))}
                />
                <MetricCard
                    title="금일 게임 플레이"
                    value={formatNumber(data?.today_game_plays)}
                    icon={<Gamepad2 className="h-4 w-4" style={{ color: baseAccent }} />}
                    onClick={() => handleCardClick("금일 게임 플레이", formatNumber(data?.today_game_plays))}
                />
                <MetricCard
                    title="티켓 사용량"
                    value={formatNumber(data?.today_ticket_usage)}
                    icon={<Trophy className="h-4 w-4" style={{ color: baseAccent }} />}
                    onClick={() => handleCardClick("티켓 사용량", formatNumber(data?.today_ticket_usage))}
                />
                <MetricCard
                    title="이탈 위험"
                    subtitle="어제 활동, 오늘 미접속"
                    value={formatNumber(data?.churn_risk_count)}
                    icon={<TrendingDown className="h-4 w-4" style={{ color: "#F97935" }} />}
                    color="bg-[#3A2A1F]"
                    onClick={() => handleCardClick("이탈 위험", formatNumber(data?.churn_risk_count))}
                />
                <MetricCard
                    title="웰컴 리텐션 (D-2)"
                    value={`${data?.welcome_retention_rate?.toFixed(1) ?? "--"}%`}
                    icon={<ArrowUpRight className="h-4 w-4" style={{ color: baseAccent }} />}
                    onClick={() => handleCardClick("웰컴 리텐션 (D-2)", `${data?.welcome_retention_rate?.toFixed(1) ?? "--"}%`)}
                />

                {/* Financials */}

                <MetricCard
                    title="외부 랭킹 입금액"
                    value={formatKRW(data?.external_ranking_deposit)}
                    icon={<Trophy className="h-4 w-4" style={{ color: "#FFD700" }} />}
                    color="bg-[#2A2A1F]"
                    onClick={() => handleCardClick("외부 랭킹 입금액", formatKRW(data?.external_ranking_deposit))}
                />
                <MetricCard
                    title="외부 랭킹 플레이 수"
                    value={formatNumber(data?.external_ranking_play_count)}
                    icon={<Activity className="h-4 w-4" style={{ color: baseAccent }} />}
                    onClick={() => handleCardClick("외부 랭킹 플레이 수", formatNumber(data?.external_ranking_play_count))}
                />

                {/* Liabilities */}
                <MetricCard
                    title="전체 금고 보유액"
                    value={formatKRW(data?.total_vault_balance)}
                    icon={<Package className="h-4 w-4" style={{ color: "#A0D8EF" }} />}
                    subtitle="(잠금 + 해금)"
                    color="bg-[#1F2A3A]"
                    onClick={() => handleCardClick("전체 금고 보유액", formatKRW(data?.total_vault_balance))}
                />
                <MetricCard
                    title="인벤토리 자산"
                    value={formatNumber(data?.total_inventory_liability)}
                    icon={<Package className="h-4 w-4" style={{ color: "#A0D8EF" }} />}
                    subtitle="보유 아이템 총 수량"
                    color="bg-[#1F2A3A]"
                    onClick={() => handleCardClick("인벤토리 자산", formatNumber(data?.total_inventory_liability))}
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

            {/* Detail Modal */}
            <MetricDetailModal
                isOpen={!!selectedMetric}
                onClose={closeModal}
                title={selectedMetric?.title ?? ""}
                value={selectedMetric?.value ?? ""}
            />
        </div>
    );
};

export default DailyOpsSummary;

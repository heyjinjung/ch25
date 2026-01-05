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

const MetricDetailedInfo: Record<string, { description: string; details?: (data: ComprehensiveOverviewResponse) => string[] }> = {
    "금일 접속자": {
        description: "오늘 00:00 KST 이후 로그인 이력이 있거나 게임을 플레이한 유니크 사용자(External ID 기준) 수입니다.",
    },
    "금일 게임 플레이": {
        description: "오늘 발생한 주사위, 룰렛, 복권 게임의 총 플레이 횟수 합계입니다.",
    },
    "이탈 위험": {
        description: "어제(D-1) 활동 기록이 있으나, 오늘(D-Day) 현재까지 접속하지 않은 사용자 수입니다.",
        details: (_) => [
            "오늘 미접속 잔존 유저",
            "푸시 알림(Nudge) 주요 타겟 대상"
        ]
    },
    "웰컴 리텐션 (D-2)": {
        description: "2일 전(D-2) 가입한 신규 유저 중, 어제(D-1) 접속한 유저의 비율입니다. 초기 유저 안착률을 판단하는 핵심 지표입니다.",
    },
    "금일 입금 총액": {
        description: "오늘 00:00 KST 이후 발생한 코인 충전(CHARGE) 및 입금(DEPOSIT) 누적 총액입니다.",
        details: (data) => [
            `총 건수: ${formatNumber(data.today_deposit_count)}건`,
            `평균 입금액: ${data.today_deposit_count > 0 ? formatKRW(Math.floor(data.today_deposit_sum / data.today_deposit_count)) : "0"}`
        ]
    },
    "외부 랭킹 입금액": {
        description: "외부 랭킹 시스템(Leaderboard)에 집계된 시즌 누적 입금액 데이터입니다.",
    },
    "외부 랭킹 플레이 수": {
        description: "외부 랭킹 시스템(Leaderboard)에 집계된 시즌 누적 게임 플레이 횟수입니다.",
    },
    "전체 금고 보유액": {
        description: "전체 유저의 금고(Vault)에 보관된 포인트 총액입니다. 잠금(Locked) 잔액과 해금(Available) 잔액의 합계입니다.",
    },
    "인벤토리 자산": {
        description: "유저 인벤토리에 보관된 주요 아이템(티켓 등)의 수량 합계입니다.",
    },
};

const MetricDetailModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    value: string | number;
    data: ComprehensiveOverviewResponse | null;
}> = ({ isOpen, onClose, title, value, data }) => {
    if (!isOpen || !data) return null;

    // Clean title to match keys (remove parens if match failing, though direct match preferred)
    // Our keys match the titles passed in MetricCard props.
    const info = MetricDetailedInfo[title] || MetricDetailedInfo[title.split(" (")[0]] || { description: "상세 설명이 없습니다." };
    const details = info.details ? info.details(data) : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-lg border border-[#262626] bg-[#111111] p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-lg font-bold px-2">✕</button>
                </div>

                <div className="mb-6 text-center">
                    <span className="block text-sm text-gray-400 mb-1">Current Value</span>
                    <span className="text-4xl font-bold text-[#91F402]">{value}</span>
                </div>

                <div className="mb-6 rounded bg-[#1A1A1A] p-4">
                    <h4 className="mb-2 text-sm font-semibold text-white">지표 설명</h4>
                    <p className="text-sm text-gray-300 leading-relaxed">{info.description}</p>
                </div>

                {details.length > 0 && (
                    <div className="rounded bg-[#1A1A1A] p-4">
                        <h4 className="mb-2 text-sm font-semibold text-white">세부 데이터</h4>
                        <ul className="list-disc pl-4 text-sm text-gray-300 space-y-1">
                            {details.map((item, idx) => (
                                <li key={idx}>{item}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="rounded bg-[#262626] px-4 py-2 text-sm text-white hover:bg-[#333] transition-colors"
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
                    title="금일 입금 총액"
                    value={formatKRW(data?.today_deposit_sum)}
                    icon={<Wallet className="h-4 w-4" style={{ color: "#FFD700" }} />}
                    subtitle={`${formatNumber(data?.today_deposit_count)}건`}
                    color="bg-[#2A2A1F]"
                    onClick={() => handleCardClick("금일 입금 총액", formatKRW(data?.today_deposit_sum))}
                />
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
                    subtitle="아이템 수량 합계"
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
                data={data}
            />
        </div>
    );
};

export default DailyOpsSummary;

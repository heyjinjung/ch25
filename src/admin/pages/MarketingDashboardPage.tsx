import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Users,
    ClipboardList,
    Crown,
    TrendingUp,
    Zap,
    Activity,
    Target,
    Send,
    Droplets,
    BarChart2,
    UserMinus,
    X,
    Loader2,
    ExternalLink,
    Dices,
    Disc,
    Lock,
    TrendingDown,
    Gamepad2,
    Trophy,
    ArrowUpRight,
    Package
} from "lucide-react";
import { fetchCrmStats, fetchUsersBySegment, AdminUserProfile } from "../api/adminCrmApi";
import { fetchComprehensiveOverview, fetchMetricDetails, MetricDetailItem } from "../api/adminDashboardApi";
import { useToast } from "../../components/common/ToastProvider";
import { useNavigate } from "react-router-dom";
import CrisisRadar from "../components/CrisisRadar";
import { CrisisSignal } from "../api/adminDashboardApi";

const MarketingDashboardPage: React.FC = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const formatNumber = (value?: number | null) => {
        if (value === null || value === undefined) return "-";
        return value.toLocaleString();
    };

    const formatWon = (value?: number | null) => {
        if (value === null || value === undefined) return "-";
        return `₩${value.toLocaleString()}`;
    };

    const formatPercent = (value?: number | null) => {
        if (value === null || value === undefined) return "-";
        return `${value}%`;
    };

    // Modal State
    const [selectedKpi, setSelectedKpi] = useState<{ title: string; segment: string } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [selectedOpsMetric, setSelectedOpsMetric] = useState<{ title: string; metricKey: string } | null>(null);
    const [isOpsModalOpen, setIsOpsModalOpen] = useState(false);

    const { data: stats, isLoading } = useQuery({
        queryKey: ["admin", "crm", "stats"],
        queryFn: fetchCrmStats,
        refetchInterval: 60000,
    });

    const { data: ops, isLoading: opsLoading } = useQuery({
        queryKey: ["admin", "dashboard", "comprehensive"],
        queryFn: fetchComprehensiveOverview,
        refetchInterval: 60000,
    });

    const { data: userList, isLoading: isUsersLoading } = useQuery({
        queryKey: ["admin", "crm", "segment-users", selectedKpi?.segment],
        queryFn: () => fetchUsersBySegment(selectedKpi!.segment),
        enabled: !!selectedKpi && isModalOpen,
    });

    const {
        data: opsDetails,
        isLoading: isOpsDetailsLoading,
        isError: isOpsDetailsError,
        error: opsDetailsError,
    } = useQuery({
        queryKey: ["admin", "dashboard", "details", selectedOpsMetric?.metricKey],
        queryFn: () => fetchMetricDetails(selectedOpsMetric!.metricKey),
        enabled: !!selectedOpsMetric && isOpsModalOpen,
    });

    const goToMessage = (targetType: string, targetValue: string) => {
        navigate("/admin/messages");
        addToast(`메시지 대상: ${targetType} = ${targetValue}`, "info");
    };

    const handleCardClick = (title: string, segment: string) => {
        setSelectedKpi({ title, segment });
        setIsModalOpen(true);
    };

    const handleOpsCardClick = (title: string, metricKey: string) => {
        setSelectedOpsMetric({ title, metricKey });
        setIsOpsModalOpen(true);
    };

    const extractFirstNumber = (raw: string | number | null | undefined) => {
        if (raw === null || raw === undefined) return 0;
        if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
        const s = String(raw);
        const m = s.match(/-?\d[\d,]*/);
        if (!m) return 0;
        const n = Number(m[0].replace(/,/g, ""));
        return Number.isFinite(n) ? n : 0;
    };

    const displayedOpsDetails = React.useMemo(() => {
        const items = (opsDetails as MetricDetailItem[] | undefined) ?? [];
        const metricKey = selectedOpsMetric?.metricKey;
        if (metricKey !== "total_inventory_liability") return items;
        return items
            .map((it) => ({ it, n: extractFirstNumber(it.value) }))
            .filter(({ n }) => n !== 0)
            .sort((a, b) => b.n - a.n)
            .map(({ it }) => it);
    }, [opsDetails, selectedOpsMetric?.metricKey]);

    const kpis: Array<{ title: string; value: string; icon: React.ReactNode; sub: string; segment: string }> = [
        {
            title: "전체 고객",
            value: formatNumber(stats?.total_users),
            icon: <Users size={20} />,
            sub: stats ? `${formatNumber(stats.active_users)}명 활성` : "-",
            segment: "TOTAL_USERS",
        },
        {
            title: "전환율(결제)",
            value: formatPercent(stats?.conversion_rate),
            icon: <TrendingUp size={20} />,
            sub: stats ? `${formatNumber(stats.paying_users)}명 결제` : "-",
            segment: "PAYING_USERS",
        },
        {
            title: "고액 이용자(Whale)",
            value: formatNumber(stats?.whale_count),
            icon: <Crown size={20} />,
            sub: "VIP 대상",
            segment: "WHALE",
        },
        {
            title: "빈 탱크(기회)",
            value: formatNumber(stats?.empty_tank_count),
            icon: <Droplets size={20} />,
            sub: "잔액 부족",
            segment: "EMPTY_TANK",
        },
        {
            title: "이탈률(Churn)",
            value: formatPercent(stats?.churn_rate),
            icon: <UserMinus size={20} />,
            sub: "30일 미접속",
            segment: "DORMANT",
        },
        {
            title: "신규 성장률",
            value: formatPercent(stats?.new_user_growth),
            icon: <Activity size={20} />,
            sub: "최근 7일 증가",
            segment: "TOTAL_USERS",
        },
        {
            title: "평균 활동일수",
            value: stats ? `${stats.avg_active_days}일` : "-",
            icon: <BarChart2 size={20} />,
            sub: "평균 이용 기간",
            segment: "TOTAL_USERS",
        },
        {
            title: "룰렛 플레이",
            value: formatNumber(stats?.roulette_spins),
            icon: <Disc size={20} />,
            sub: "전체 플레이 횟수",
            segment: "TOTAL_USERS",
        },
        {
            title: "주사위 플레이",
            value: formatNumber(stats?.dice_rolls),
            icon: <Dices size={20} />,
            sub: "전체 플레이 횟수",
            segment: "TOTAL_USERS",
        },
        {
            title: "평균 금고 잔액",
            value: formatWon(stats?.avg_vault_balance),
            icon: <Lock size={20} />,
            sub: "결제 유저 평균",
            segment: "PAYING_USERS",
        },
        {
            title: "오늘 입금액",
            value: formatWon(stats?.today_deposit_amount),
            icon: <Crown size={20} />,
            sub: stats ? `최근 7일 ${formatWon(stats.last7d_deposit_amount)}` : "-",
            segment: "PAYING_USERS",
        },
        {
            title: "누적 플레이",
            value: formatNumber(stats?.total_play_count),
            icon: <Activity size={20} />,
            sub: "API Play Count",
            segment: "TOTAL_USERS",
        },
    ];
    return (
        <section className="admin-page-container space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-admin-text-base tracking-tight uppercase">
                        마케팅 센터 <span className="text-admin-brand/40">Marketing</span>
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate("/admin/messages")}
                        className="btn-admin-primary flex items-center gap-2"
                    >
                        <Send size={18} /> 캠페인
                    </button>
                </div>
            </header>

            {/* Crisis Radar Section - 11 Scenarios */}
            <div className="admin-card p-6">
                <CrisisRadar
                    onScenarioClick={(scenario: CrisisSignal) => {
                        addToast(`${scenario.name} 시나리오 선택됨 (${scenario.count}명)`, "info");
                        // TODO: Open import modal
                    }}
                />
            </div>

            {/* Ops Summary Section */}
            <div className="admin-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-admin-subtitle text-admin-text-primary">금일 운영 요약</h3>
                    <button
                        onClick={() => navigate("/admin/ops")}
                        className="btn-admin-secondary"
                    >
                        운영 대시보드
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <button
                        type="button"
                        onClick={() => handleOpsCardClick("금일 접속자", "today_active")}
                        className="admin-card p-5 text-left hover:border-admin-brand hover:bg-admin-hover transition-all"
                    >
                        <p className="text-admin-body font-medium text-admin-text-secondary">금일 접속자</p>
                        <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">
                            {opsLoading ? "-" : formatNumber(ops?.today_active_users)}
                        </h3>
                        <div className="mt-3 text-xs text-gray-500 font-mono flex justify-between items-center">
                            <span>Today Active Users</span>
                            <Users size={14} />
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpsCardClick("금일 게임 플레이", "today_game_plays")}
                        className="admin-card p-5 text-left hover:border-admin-brand hover:bg-admin-hover transition-all"
                    >
                        <p className="text-admin-body font-medium text-admin-text-secondary">금일 게임 플레이</p>
                        <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">
                            {opsLoading ? "-" : formatNumber(ops?.today_game_plays)}
                        </h3>
                        <div className="mt-3 text-xs text-gray-500 font-mono flex justify-between items-center">
                            <span>Today Plays</span>
                            <Gamepad2 size={14} />
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpsCardClick("티켓 사용량", "today_ticket_usage")}
                        className="admin-card p-5 text-left hover:border-admin-brand hover:bg-admin-hover transition-all"
                    >
                        <p className="text-admin-body font-medium text-admin-text-secondary">티켓 사용량</p>
                        <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">
                            {opsLoading ? "-" : formatNumber(ops?.today_ticket_usage)}
                        </h3>
                        <div className="mt-3 text-xs text-gray-500 font-mono flex justify-between items-center">
                            <span>Tickets Used</span>
                            <Trophy size={14} />
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpsCardClick("이탈 위험", "churn_risk")}
                        className="admin-card p-5 text-left hover:border-admin-brand hover:bg-admin-hover transition-all"
                    >
                        <p className="text-sm font-medium text-gray-400">이탈 위험</p>
                        <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">
                            {opsLoading ? "-" : formatNumber(ops?.churn_risk_count)}
                        </h3>
                        <div className="mt-3 text-xs text-gray-500 font-mono flex justify-between items-center">
                            <span>어제 활동, 오늘 미접속</span>
                            <TrendingDown size={14} />
                        </div>
                    </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <button
                        type="button"
                        onClick={() => handleOpsCardClick("웰컴 리텐션(D-2)", "welcome_retention")}
                        className="admin-card p-5 text-left hover:border-admin-brand hover:bg-admin-hover transition-all"
                    >
                        <p className="text-sm font-medium text-gray-400">웰컴 리텐션(D-2)</p>
                        <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">
                            {opsLoading ? "-" : `${(ops?.welcome_retention_rate ?? 0).toFixed(1)}%`}
                        </h3>
                        <div className="mt-3 text-xs text-gray-500 font-mono flex justify-between items-center">
                            <span>D-2 Retention</span>
                            <ArrowUpRight size={14} />
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpsCardClick("웰컴 지급 현황", "welcome_claims")}
                        className="admin-card p-5 text-left hover:border-admin-brand hover:bg-admin-hover transition-all"
                    >
                        <p className="text-sm font-medium text-gray-400">웰컴 지급 현황</p>
                        <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">
                            {opsLoading ? "-" : "조회"}
                        </h3>
                        <div className="mt-3 text-xs text-gray-500 font-mono flex justify-between items-center">
                            <span>Who claimed / unclaimed</span>
                            <ClipboardList size={14} />
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpsCardClick("외부 랭킹 입금액", "external_ranking_deposit")}
                        className="admin-card p-5 text-left hover:border-admin-brand hover:bg-admin-hover transition-all"
                    >
                        <p className="text-sm font-medium text-gray-400">외부 랭킹 입금액</p>
                        <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">
                            {opsLoading ? "-" : formatWon(ops?.external_ranking_deposit)}
                        </h3>
                        <div className="mt-3 text-xs text-gray-500 font-mono flex justify-between items-center">
                            <span>External Ranking</span>
                            <Crown size={14} />
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpsCardClick("전체 금고 보유액", "total_vault_balance")}
                        className="admin-card p-5 text-left hover:border-admin-brand hover:bg-admin-hover transition-all"
                    >
                        <p className="text-sm font-medium text-gray-400">전체 금고 보유액</p>
                        <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">
                            {opsLoading ? "-" : formatWon(ops?.total_vault_balance)}
                        </h3>
                        <div className="mt-3 text-xs text-gray-500 font-mono flex justify-between items-center">
                            <span>(현금 + 게임)</span>
                            <Lock size={14} />
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpsCardClick("인벤토리 자산", "total_inventory_liability")}
                        className="admin-card p-5 text-left hover:border-admin-brand hover:bg-admin-hover transition-all"
                    >
                        <p className="text-sm font-medium text-gray-400">인벤토리 자산</p>
                        <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">
                            {opsLoading ? "-" : formatNumber(ops?.total_inventory_liability)}
                        </h3>
                        <div className="mt-3 text-xs text-gray-500 font-mono flex justify-between items-center">
                            <span>보유 아이템 자산총량</span>
                            <Package size={14} />
                        </div>
                    </button>
                </div>
            </div>

            {/* Ops Drill-down Modal */}
            {isOpsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-4xl max-h-[80vh] flex flex-col rounded-2xl border border-admin-border bg-admin-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <header className="flex items-center justify-between border-b border-admin-border px-6 py-4">
                            <div>
                                <h3 className="text-admin-subtitle text-admin-text-primary">{selectedOpsMetric?.title} 세부내역</h3>
                                <p className="text-admin-body text-admin-text-secondary">
                                    {(displayedOpsDetails?.length ?? 0)}건
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpsModalOpen(false)}
                                className="rounded-full p-2 text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary transition-colors"
                                aria-label="닫기"
                                title="닫기"
                            >
                                <X size={24} />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6">
                            {isOpsDetailsLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                    <Loader2 size={40} className="animate-spin mb-4" />
                                    <p>세부내역을 불러오는 중...</p>
                                </div>
                            ) : isOpsDetailsError ? (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                                    <div className="font-semibold">조회 실패</div>
                                    <div className="mt-1 text-sm opacity-90">
                                        {String((opsDetailsError as any)?.message ?? "알 수 없는 오류")}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {displayedOpsDetails?.map((item) => (
                                        <div
                                            key={`${item.id}:${item.label}`}
                                            className="p-4 rounded-xl border border-admin-border bg-admin-sidebar/30 hover:bg-admin-hover transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <div className="text-admin-text-primary font-semibold truncate">{item.label}</div>
                                                    <div className="mt-1 text-sm text-admin-text-secondary truncate">{item.sub_label}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-admin-text-primary font-mono">{item.value}</div>
                                                    <div className="mt-1 flex flex-wrap justify-end gap-1">
                                                        {(item.tags ?? []).map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="px-2 py-0.5 rounded-full bg-admin-hover text-[10px] text-admin-text-secondary font-medium"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(displayedOpsDetails?.length ?? 0) === 0 && (
                                        <div className="text-center py-10 text-gray-600">세부내역이 없습니다.</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <footer className="border-t border-admin-border px-6 py-4 bg-admin-card flex justify-end">
                            <button type="button" onClick={() => setIsOpsModalOpen(false)} className="btn-admin-secondary">
                                닫기
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* ──────────────────────────────────────────────────────────────────
                SECTION DIVIDER: KPI Metrics
               ────────────────────────────────────────────────────────────────── */}
            <div className="h-px bg-white/5 my-8" />
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">세그먼트 지표</h3>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {kpis.map((kpi, idx) => (
                    <div
                        key={idx}
                        onClick={() => handleCardClick(kpi.title, kpi.segment)}
                        className="admin-card p-6 shadow-lg relative overflow-hidden group hover:border-admin-brand hover:bg-admin-hover transition-all cursor-pointer"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-400">{kpi.title}</p>
                                <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">{isLoading ? "-" : kpi.value}</h3>
                            </div>
                            <div className="p-2.5 bg-admin-hover text-admin-text-secondary rounded-lg group-hover:bg-admin-brand group-hover:text-black transition-colors">{kpi.icon}</div>
                        </div>
                        <div className="mt-3 text-xs text-gray-500 font-mono flex justify-between items-center">
                            <span>{kpi.sub}</span>
                            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                ))}
            </div>
            {/* ──────────────────────────────────────────────────────────────────
                SECTION DIVIDER: Actions Panel (Dynamic from API)
               ────────────────────────────────────────────────────────────────── */}
            <div className="h-px bg-white/5 my-8" />

            {/* Actions Panel - Rendered only if target segments exist */}
            {((stats?.whale_count ?? 0) > 0 || (stats?.empty_tank_count ?? 0) > 0 || (stats?.segments?.["DORMANT"] ?? 0) > 0) && (
                <div className="grid grid-cols-1 gap-8">
                    <div className="admin-card p-6">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Target size={20} className="text-admin-brand" /> 추천 액션 (Live)
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* WHALE Action */}
                            {(stats?.whale_count ?? 0) > 0 && (
                                <div className="admin-card p-5 hover:border-purple-500/50 transition-colors cursor-pointer group" onClick={() => goToMessage("SEGMENT", "WHALE")}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <Crown size={18} className="text-purple-400 group-hover:scale-110 transition-transform" />
                                        <span className="font-bold text-white">VIP 대상 캠페인</span>
                                    </div>
                                    <p className="text-sm text-gray-400">
                                        상위 1% 고액 유저 <span className="text-purple-400 font-bold">{formatNumber(stats?.whale_count)}명</span>에게 특별 혜택을 제안하세요.
                                    </p>
                                </div>
                            )}

                            {/* EMPTY_TANK Action */}
                            {(stats?.empty_tank_count ?? 0) > 0 && (
                                <div className="admin-card p-5 hover:border-red-500/50 transition-colors cursor-pointer group" onClick={() => goToMessage("SEGMENT", "EMPTY_TANK")}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <Zap size={18} className="text-red-400 group-hover:scale-110 transition-transform" />
                                        <span className="font-bold text-white">충전 유도</span>
                                    </div>
                                    <p className="text-sm text-gray-400">
                                        잔액 부족 유저 <span className="text-red-400 font-bold">{formatNumber(stats?.empty_tank_count)}명</span>에게 충전 보너스를 안내하세요.
                                    </p>
                                </div>
                            )}

                            {/* DORMANT Action */}
                            {(stats?.segments?.["DORMANT"] ?? 0) > 0 && (
                                <div className="admin-card p-5 hover:border-orange-500/50 transition-colors cursor-pointer group" onClick={() => goToMessage("SEGMENT", "DORMANT")}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <UserMinus size={18} className="text-orange-400 group-hover:scale-110 transition-transform" />
                                        <span className="font-bold text-white">휴면 복귀</span>
                                    </div>
                                    <p className="text-sm text-gray-400">
                                        이탈 위험군 <span className="text-orange-400 font-bold">{formatNumber(stats?.segments?.["DORMANT"])}명</span>에게 복귀 선물을 발송하세요.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Drill-down Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-4xl max-h-[80vh] flex flex-col rounded-2xl border border-admin-border bg-admin-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <header className="flex items-center justify-between border-b border-admin-border px-6 py-4">
                            <div>
                                <h3 className="text-admin-subtitle text-admin-text-primary">{selectedKpi?.title} 리스트</h3>
                                <p className="text-admin-body text-admin-text-secondary">{userList?.length || 0}명의 유저가 조회되었습니다.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="rounded-full p-2 text-admin-text-secondary hover:bg-admin-hover hover:text-admin-text-primary transition-colors" aria-label="닫기" title="닫기">
                                <X size={24} />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6">
                            {isUsersLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                    <Loader2 size={40} className="animate-spin mb-4" />
                                    <p>유저 정보를 불러오는 중...</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {userList?.map((user: AdminUserProfile) => {
                                        const displayName = user.telegram_username || user.nickname || user.external_id || "Unknown User";
                                        const userId = user.user_id;

                                        return (
                                            <div
                                                key={user.user_id}
                                                onClick={() => navigate(`/admin/users/${userId}`)}
                                                className="p-4 rounded-xl border border-admin-border bg-admin-sidebar/30 hover:bg-admin-hover transition-colors cursor-pointer group"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-admin-hover flex items-center justify-center text-admin-brand font-bold shrink-0">
                                                            {displayName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-admin-text-primary font-bold truncate group-hover:text-admin-brand transition-colors">
                                                                    {displayName}
                                                                </span>
                                                                <span className="text-xs text-admin-text-muted font-normal bg-admin-card px-1.5 py-0.5 rounded border border-white/5">
                                                                    ID: {userId}
                                                                </span>
                                                            </div>
                                                            <div className="text-sm text-admin-text-secondary flex items-center gap-3 mt-1">
                                                                {user.telegram_username && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Send size={12} className="opacity-70" /> {user.telegram_username}
                                                                    </span>
                                                                )}
                                                                {user.phone_number && (
                                                                    <span className="opacity-70 text-xs">
                                                                        {user.phone_number}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right shrink-0">
                                                        <div className="flex flex-wrap justify-end gap-1 mb-1">
                                                            {user.tags?.map((tag) => (
                                                                <span
                                                                    key={tag}
                                                                    className="px-2 py-0.5 rounded-full bg-admin-hover text-[10px] text-admin-text-secondary border border-white/5"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        {user.memo && (
                                                            <div className="text-xs text-admin-text-muted max-w-[200px] truncate">
                                                                {user.memo}
                                                            </div>
                                                        )}
                                                        {!user.tags?.length && !user.memo && (
                                                            <span className="text-xs text-admin-text-muted opacity-50">
                                                                상세보기
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {userList?.length === 0 && (
                                        <div className="text-center py-20 text-gray-500">
                                            <p>조건에 해당하는 유저가 없습니다.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <footer className="border-t border-admin-border px-6 py-4 bg-admin-card flex justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="btn-admin-secondary"
                            >
                                닫기
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </section>
    );
};

export default MarketingDashboardPage;

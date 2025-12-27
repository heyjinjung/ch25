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
    Droplets,
    DollarSign,
    UserMinus,
    BarChart2,
    PieChart as PieChartIcon
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";
import { fetchCrmStats } from "../api/adminCrmApi";
import { useToast } from "../../components/common/ToastProvider";
import { useNavigate } from "react-router-dom";

const MarketingDashboardPage: React.FC = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    const { data: stats, isLoading } = useQuery({
        queryKey: ["admin", "crm", "stats"],
        queryFn: fetchCrmStats,
        refetchInterval: 30000,
    });

    const goToMessage = (targetType: string, targetValue: string) => {
        navigate("/admin/messages");
        addToast(`팁: '${targetType}' 타겟, 값 '${targetValue}' 선택됨.`, "info");
    };

    // Prepare Chart Data
    const segmentData = stats?.segments ? [
        { name: "매일 (Daily)", value: stats.segments["DAILY"] || 0, color: "#91F402" },
        { name: "주간 (Weekly)", value: stats.segments["WEEKLY"] || 0, color: "#3B82F6" },
        { name: "월간 (Monthly)", value: stats.segments["MONTHLY"] || 0, color: "#A855F7" },
        { name: "휴면 (Dormant)", value: stats.segments["DORMANT"] || 0, color: "#EF4444" },
    ] : [];

    const kpiRows = [
        // Row 1: Basic Audience
        [
            { title: "전체 잠재고객", value: stats?.total_users?.toLocaleString(), icon: <Users size={20} />, color: "blue", sub: `${stats?.active_users}명 활성` },
            { title: "전환율 (결제)", value: `${stats?.conversion_rate}%`, icon: <TrendingUp size={20} />, color: "#91F402", sub: `${stats?.paying_users}명 결제` },
            { title: "고액 사용자 (Whale)", value: stats?.whale_count, icon: <Crown size={20} />, color: "purple", sub: "VIP 타겟" },
            { title: "빈 탱크 (기회)", value: stats?.empty_tank_count, icon: <Droplets size={20} />, color: "red", sub: "잔액 부족" },
        ],
        // Row 2: Advanced Metrics
        [
            { title: "LTV (평균가치)", value: `₩${stats?.ltv?.toLocaleString()}`, icon: <DollarSign size={20} />, color: "yellow", sub: "User당 평균 가치" },
            { title: "ARPU (평균보유)", value: `₩${stats?.arpu?.toLocaleString()}`, icon: <BarChart2 size={20} />, color: "cyan", sub: "User당 평균 잔액" },
            { title: "이탈률 (Churn)", value: `${stats?.churn_rate}%`, icon: <UserMinus size={20} />, color: "orange", sub: "30일 미접속" },
            { title: "신규 성장률", value: `${stats?.new_user_growth}%`, icon: <Activity size={20} />, color: "green", sub: "최근 7일 가입" },
        ]
    ];

    return (
        <section className="space-y-8 max-w-7xl mx-auto pb-10">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">마케팅 센터 (Pro)</h2>
                    <p className="mt-1 text-gray-400">고급 KPI 분석 및 세그먼트 타겟팅</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 rounded-lg bg-[#333] text-white text-sm hover:bg-[#444]">
                        기간: 전체
                    </button>
                    <button
                        onClick={() => navigate("/admin/messages")}
                        className="flex items-center gap-2 rounded-lg bg-[#91F402] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#a3ff12] transition-colors"
                    >
                        <Send size={18} /> 새 캠페인
                    </button>
                </div>
            </header>

            {/* KPI Grids */}
            <div className="space-y-6">
                {kpiRows.map((row, rowIdx) => (
                    <div key={rowIdx} className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {row.map((kpi, idx) => (
                            <div key={idx} className="rounded-xl border border-[#333333] bg-[#111111] p-6 shadow-lg relative overflow-hidden group hover:border-[#555] transition-colors">
                                <div className={`absolute right-0 top-0 h-24 w-24 bg-${kpi.color}-500/10 blur-2xl opacity-50`} />
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-gray-400">{kpi.title}</p>
                                        <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">{isLoading ? "-" : kpi.value}</h3>
                                    </div>
                                    <div className="p-2.5 bg-[#222] text-gray-300 rounded-lg">{kpi.icon}</div>
                                </div>
                                <div className="mt-3 text-xs text-gray-500 font-mono">
                                    {kpi.sub}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Section */}
                <div className="lg:col-span-2 rounded-xl border border-[#333333] bg-[#111111] p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <PieChartIcon size={20} className="text-[#91F402]" /> 활동 세그먼트 분석
                    </h3>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        {isLoading ? (
                            <span className="text-gray-500">Loading Chart...</span>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={segmentData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                    <XAxis type="number" stroke="#666" />
                                    <YAxis dataKey="name" type="category" stroke="#999" width={100} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#222", borderColor: "#444", color: "#fff" }}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {segmentData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Actions Panel */}
                <div className="rounded-xl border border-[#333333] bg-[#111111] p-6 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Target size={20} className="text-[#91F402]" /> 추천 액션
                    </h3>

                    <div className="flex-1 space-y-4">
                        <div className="p-4 rounded-lg bg-[#1A1A1A] border border-[#333333] hover:border-purple-500/50 transition-colors cursor-pointer" onClick={() => goToMessage("SEGMENT", "WHALE")}>
                            <div className="flex items-center gap-3 mb-2">
                                <Crown size={18} className="text-purple-400" />
                                <span className="font-bold text-white">VIP 감사 선물</span>
                            </div>
                            <p className="text-xs text-gray-400">LTV 상위 유저 {stats?.whale_count || 0}명에게 보너스 지급</p>
                        </div>

                        <div className="p-4 rounded-lg bg-[#1A1A1A] border border-[#333333] hover:border-red-500/50 transition-colors cursor-pointer" onClick={() => goToMessage("SEGMENT", "EMPTY_TANK")}>
                            <div className="flex items-center gap-3 mb-2">
                                <Zap size={18} className="text-red-400" />
                                <span className="font-bold text-white">충전 유도 (긴급)</span>
                            </div>
                            <p className="text-xs text-gray-400">잔액 부족 {stats?.empty_tank_count || 0}명에게 할인 제안</p>
                        </div>

                        <div className="p-4 rounded-lg bg-[#1A1A1A] border border-[#333333] hover:border-orange-500/50 transition-colors cursor-pointer" onClick={() => goToMessage("SEGMENT", "DORMANT")}>
                            <div className="flex items-center gap-3 mb-2">
                                <UserMinus size={18} className="text-orange-400" />
                                <span className="font-bold text-white">휴면 복귀 캠페인</span>
                            </div>
                            <p className="text-xs text-gray-400">이탈 위험 {stats?.segments?.["DORMANT"] || 0}명에게 복귀 선물</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default MarketingDashboardPage;

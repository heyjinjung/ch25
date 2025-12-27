import React, { useState } from "react";
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
    BarChart2,
    UserMinus,
    X,
    Loader2,
    ExternalLink
} from "lucide-react";
import { fetchCrmStats, fetchUsersBySegment, AdminUserProfile } from "../api/adminCrmApi";
import { useToast } from "../../components/common/ToastProvider";
import { useNavigate } from "react-router-dom";

const MarketingDashboardPage: React.FC = () => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    // Modal State
    const [selectedKpi, setSelectedKpi] = useState<{ title: string; segment: string } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data: stats, isLoading } = useQuery({
        queryKey: ["admin", "crm", "stats"],
        queryFn: fetchCrmStats,
        refetchInterval: 60000,
    });

    const { data: userList, isLoading: isUsersLoading } = useQuery({
        queryKey: ["admin", "crm", "segment-users", selectedKpi?.segment],
        queryFn: () => fetchUsersBySegment(selectedKpi!.segment),
        enabled: !!selectedKpi && isModalOpen,
    });

    const goToMessage = (targetType: string, targetValue: string) => {
        navigate("/admin/messages");
        addToast(`팁: '${targetType}' 타겟, 값 '${targetValue}' 선택됨.`, "info");
    };

    const handleCardClick = (title: string, segment: string) => {
        setSelectedKpi({ title, segment });
        setIsModalOpen(true);
    };

    const kpiRows = [
        // Row 1: Basic Audience
        [
            { title: "전체 잠재고객", value: stats?.total_users?.toLocaleString(), icon: <Users size={20} />, color: "blue", sub: `${stats?.active_users}명 활성`, segment: "TOTAL_USERS" },
            { title: "전환율 (결제)", value: `${stats?.conversion_rate}%`, icon: <TrendingUp size={20} />, color: "#91F402", sub: `${stats?.paying_users}명 연동됨`, segment: "PAYING_USERS" },
            { title: "고액 사용자 (Whale)", value: stats?.whale_count, icon: <Crown size={20} />, color: "purple", sub: "VIP 타겟", segment: "WHALE" },
            { title: "빈 탱크 (기회)", value: stats?.empty_tank_count, icon: <Droplets size={20} />, color: "red", sub: "잔액 부족", segment: "EMPTY_TANK" },
        ],
        // Row 2: Advanced Metrics
        [
            { title: "이탈률 (Churn)", value: `${stats?.churn_rate}%`, icon: <UserMinus size={20} />, color: "orange", sub: "30일 미접속", segment: "DORMANT" },
            { title: "신규 성장률", value: `${stats?.new_user_growth}%`, icon: <Activity size={20} />, color: "green", sub: "최근 7일 가입", segment: "TOTAL_USERS" },
            { title: "평균 활동일수", value: `${stats?.avg_active_days}일`, icon: <BarChart2 size={20} />, color: "indigo", sub: "전체 인입 기간 중", segment: "TOTAL_USERS" },
        ]
    ];

    return (
        <section className="space-y-8 max-w-7xl mx-auto pb-10">
            <header className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">마케팅 센터 (Lite)</h2>
                    <p className="mt-1 text-gray-400">핵심 KPI 분석 및 빠른 타겟팅 (카드 클릭 시 상세 유저 조회)</p>
                </div>
                <div className="flex gap-2">
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
                            <div
                                key={idx}
                                onClick={() => handleCardClick(kpi.title, kpi.segment)}
                                className="rounded-xl border border-[#333333] bg-[#111111] p-6 shadow-lg relative overflow-hidden group hover:border-[#91F402] hover:bg-[#151515] transition-all cursor-pointer"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-medium text-gray-400">{kpi.title}</p>
                                        <h3 className="mt-2 text-2xl font-bold text-white tracking-tight">{isLoading ? "-" : kpi.value}</h3>
                                    </div>
                                    <div className="p-2.5 bg-[#222] text-gray-300 rounded-lg group-hover:bg-[#91F402] group-hover:text-black transition-colors">{kpi.icon}</div>
                                </div>
                                <div className="mt-3 text-xs text-gray-500 font-mono flex justify-between items-center">
                                    <span>{kpi.sub}</span>
                                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Actions Panel */}
                <div className="rounded-xl border border-[#333333] bg-[#111111] p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Target size={20} className="text-[#91F402]" /> 즉시 마케팅 액션
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-5 rounded-lg bg-[#1A1A1A] border border-[#333333] hover:border-purple-500/50 transition-colors cursor-pointer" onClick={() => goToMessage("SEGMENT", "WHALE")}>
                            <div className="flex items-center gap-3 mb-2">
                                <Crown size={18} className="text-purple-400" />
                                <span className="font-bold text-white">VIP 감사 선물</span>
                            </div>
                            <p className="text-sm text-gray-400">LTV 상위 유저 {stats?.whale_count || 0}명에게 보너스 지급</p>
                        </div>

                        <div className="p-5 rounded-lg bg-[#1A1A1A] border border-[#333333] hover:border-red-500/50 transition-colors cursor-pointer" onClick={() => goToMessage("SEGMENT", "EMPTY_TANK")}>
                            <div className="flex items-center gap-3 mb-2">
                                <Zap size={18} className="text-red-400" />
                                <span className="font-bold text-white">충전 유도 (긴급)</span>
                            </div>
                            <p className="text-sm text-gray-400">잔액 부족 {stats?.empty_tank_count || 0}명에게 할인 제안</p>
                        </div>

                        <div className="p-5 rounded-lg bg-[#1A1A1A] border border-[#333333] hover:border-orange-500/50 transition-colors cursor-pointer" onClick={() => goToMessage("SEGMENT", "DORMANT")}>
                            <div className="flex items-center gap-3 mb-2">
                                <UserMinus size={18} className="text-orange-400" />
                                <span className="font-bold text-white">휴면 복귀 캠페인</span>
                            </div>
                            <p className="text-sm text-gray-400">이탈 위험 {stats?.segments?.["DORMANT"] || 0}명에게 복귀 선물</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Drill-down Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-4xl max-h-[80vh] flex flex-col rounded-2xl border border-[#333] bg-[#111] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <header className="flex items-center justify-between border-b border-[#222] px-6 py-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">{selectedKpi?.title} 리스트</h3>
                                <p className="text-sm text-gray-400">{userList?.length || 0} 명의 사용자가 검색되었습니다.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="rounded-full p-2 text-gray-400 hover:bg-[#222] hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6">
                            {isUsersLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                    <Loader2 size={40} className="animate-spin mb-4" />
                                    <p>사용자 정보를 불러오는 중...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {userList?.map((user: AdminUserProfile) => (
                                        <div key={user.user_id} className="p-4 rounded-xl border border-[#222] bg-[#1A1A1A] hover:border-[#444] transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-[#91F402]">{user.external_id || `#${user.user_id}`}</span>
                                                <div className="flex flex-wrap gap-1 justify-end">
                                                    {user.tags?.map(tag => (
                                                        <span key={tag} className="px-2 py-0.5 rounded-full bg-[#333] text-[10px] text-gray-300 font-medium">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-y-1 text-sm">
                                                <span className="text-gray-500">이름:</span>
                                                <span className="text-gray-300">{user.real_name || "-"}</span>
                                                <span className="text-gray-500">연락처:</span>
                                                <span className="text-gray-300">{user.phone_number || "-"}</span>
                                                <span className="text-gray-500">텔레그램:</span>
                                                <span className="text-gray-300">{user.telegram_id || "-"}</span>
                                            </div>
                                            {user.memo && (
                                                <div className="mt-2 pt-2 border-t border-[#222] text-xs text-gray-500 italic">
                                                    "{user.memo}"
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {userList?.length === 0 && (
                                        <div className="col-span-2 text-center py-10 text-gray-600">
                                            조건에 해당하는 사용자가 없습니다.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <footer className="border-t border-[#222] px-6 py-4 bg-[#0A0A0A] flex justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-2.5 rounded-lg bg-[#222] text-white font-bold hover:bg-[#333] transition-colors"
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

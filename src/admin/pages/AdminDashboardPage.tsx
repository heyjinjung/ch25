import React from "react";
import { Gamepad2, Loader2, Target, TrendingUp, Users, Wallet, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchComprehensiveOverview, fetchMetricDetails, MetricDetailItem } from "../api/adminDashboardApi";
import SeasonOpsBoard from "../components/dashboard/SeasonOpsBoard";
import LiveOpsFeed from "../components/dashboard/LiveOpsFeed";

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: overview, isLoading } = useQuery({
    queryKey: ["admin", "dashboard", "comprehensive"],
    queryFn: fetchComprehensiveOverview,
    refetchInterval: 60000,
  });

  // Drill-down Modal State
  const [selectedMetric, setSelectedMetric] = React.useState<{ title: string; key: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const {
    data: metricDetails,
    isLoading: isDetailsLoading,
    isError: isDetailsError,
    error: detailsError,
  } = useQuery({
    queryKey: ["admin", "dashboard", "details", selectedMetric?.key],
    queryFn: () => fetchMetricDetails(selectedMetric!.key),
    enabled: !!selectedMetric && isModalOpen,
  });

  const handleCardClick = (title: string, key: string) => {
    setSelectedMetric({ title, key });
    setIsModalOpen(true);
  };


  return (
    <div className="flex flex-col w-full min-h-screen bg-[#121214] text-zinc-100 overflow-x-hidden font-sans">
      {/* Header (Glass) */}


      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1650px] mx-auto p-8 lg:p-14 space-y-10">

        {/* Section 1: Metrics Summary */}
        <section className="space-y-6">
          <h1 className="text-3xl font-bold text-admin-text-base tracking-tight uppercase">
            운영 지표 요약 <span className="text-admin-brand/40">Dashboard</span>
          </h1>

          {/* KPI Grid (4 Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Active Users */}
            <div
              onClick={() => handleCardClick("금일 활성", "today_active")}
              className="flex flex-col p-6 gap-4 bg-zinc-800/60 backdrop-blur-xl border border-white/5 rounded-xl shadow-2xl relative overflow-hidden group cursor-pointer hover:bg-zinc-800/80 transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">금일 활성</span>
                  <span className="text-[30px] font-light text-zinc-200">
                    {isLoading ? "-" : overview?.today_active_users?.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded">
                  <TrendingUp size={12} /> Live
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Real-time Data</span>
              </div>
            </div>

            {/* Card 2: Revenue */}
            <div
              onClick={() => handleCardClick("금일 입금", "today_deposit")}
              className="flex flex-col p-6 gap-4 bg-zinc-800/60 backdrop-blur-xl border border-white/5 rounded-xl shadow-2xl relative overflow-hidden group cursor-pointer hover:bg-zinc-800/80 transition-all"
            >
              <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">금일 입금 (Est)</span>
                  <span className="text-[30px] font-light text-admin-brand">
                    {isLoading ? "-" : `₩${(overview?.today_deposit_sum || 0).toLocaleString()}`}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-admin-brand/10 border border-admin-brand/20 text-admin-brand group-hover:bg-admin-brand/20 transition-colors">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-auto relative z-10">
                <span className="text-[10px] text-zinc-300">
                  Transactions: <span className="text-white font-mono">{overview?.today_deposit_count ?? 0}</span>
                </span>
              </div>
            </div>

            {/* Card 3: Churn Risk */}
            <div
              onClick={() => handleCardClick("이탈 리스크", "churn_risk")}
              className="flex flex-col p-6 gap-4 bg-zinc-800/60 backdrop-blur-xl border border-white/5 rounded-xl shadow-2xl relative overflow-hidden group cursor-pointer hover:bg-zinc-800/80 transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">이탈 리스크</span>
                  <span className="text-[30px] font-light text-orange-400">
                    {isLoading ? "-" : overview?.churn_risk_count?.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 group-hover:bg-orange-500/20 transition-colors">
                  <Target className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <span className="text-[10px] text-zinc-500">Yesterday Active, Not Today</span>
              </div>
            </div>

            {/* Card 4: Game Play */}
            <div
              onClick={() => handleCardClick("게임 플레이", "today_game_plays")}
              className="flex flex-col p-6 gap-4 bg-zinc-800/60 backdrop-blur-xl border border-white/5 rounded-xl shadow-2xl relative overflow-hidden group cursor-pointer hover:bg-zinc-800/80 transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">게임 플레이</span>
                  <span className="text-[30px] font-light text-purple-400">
                    {isLoading ? "-" : overview?.today_game_plays?.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                  <Gamepad2 className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <span className="text-[10px] text-zinc-500">Total Dice + Roulette + Lottery</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Season & Feed Split */}
        {/* Section 2: Season, Feed & Actions Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[400px]">
          {/* Season Board (2/4 on LG+) */}
          <div className="lg:col-span-2 shadow-2xl h-full">
            <SeasonOpsBoard />
          </div>

          {/* Live Feed (1/4 on LG+) */}
          <div className="lg:col-span-1 shadow-2xl h-full">
            <LiveOpsFeed />
          </div>

          {/* Action Items (1/4 on LG+) */}
          <div className="lg:col-span-1 bg-zinc-800/60 backdrop-blur-xl border border-white/5 rounded-xl shadow-2xl flex flex-col p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-2xl font-light text-zinc-200">조치 항목</h2>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-4">
              <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800">
                <X className="w-8 h-8 opacity-20" />
              </div>
              <p className="font-light">현재 조치가 필요한 항목이 없습니다.</p>
            </div>
          </div>
        </section>

        <div className="h-24" />

        {/* Drill-down Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-4xl max-h-[80vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedMetric?.title} 상세 내역</h3>
                  <p className="text-sm text-zinc-500">
                    {metricDetails?.length ?? 0}건의 내역이 조회되었습니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                  aria-label="닫기"
                >
                  <X size={24} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                {isDetailsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                    <Loader2 size={40} className="animate-spin mb-4 text-admin-brand" />
                    <p>상세 데이터를 불러오는 중...</p>
                  </div>
                ) : isDetailsError ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                    <div className="font-semibold">조회 실패</div>
                    <div className="mt-1 text-sm opacity-90">
                      {String((detailsError as any)?.message ?? "서버 오류가 발생했습니다.")}
                    </div>
                  </div>
                ) : (
                  <>
                    {metricDetails?.map((item: MetricDetailItem) => (
                      <div
                        key={`${item.id}:${item.label}`}
                        className="p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
                        onClick={() => {
                          // For users, maybe navigate to user detail
                          if (selectedMetric?.key === "today_active" || selectedMetric?.key === "churn_risk") {
                            navigate(`/admin/users?search=${item.label}`);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-base font-bold text-white group-hover:text-admin-brand transition-colors truncate">
                              {item.label}
                            </div>
                            <div className="mt-1 text-sm text-zinc-500 truncate">{item.sub_label}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-lg font-mono font-bold text-white">{item.value}</div>
                            <div className="mt-1 flex flex-wrap justify-end gap-1">
                              {(item.tags ?? []).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-400 font-medium border border-white/5"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {metricDetails?.length === 0 && (
                      <div className="text-center py-20 text-zinc-600">
                        표시할 상세 내역이 없습니다.
                      </div>
                    )}
                  </>
                )}
              </div>

              <footer className="border-t border-zinc-800 px-6 py-4 bg-zinc-900/50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-bold text-white transition-colors"
                >
                  닫기
                </button>
              </footer>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboardPage;

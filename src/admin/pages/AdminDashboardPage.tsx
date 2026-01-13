import { Zap, Users, Coins, Target, TrendingUp, ArrowUpRight, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchComprehensiveOverview } from "../api/adminDashboardApi";
import SeasonOpsBoard from "../components/dashboard/SeasonOpsBoard";
import LiveOpsFeed from "../components/dashboard/LiveOpsFeed";

const AdminDashboardPage: React.FC = () => {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["admin", "dashboard", "comprehensive"],
    queryFn: fetchComprehensiveOverview,
    refetchInterval: 30000, // 30s auto-refresh
    staleTime: 15000,
  });



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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Card 1: Active Users */}
            <div className="flex flex-col p-6 gap-4 bg-zinc-800/60 backdrop-blur-xl border border-white/5 rounded-xl shadow-2xl relative overflow-hidden group">
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
            <div className="flex flex-col p-6 gap-4 bg-zinc-800/60 backdrop-blur-xl border border-white/5 rounded-xl shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">금일 입금</span>
                  <span className="text-[30px] font-light text-zinc-200">
                    {isLoading ? "-" : `₩${(overview?.today_deposit_sum || 0).toLocaleString()}`}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                  <Coins className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-auto relative z-10">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <ArrowUpRight size={12} /> {overview?.today_deposit_count || 0}건
                </div>
                <span className="text-[10px] text-zinc-500">Transaction Count</span>
              </div>
            </div>

            {/* Card 3: Churn Risk */}
            <div className="flex flex-col p-6 gap-4 bg-zinc-800/60 backdrop-blur-xl border border-white/5 rounded-xl shadow-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">이탈 리스크</span>
                  <span className="text-[30px] font-light text-zinc-200">
                    {isLoading ? "-" : overview?.churn_risk_count?.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 group-hover:bg-rose-500/20 transition-colors">
                  <Target className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">High Priority</span>
              </div>
            </div>

            {/* Card 4: Game Play */}
            <div className="flex flex-col p-6 gap-4 bg-zinc-800/60 backdrop-blur-xl border border-white/5 rounded-xl shadow-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">게임 플레이</span>
                  <span className="text-[30px] font-light text-zinc-200">
                    {isLoading ? "-" : overview?.today_game_plays?.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                  <Zap className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <span className="text-xs font-bold text-purple-400">
                  {overview?.today_ticket_usage || 0} 티켓
                </span>
                <span className="text-[10px] text-zinc-500">소모됨</span>
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
                <ShieldCheck className="w-8 h-8 opacity-20" />
              </div>
              <p className="font-light">현재 조치가 필요한 항목이 없습니다.</p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default AdminDashboardPage;

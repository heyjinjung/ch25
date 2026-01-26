import { Badge } from "../../../components/ui/badge";
import {
  Activity,
  Users,
  DollarSign,
  Search,
  Bell,
  TrendingUp,
  UserPlus,
  Target,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";

import { BentoGrid } from "../../components/ui/BentoGrid";
import { QuickActionCard } from "../../components/ui/QuickActionCard";
import { PulsatingDot } from "../../components/ui/PulsatingDot";
import { NumberTicker } from "../../components/ui/NumberTicker";

export default function MarketingCenterPage() {
  const barHeights = [
    "h-[40%]",
    "h-[65%]",
    "h-[45%]",
    "h-[90%]",
    "h-[75%]",
    "h-[55%]",
    "h-[80%]",
  ];

  return (
    <div className="p-6 space-y-8 h-full bg-[#121214] min-h-screen text-[#E4E4E7] font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            마케팅 센터 (Marketing Center)
          </h1>
          <p className="text-sm text-zinc-400">
            주요 KPI 및 마케팅 성과 정보를 실시간 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="리포트 검색.."
              className="h-9 w-64 rounded-md border border-white/10 bg-[#18181B] pl-9 pr-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#D2FD9C]"
            />
          </div>
          <button
            title="알림 확인"
            className="h-9 w-9 flex items-center justify-center rounded-md border border-white/10 bg-[#18181B] text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-[#18181B] border border-white/5 p-1 h-11">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-[#D2FD9C] data-[state=active]:text-black"
          >
            종합 요약
          </TabsTrigger>
          <TabsTrigger
            value="acquisition"
            className="data-[state=active]:bg-[#D2FD9C] data-[state=active]:text-black"
          >
            신규 가입
          </TabsTrigger>
          <TabsTrigger
            value="retention"
            className="data-[state=active]:bg-[#D2FD9C] data-[state=active]:text-black"
          >
            리텐션 분석
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 outline-none">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickActionCard
              label="실시간 매출"
              description={
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-zinc-500">원</span>
                  <NumberTicker value={1250000} className="text-lg font-bold" />
                </div>
              }
              icon={DollarSign}
            />
            <QuickActionCard
              label="신규 가입자"
              description={
                <div className="flex items-center gap-2">
                  <NumberTicker value={42} className="text-lg font-bold" />
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[10px]">
                    +12%
                  </Badge>
                </div>
              }
              icon={UserPlus}
            />
            <QuickActionCard
              label="활성 유저 (DAU)"
              description={
                <div className="flex items-center gap-1">
                  <NumberTicker value={234} className="text-lg font-bold" />
                  <span className="text-xs text-zinc-500">명</span>
                </div>
              }
              icon={Users}
            />
            <QuickActionCard
              label="전환율 (CVR)"
              description={
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-[#D2FD9C]">8.5</span>
                  <span className="text-xs text-zinc-500">%</span>
                </div>
              }
              icon={Target}
            />
          </div>

          {/* Bento Grid Section */}
          <BentoGrid className="grid-cols-1 md:grid-cols-3 auto-rows-[22rem]">
            {/* Main Chart (Span 2) */}
            <div className="md:col-span-2 rounded-xl bg-[#18181B] border border-white/5 p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#D2FD9C]" />
                    매출 추이 (Revenue Trend)
                  </h3>
                  <p className="text-zinc-500 text-xs text-muted-foreground">
                    지난 7일간 일별 매출 추계입니다.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className="border-white/10 text-zinc-400"
                  >
                    Daily
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-white/10 text-zinc-400"
                  >
                    Weekly
                  </Badge>
                </div>
              </div>

              {/* Chart Placeholder with Gradient */}
              <div className="flex-1 w-full bg-gradient-to-t from-[#D2FD9C]/5 to-transparent mt-2 rounded-lg border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 flex items-end justify-around px-8 pb-4">
                  {barHeights.map((heightClass, i) => (
                    <div
                      key={i}
                      className={`w-8 ${heightClass} bg-[#D2FD9C]/20 rounded-t-sm border-t border-[#D2FD9C]/40 transition-all hover:bg-[#D2FD9C]/40`}
                    />
                  ))}
                </div>
                <span className="text-zinc-600 text-[10px] uppercase tracking-widest z-10 mb-20">
                  Data Visualization Layer
                </span>
              </div>
            </div>

            {/* Live Feed (Span 1) */}
            <div className="md:col-span-1 rounded-xl bg-[#18181B] border border-white/5 p-6 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-4">
                라이브 캠페인 현황
              </h3>
              <div className="space-y-4 flex-1">
                {[
                  {
                    user: "User_102",
                    action: "시즌패스 클레임",
                    time: "방금 전",
                  },
                  {
                    user: "User_044",
                    action: "룰렛 티켓 구매",
                    time: "2분 전",
                  },
                  { user: "User_992", action: "신규 가입", time: "5분 전" },
                  { user: "User_121", action: "복권 1등 당첨", time: "8분 전" },
                  {
                    user: "User_550",
                    action: "금고 보상 해제",
                    time: "12분 전",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-sm border-b border-white/5 pb-3"
                  >
                    <PulsatingDot color={i === 0 ? "#D2FD9C" : "#6366f1"} />
                    <div className="flex flex-col">
                      <span className="text-zinc-200 font-medium">
                        {item.user}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {item.action}
                      </span>
                    </div>
                    <span className="ml-auto text-zinc-600 text-[10px]">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-400 text-center transition-colors">
                전체 활동 보기
              </button>
            </div>
          </BentoGrid>
        </TabsContent>

        <TabsContent value="acquisition" className="outline-none">
          <Card className="bg-[#18181B] border-white/5">
            <CardHeader>
              <CardTitle>신규 가입 분석</CardTitle>
              <CardDescription>
                채널별 유입 경로 및 가입 전환율입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center text-zinc-600 text-sm italic">
              Awaiting detailed attribution data...
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="outline-none">
          <Card className="bg-[#18181B] border-white/5">
            <CardHeader>
              <CardTitle>리텐션 리포트</CardTitle>
              <CardDescription>
                D+1, D+7, D+30 리텐션 벤치마크입니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center text-zinc-600 text-sm italic">
              Scanning historical engagement logs...
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="rounded-xl border border-dashed border-white/10 p-4 bg-[#18181B]/50 flex justify-between items-center text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
        <div className="flex gap-4">
          <button className="hover:text-white transition-colors">
            보고서 다운로드 (CSV)
          </button>
          <button className="hover:text-white transition-colors">
            캠페인 생성
          </button>
        </div>
      </div>
    </div>
  );
}

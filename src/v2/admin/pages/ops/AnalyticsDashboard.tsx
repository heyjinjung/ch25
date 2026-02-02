import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  Percent,
} from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { InfoTooltip } from "../../components/ui/info-tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";

import {
  useAdminRetentionAnalysis,
  useAdminRetentionTrend,
  useAdminRevenueBreakdown,
  useAdminRevenueSummary,
  useAdminMarketingChannelPerformance,
  useAdminDailyFinance,
} from "../../../hooks/useAdminGame";

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState("retention");
  const [retentionDays, setRetentionDays] = useState(30);
  const [revenuePeriod, setRevenuePeriod] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");

  // Data Hooks
  const { data: retentionData } = useAdminRetentionAnalysis();
  const { data: retentionTrend, isLoading: isLoadingTrend } =
    useAdminRetentionTrend(retentionDays);
  const { data: revenueBreakdown, isLoading: isLoadingRevenue } =
    useAdminRevenueBreakdown({ period: revenuePeriod });
  const { data: revenueSummary } = useAdminRevenueSummary();
  const { data: marketingData, isLoading: isLoadingMarketing } =
    useAdminMarketingChannelPerformance();
  const { data: dailyFinance } = useAdminDailyFinance();

  const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`;
  const formatCurrency = (val: number) => `₩${val.toLocaleString()}`;
  const formatCurrencyMaybe = (val?: number) =>
    typeof val === "number" ? formatCurrency(val) : "-";
  const formatCountMaybe = (val?: number) =>
    typeof val === "number" ? val.toLocaleString() : "-";

  const todayRevenue =
    dailyFinance?.revenue?.total_deposits ?? revenueSummary?.today_revenue;
  const todayDepositCount = dailyFinance?.revenue?.deposit_count;
  const todayExpenses =
    dailyFinance?.spending?.total_withdrawals ?? revenueSummary?.today_expenses;
  const pendingWithdrawals = dailyFinance?.spending?.pending_withdrawals;
  const netIncome =
    typeof dailyFinance?.net_income === "number"
      ? dailyFinance.net_income
      : typeof todayRevenue === "number" && typeof todayExpenses === "number"
        ? todayRevenue - todayExpenses
        : undefined;

  return (
    <div className="space-y-6 min-h-screen p-6 text-white pb-20">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-indigo-400" />
            분석 대시보드
          </h1>
          <p className="text-zinc-400">
            보유율, 수익/지출, 마케팅 효율성을 분석합니다.
          </p>
          <Badge variant="outline" className="mt-3">
            KST 기준
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              오늘 수익
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {formatCurrencyMaybe(todayRevenue)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              입금 {formatCountMaybe(todayDepositCount)}건
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              오늘 지출
            </CardTitle>
            <Wallet className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-400">
              {formatCurrencyMaybe(todayExpenses)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              대기 {formatCurrencyMaybe(pendingWithdrawals)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              순수익
            </CardTitle>
            {(netIncome ?? 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${(netIncome ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}
            >
              {formatCurrencyMaybe(netIncome)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">입금 - 출금</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              주간 성장률
            </CardTitle>
            <Percent className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${(revenueSummary?.revenue_growth_rate ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}
            >
              {revenueSummary?.revenue_growth_rate !== undefined
                ? `${revenueSummary.revenue_growth_rate >= 0 ? "+" : ""}${formatPercent(revenueSummary.revenue_growth_rate)}`
                : "-"}
            </div>
            <p className="text-xs text-zinc-500 mt-1">전주 대비</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-900 border border-white/10 p-1">
          <TabsTrigger
            value="retention"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            보유율 분석
          </TabsTrigger>
          <TabsTrigger
            value="revenue"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            수익/지출 분석
          </TabsTrigger>
          <TabsTrigger
            value="marketing"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            마케팅 효율성
          </TabsTrigger>
        </TabsList>

        {/* Retention Tab */}
        <TabsContent value="retention" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">보유율 추이</h3>
            <Select
              value={String(retentionDays)}
              onValueChange={(v) => setRetentionDays(Number(v))}
            >
              <SelectTrigger className="w-32 bg-zinc-900 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                <SelectItem value="7">7일</SelectItem>
                <SelectItem value="14">14일</SelectItem>
                <SelectItem value="30">30일</SelectItem>
                <SelectItem value="60">60일</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary Card */}
          {retentionData?.summary && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-zinc-900 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-400">
                    총 코호트 유저
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {retentionData.summary.total_cohort_users.toLocaleString()}
                    명
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-400">
                    평균 D1 보유율
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">
                    {formatPercent(retentionData.summary.avg_d1_rate)}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-400">
                    평균 D7 보유율
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-400">
                    {formatPercent(retentionData.summary.avg_d7_rate)}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-400">
                    평균 D30 보유율
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-400">
                    {formatPercent(retentionData.summary.avg_d30_rate)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Trend Chart (Simple Table for now) */}
          <Card className="bg-zinc-900 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">일별 보유율 추이</CardTitle>
              <CardDescription className="text-zinc-400">
                {retentionTrend?.period_start} ~ {retentionTrend?.period_end}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTrend ? (
                <div className="text-center py-10 text-zinc-500">로딩중...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-zinc-400">날짜</th>
                        <th className="text-right py-2 text-zinc-400">
                          신규 유저
                        </th>
                        <th className="text-right py-2 text-blue-400">D1</th>
                        <th className="text-right py-2 text-emerald-400">D7</th>
                        <th className="text-right py-2 text-amber-400">D30</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retentionTrend?.trend?.slice(-10).map((row) => {
                        // 날짜 차이 계산 (Pending 체크용)
                        const rowDate = new Date(row.date);
                        const today = new Date();
                        const diffTime = Math.abs(today.getTime() - rowDate.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                        // diffDays는 "며칠 전"인지 나타냄 (예: 어제=1, 오늘=0)
                        
                        // D1: 가입 후 1일 지남 (diffDays > 1)
                        // D7: 가입 후 7일 지남 (diffDays > 7)
                        // D30: 가입 후 30일 지남 (diffDays > 30)
                        
                        return (
                          <tr
                            key={row.date}
                            className="border-b border-white/5 hover:bg-white/5"
                          >
                            <td className="py-2 text-white">{row.date}</td>
                            <td className="py-2 text-right text-zinc-300">
                              {row.new_users}명
                            </td>
                            <td className="py-2 text-right text-blue-400">
                              {diffDays > 1 ? formatPercent(row.d1_rate) : <span className="text-zinc-600">-</span>}
                            </td>
                            <td className="py-2 text-right text-emerald-400">
                              {diffDays > 7 ? formatPercent(row.d7_rate) : <span className="text-zinc-600">-</span>}
                            </td>
                            <td className="py-2 text-right text-amber-400">
                              {diffDays > 30 ? formatPercent(row.d30_rate) : <span className="text-zinc-600">-</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">수익/지출 분석</h3>
            <Select
              value={revenuePeriod}
              onValueChange={(v) => setRevenuePeriod(v as typeof revenuePeriod)}
            >
              <SelectTrigger className="w-32 bg-zinc-900 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                <SelectItem value="daily">일별</SelectItem>
                <SelectItem value="weekly">주별</SelectItem>
                <SelectItem value="monthly">월별</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Revenue Summary */}
          {revenueSummary && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-zinc-900 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-400">
                    이번 주 수익
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(revenueSummary.this_week_revenue)}
                  </div>
                  <p className="text-xs text-zinc-500">
                    지출: {formatCurrency(revenueSummary.this_week_expenses)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-400">
                    이번 달 수익
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(revenueSummary.this_month_revenue)}
                  </div>
                  <p className="text-xs text-zinc-500">
                    지출: {formatCurrency(revenueSummary.this_month_expenses)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-400">
                    평균 일 수익
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(revenueBreakdown?.avg_daily_revenue ?? 0)}
                  </div>
                  <p className="text-xs text-zinc-500">
                    평균 지출:{" "}
                    {formatCurrency(revenueBreakdown?.avg_daily_expenses ?? 0)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Revenue Table */}
          <Card className="bg-zinc-900 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">수익/지출 상세</CardTitle>
              <CardDescription className="text-zinc-400">
                총 수익: {formatCurrency(revenueBreakdown?.total_revenue ?? 0)}{" "}
                / 총 지출:{" "}
                {formatCurrency(revenueBreakdown?.total_expenses ?? 0)} /
                순수익: {formatCurrency(revenueBreakdown?.net_income ?? 0)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRevenue ? (
                <div className="text-center py-10 text-zinc-500">로딩중...</div>
              ) : (
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-zinc-900">
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-zinc-400">날짜</th>
                        <th className="text-right py-2 text-emerald-400">
                          입금
                        </th>
                        <th className="text-right py-2 text-rose-400">출금</th>
                        <th className="text-right py-2 text-white">순수익</th>
                        <th className="text-right py-2 text-zinc-400">
                          입금자
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueBreakdown?.data
                        ?.slice()
                        .reverse()
                        .map((row) => (
                          <tr
                            key={row.date}
                            className="border-b border-white/5 hover:bg-white/5"
                          >
                            <td className="py-2 text-white">{row.date}</td>
                            <td className="py-2 text-right text-emerald-400">
                              {formatCurrency(row.total_deposits)}
                            </td>
                            <td className="py-2 text-right text-rose-400">
                              {formatCurrency(row.total_withdrawals)}
                            </td>
                            <td
                              className={`py-2 text-right ${row.net_revenue >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                            >
                              {formatCurrency(row.net_revenue)}
                            </td>
                            <td className="py-2 text-right text-zinc-300">
                              {row.active_depositors}명
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marketing Tab */}
        <TabsContent value="marketing" className="mt-6 space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            채널별 마케팅 효율성
            <InfoTooltip
              title="채널별 마케팅 효율성"
              description={
                "마케팅 채널(예: telegram, organic)별로\n신규 유저, 비용, 입금(매출), ROI를 비교하는 표입니다.\n\n어디에 예산/시간을 더 써야 하는지 판단할 때 씁니다."
              }
            />
          </h3>

          {/* Overall Summary */}
          {marketingData && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-zinc-900 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-400 flex items-center gap-1">
                    총 신규 유저
                    <InfoTooltip
                      title="총 신규 유저"
                      description={
                        "선택한 기간에 '처음' 들어온 유저 수입니다.\n(신규 유입 규모를 보는 지표)"
                      }
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {marketingData.total_new_users.toLocaleString()}명
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-400 flex items-center gap-1">
                    총 마케팅 비용
                    <InfoTooltip
                      title="총 마케팅 비용"
                      description={
                        "유저를 데려오기 위해 쓴 비용의 합입니다.\n(광고비, 제휴비 등)\n\n현재 값은 '추정치'일 수 있습니다."
                      }
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-rose-400">
                    {formatCurrency(marketingData.total_marketing_cost)}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-400 flex items-center gap-1">
                    평균 CAC
                    <InfoTooltip
                      title="CAC (고객 획득 비용)"
                      description={
                        "신규 유저 1명을 데려오는데 평균 얼마가 들었는지입니다.\n(비용 효율을 보는 지표)"
                      }
                      formula={"계산식\n= 총 마케팅 비용 ÷ 총 신규 유저"}
                      note={"예: 비용 2,000원 / 신규 3명 → CAC 약 666.67원"}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-400">
                    {formatCurrency(marketingData.overall_cac)}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-zinc-400 flex items-center gap-1">
                    전체 ROI
                    <InfoTooltip
                      title="ROI (투자 대비 수익률)"
                      description={
                        "마케팅 비용을 쓴 만큼 '남았는지/손해인지'를 비율로 보여줍니다.\n\n0%: 본전\n양수(+): 이익\n음수(-): 손해"
                      }
                      formula={"계산식\n= (LTV - CAC) ÷ CAC"}
                      note={
                        "입금이 0원인데 비용만 있으면 ROI는 -100%가 될 수 있습니다."
                      }
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${marketingData.overall_roi >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {formatPercent(marketingData.overall_roi)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Channel Performance Table */}
          <Card className="bg-zinc-900 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">채널별 성과</CardTitle>
              <CardDescription className="text-zinc-400">
                기간: {marketingData?.period_start} ~{" "}
                {marketingData?.period_end}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMarketing ? (
                <div className="text-center py-10 text-zinc-500">로딩중...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-zinc-400">
                          <span className="inline-flex items-center gap-1">
                            채널
                            <InfoTooltip
                              title="채널"
                              description={
                                "유저가 유입된 경로(출처)입니다.\n예: telegram(텔레그램), organic(검색/입소문 등)"
                              }
                            />
                          </span>
                        </th>
                        <th className="text-right py-2 text-zinc-400">
                          <span className="inline-flex items-center justify-end gap-1 w-full">
                            신규 유저
                            <InfoTooltip
                              title="신규 유저"
                              description={
                                "해당 채널로 '처음' 들어온 유저 수입니다."
                              }
                            />
                          </span>
                        </th>
                        <th className="text-right py-2 text-zinc-400">
                          <span className="inline-flex items-center justify-end gap-1 w-full">
                            활성 유저
                            <InfoTooltip
                              title="활성 유저"
                              description={
                                "기간 동안 실제로 활동한 유저 수입니다.\n(예: 로그인/게임/입금 등)"
                              }
                            />
                          </span>
                        </th>
                        <th className="text-right py-2 text-zinc-400">
                          <span className="inline-flex items-center justify-end gap-1 w-full">
                            총 입금
                            <InfoTooltip
                              title="총 입금"
                              description={
                                "해당 채널 유저들이 기간 동안 입금한 금액의 합입니다."
                              }
                            />
                          </span>
                        </th>
                        <th className="text-right py-2 text-zinc-400">
                          <span className="inline-flex items-center justify-end gap-1 w-full">
                            전환율
                            <InfoTooltip
                              title="전환율"
                              description={
                                "신규 유저 중 '입금'까지 이어진 비율입니다.\n(마케팅이 실제 매출 행동으로 이어졌는지 보는 지표)"
                              }
                              formula={"계산식\n= 입금 유저 수 ÷ 신규 유저 수"}
                            />
                          </span>
                        </th>
                        <th className="text-right py-2 text-zinc-400">
                          <span className="inline-flex items-center justify-end gap-1 w-full">
                            CAC
                            <InfoTooltip
                              title="CAC (채널별)"
                              description={
                                "해당 채널에서 신규 유저 1명을 데려오는데 든 비용(추정치)입니다.\n작을수록 비용 효율이 좋습니다."
                              }
                            />
                          </span>
                        </th>
                        <th className="text-right py-2 text-zinc-400">
                          <span className="inline-flex items-center justify-end gap-1 w-full">
                            LTV
                            <InfoTooltip
                              title="LTV (유저 생애 가치)"
                              description={
                                "유저 1명이 '장기적으로' 남기는 가치(추정치)입니다.\n여기서는 주로 입금 데이터 기반으로 계산됩니다."
                              }
                            />
                          </span>
                        </th>
                        <th className="text-right py-2 text-zinc-400">
                          <span className="inline-flex items-center justify-end gap-1 w-full">
                            ROI
                            <InfoTooltip
                              title="ROI (채널별)"
                              description={
                                "채널별로 '번 돈(LTV)'이 '쓴 돈(CAC)'보다 큰지 비율로 보여줍니다.\n양수면 이익, 음수면 손해입니다."
                              }
                              formula={"계산식\n= (LTV - CAC) ÷ CAC"}
                            />
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketingData?.channels?.map((ch) => (
                        <tr
                          key={ch.channel}
                          className="border-b border-white/5 hover:bg-white/5"
                        >
                          <td className="py-2">
                            <Badge
                              variant="outline"
                              className="border-indigo-500/50 text-indigo-400"
                            >
                              {ch.channel}
                            </Badge>
                          </td>
                          <td className="py-2 text-right text-white">
                            {ch.new_users}명
                          </td>
                          <td className="py-2 text-right text-zinc-300">
                            {ch.active_users}명
                          </td>
                          <td className="py-2 text-right text-emerald-400">
                            {formatCurrency(ch.total_deposits)}
                          </td>
                          <td className="py-2 text-right text-blue-400">
                            {formatPercent(ch.conversion_rate)}
                          </td>
                          <td className="py-2 text-right text-amber-400">
                            {formatCurrency(ch.cac)}
                          </td>
                          <td className="py-2 text-right text-white">
                            {formatCurrency(ch.ltv)}
                          </td>
                          <td
                            className={`py-2 text-right ${ch.roi >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                          >
                            {formatPercent(ch.roi)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

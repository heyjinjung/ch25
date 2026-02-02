/**
 * ROI 대시보드 페이지
 *
 * Golden 개입 효과를 ROI 관점에서 시각화합니다.
 * - 캠페인별 ROI 비교
 * - 비용 대비 수익 차트
 * - 기간별 성과 추이
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getAdminMarketingCampaignPerformance,
  type RoiCampaignDto,
} from "../../../api/adminApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  DollarSign,
  Users,
  Target,
  Calendar,
} from "lucide-react";
import { format, subDays } from "date-fns";

export default function RoiDashboardPage() {
  const [startDate, setStartDate] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const {
    data: campaigns = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin", "roi-campaigns", startDate, endDate],
    queryFn: () =>
      getAdminMarketingCampaignPerformance({
        start_date: startDate,
        end_date: endDate,
        limit: 20,
      }),
  });

  // 요약 계산
  const totalCost = campaigns.reduce((sum, c) => sum + c.total_cost, 0);
  const totalReturn = campaigns.reduce((sum, c) => sum + c.total_return, 0);
  const totalUsers = campaigns.reduce((sum, c) => sum + c.user_count, 0);
  const overallRoi =
    totalCost > 0 ? ((totalReturn - totalCost) / totalCost) * 100 : 0;

  // 상위/하위 캠페인 분류
  const sortedByRoi = [...campaigns].sort((a, b) => b.avg_roi - a.avg_roi);
  const topCampaigns = sortedByRoi.filter((c) => c.avg_roi > 0).slice(0, 3);
  const bottomCampaigns = sortedByRoi.filter((c) => c.avg_roi <= 0).slice(-3);

  const formatCurrency = (value: number) => {
    return `₩${value.toLocaleString()}`;
  };

  const formatRoi = (roi: number) => {
    const percentage = (roi * 100).toFixed(1);
    return `${roi >= 0 ? "+" : ""}${percentage}%`;
  };

  const getRoiBadgeClass = (roi: number) => {
    if (roi >= 1)
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (roi >= 0) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (roi >= -0.5)
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  // 이벤트 타입 한글화
  const getEventTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      PITY_SYSTEM: "연패 보상",
      DAILY_NUDGE: "일일 넛지",
      LOSS_STREAK: "연패 개입",
      BALANCE_DROP: "잔액 급감 개입",
      INACTIVE: "휴면 개입",
      GOLDEN_HOUR: "골든아워",
      VIP_REWARD: "VIP 보상",
      REENGAGEMENT: "재참여 유도",
    };
    return labels[eventType] || eventType;
  };

  return (
    <div className="space-y-6 p-6 pb-20 max-w-[1600px] mx-auto text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ROI 대시보드</h1>
          <p className="text-zinc-400 text-sm">
            Golden 개입 효과 분석 및 ROI 시각화
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-zinc-400" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[140px] bg-black/20 border-white/10 text-sm"
            />
            <span className="text-zinc-400">~</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[140px] bg-black/20 border-white/10 text-sm"
            />
          </div>
          <Button
            variant="outline"
            className="border-white/10 hover:bg-white/5"
            onClick={() => refetch()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400">전체 ROI</span>
              {overallRoi >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-400" />
              )}
            </div>
            <div
              className={`text-2xl font-bold ${overallRoi >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {overallRoi >= 0 ? "+" : ""}
              {overallRoi.toFixed(1)}%
            </div>
            <p className="text-xs text-zinc-500 mt-1">투자 대비 수익률</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400">총 투자 비용</span>
              <DollarSign className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(totalCost)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">개입에 사용된 총 비용</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400">총 수익</span>
              <Target className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(totalReturn)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">개입 후 발생한 수익</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400">개입 대상 유저</span>
              <Users className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {totalUsers.toLocaleString()}
            </div>
            <p className="text-xs text-zinc-500 mt-1">개입이 적용된 유저 수</p>
          </CardContent>
        </Card>
      </div>

      {/* Top/Bottom Campaigns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top ROI Campaigns */}
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-emerald-400 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              ROI 상위 캠페인
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCampaigns.length > 0 ? (
              <div className="space-y-3">
                {topCampaigns.map((c, idx) => (
                  <div
                    key={c.event_type}
                    className="flex items-center justify-between p-3 rounded-lg bg-black/20"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-emerald-400">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-white">
                          {getEventTypeLabel(c.event_type)}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {c.user_count}명 대상
                        </p>
                      </div>
                    </div>
                    <Badge className={getRoiBadgeClass(c.avg_roi)}>
                      {formatRoi(c.avg_roi)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-center py-6">
                성과가 좋은 캠페인이 없습니다
              </p>
            )}
          </CardContent>
        </Card>

        {/* Bottom ROI Campaigns */}
        <Card className="bg-red-500/5 border-red-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-red-400 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              ROI 하위 캠페인
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bottomCampaigns.length > 0 ? (
              <div className="space-y-3">
                {bottomCampaigns.map((c) => (
                  <div
                    key={c.event_type}
                    className="flex items-center justify-between p-3 rounded-lg bg-black/20"
                  >
                    <div>
                      <p className="font-medium text-white">
                        {getEventTypeLabel(c.event_type)}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {c.user_count}명 대상
                      </p>
                    </div>
                    <Badge className={getRoiBadgeClass(c.avg_roi)}>
                      {formatRoi(c.avg_roi)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-center py-6">
                저조한 캠페인이 없습니다
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Campaign Table */}
      <Card className="bg-zinc-900 border-white/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-white">캠페인별 ROI 분석</CardTitle>
          </div>
          <CardDescription>
            기간 내 모든 개입 캠페인의 상세 성과
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : campaigns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-zinc-400">캠페인 유형</TableHead>
                  <TableHead className="text-zinc-400 text-right">
                    대상 유저
                  </TableHead>
                  <TableHead className="text-zinc-400 text-right">
                    투자 비용
                  </TableHead>
                  <TableHead className="text-zinc-400 text-right">
                    수익
                  </TableHead>
                  <TableHead className="text-zinc-400 text-right">
                    순이익
                  </TableHead>
                  <TableHead className="text-zinc-400 text-right">
                    ROI
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign: RoiCampaignDto) => {
                  const profit = campaign.total_return - campaign.total_cost;
                  return (
                    <TableRow
                      key={campaign.event_type}
                      className="border-white/5 hover:bg-white/5"
                    >
                      <TableCell className="font-medium text-white">
                        {getEventTypeLabel(campaign.event_type)}
                      </TableCell>
                      <TableCell className="text-right text-zinc-300">
                        {campaign.user_count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-amber-400">
                        {formatCurrency(campaign.total_cost)}
                      </TableCell>
                      <TableCell className="text-right text-blue-400">
                        {formatCurrency(campaign.total_return)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {formatCurrency(profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={getRoiBadgeClass(campaign.avg_roi)}
                        >
                          {formatRoi(campaign.avg_roi)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <BarChart3 className="h-12 w-12 mb-4 opacity-30" />
              <p>해당 기간에 캠페인 데이터가 없습니다</p>
              <p className="text-xs mt-1">기간을 조정해보세요</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

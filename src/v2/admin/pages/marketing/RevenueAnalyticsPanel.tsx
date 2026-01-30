import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import {
  useAdminRevenueBreakdown,
  useAdminRevenueSummary,
} from "../../../hooks/useAdminGame";

const formatCurrency = (value: number) => `₩${value.toLocaleString()}`;

export default function RevenueAnalyticsPanel() {
  const { data: summary, isLoading: isSummaryLoading } =
    useAdminRevenueSummary();
  const { data: breakdown, isLoading: isBreakdownLoading } =
    useAdminRevenueBreakdown({ period: "daily" });

  if (isSummaryLoading) {
    return <div className="text-zinc-500">로딩중...</div>;
  }

  if (!summary) {
    return <div className="text-zinc-500">데이터가 없습니다.</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-zinc-100">
            매출 요약 (KST)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-black/20 border border-white/5 p-4">
              <div className="text-xs text-zinc-500">오늘 수익</div>
              <div className="text-xl text-emerald-400 mt-1 font-bold">
                {formatCurrency(summary.today_revenue)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                지출 {formatCurrency(summary.today_expenses)}
              </div>
            </div>
            <div className="rounded-lg bg-black/20 border border-white/5 p-4">
              <div className="text-xs text-zinc-500">이번 주</div>
              <div className="text-lg text-white mt-1">
                수익 {formatCurrency(summary.this_week_revenue)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                지출 {formatCurrency(summary.this_week_expenses)}
              </div>
            </div>
            <div className="rounded-lg bg-black/20 border border-white/5 p-4">
              <div className="text-xs text-zinc-500">이번 달</div>
              <div className="text-lg text-white mt-1">
                수익 {formatCurrency(summary.this_month_revenue)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                지출 {formatCurrency(summary.this_month_expenses)}
              </div>
            </div>
            <div className="rounded-lg bg-black/20 border border-white/5 p-4">
              <div className="text-xs text-zinc-500">전주 대비</div>
              <div className="text-xl text-indigo-300 mt-1 font-bold">
                {(summary.revenue_growth_rate * 100).toFixed(1)}%
              </div>
              <Badge variant="outline" className="mt-2">
                KST 기준
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-zinc-100">
            일별 매출/지출 추이
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isBreakdownLoading || !breakdown ? (
            <div className="text-zinc-500">로딩중...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/5">
                  <TableHead className="text-zinc-400">날짜</TableHead>
                  <TableHead className="text-zinc-400">입금</TableHead>
                  <TableHead className="text-zinc-400">출금</TableHead>
                  <TableHead className="text-zinc-400">순수익</TableHead>
                  <TableHead className="text-zinc-400">입금 건수</TableHead>
                  <TableHead className="text-zinc-400">출금 건수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.data.map((row) => (
                  <TableRow key={row.date} className="border-white/5">
                    <TableCell className="text-zinc-200">{row.date}</TableCell>
                    <TableCell className="text-emerald-400">
                      {formatCurrency(row.total_deposits)}
                    </TableCell>
                    <TableCell className="text-rose-400">
                      {formatCurrency(row.total_withdrawals)}
                    </TableCell>
                    <TableCell className="text-indigo-200">
                      {formatCurrency(row.net_revenue)}
                    </TableCell>
                    <TableCell className="text-zinc-200">
                      {row.deposit_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-zinc-200">
                      {row.withdrawal_count.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

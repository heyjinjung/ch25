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
import { useAdminMarketingChannelPerformance } from "../../../hooks/useAdminGame";

const formatCurrency = (value: number) =>
  `₩${Math.round(value).toLocaleString()}`;
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function MarketingPerformancePanel() {
  const { data, isLoading } = useAdminMarketingChannelPerformance();

  if (isLoading) {
    return <div className="text-zinc-500">로딩중...</div>;
  }

  if (!data) {
    return <div className="text-zinc-500">데이터가 없습니다.</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-zinc-100">
            마케팅 성과 요약 (KST)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-black/20 border border-white/5 p-4">
              <div className="text-xs text-zinc-500">기간</div>
              <div className="text-sm text-white mt-1">
                {data.period_start} ~ {data.period_end}
              </div>
              <Badge variant="outline" className="mt-2">
                KST 기준
              </Badge>
            </div>
            <div className="rounded-lg bg-black/20 border border-white/5 p-4">
              <div className="text-xs text-zinc-500">신규 유저</div>
              <div className="text-xl text-white mt-1 font-bold">
                {data.total_new_users.toLocaleString()}명
              </div>
            </div>
            <div className="rounded-lg bg-black/20 border border-white/5 p-4">
              <div className="text-xs text-zinc-500">마케팅 비용</div>
              <div className="text-xl text-emerald-400 mt-1 font-bold">
                {formatCurrency(data.total_marketing_cost)}
              </div>
            </div>
            <div className="rounded-lg bg-black/20 border border-white/5 p-4">
              <div className="text-xs text-zinc-500">Overall ROI</div>
              <div className="text-xl text-indigo-300 mt-1 font-bold">
                {percent(data.overall_roi)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-zinc-100">채널별 성과</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/5">
                <TableHead className="text-zinc-400">채널</TableHead>
                <TableHead className="text-zinc-400">신규</TableHead>
                <TableHead className="text-zinc-400">활성</TableHead>
                <TableHead className="text-zinc-400">총 입금</TableHead>
                <TableHead className="text-zinc-400">전환율</TableHead>
                <TableHead className="text-zinc-400">CAC</TableHead>
                <TableHead className="text-zinc-400">LTV</TableHead>
                <TableHead className="text-zinc-400">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.channels.map((row) => (
                <TableRow key={row.channel} className="border-white/5">
                  <TableCell className="text-zinc-200">{row.channel}</TableCell>
                  <TableCell className="text-zinc-200">
                    {row.new_users.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-zinc-200">
                    {row.active_users.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-emerald-400">
                    {formatCurrency(row.total_deposits)}
                  </TableCell>
                  <TableCell className="text-indigo-300">
                    {percent(row.conversion_rate)}
                  </TableCell>
                  <TableCell className="text-zinc-200">
                    {formatCurrency(row.cac)}
                  </TableCell>
                  <TableCell className="text-zinc-200">
                    {formatCurrency(row.ltv)}
                  </TableCell>
                  <TableCell className="text-rose-300">
                    {percent(row.roi)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

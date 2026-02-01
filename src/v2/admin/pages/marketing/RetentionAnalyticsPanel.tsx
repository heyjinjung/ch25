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
  useAdminRetentionAnalysis,
  useAdminRetentionTrend,
} from "../../../hooks/useAdminGame";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export default function RetentionAnalyticsPanel() {
  const { data: analysis, isLoading: isAnalysisLoading } =
    useAdminRetentionAnalysis();
  const { data: trend, isLoading: isTrendLoading } = useAdminRetentionTrend(30);

  if (isAnalysisLoading) {
    return <div className="text-zinc-500">로딩중...</div>;
  }

  if (!analysis) {
    return <div className="text-zinc-500">데이터가 없습니다.</div>;
  }

  const recentRetention = [...analysis.daily_retention]
    .sort((a, b) => (a.cohort_date < b.cohort_date ? 1 : -1))
    .slice(0, 14);

  const trendRows = trend?.trend ?? [];

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-zinc-100">
            리텐션 요약 (KST)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-black/20 border border-white/5 p-4">
              <div className="text-xs text-zinc-500">기간</div>
              <div className="text-sm text-white mt-1">
                {analysis.summary.period_start} ~ {analysis.summary.period_end}
              </div>
              <Badge variant="outline" className="mt-2">
                KST 기준
              </Badge>
            </div>
            <div className="rounded-lg bg-black/20 border border-white/5 p-4">
              <div className="text-xs text-zinc-500">코호트 유저</div>
              <div className="text-xl text-white mt-1 font-bold">
                {analysis.summary.total_cohort_users.toLocaleString()}명
              </div>
            </div>
            <div className="rounded-lg bg-black/20 border border-white/5 p-4">
              <div className="text-xs text-zinc-500">평균 D1</div>
              <div className="text-xl text-emerald-400 mt-1 font-bold">
                {percent(analysis.summary.avg_d1_rate)}
              </div>
            </div>
            <div className="rounded-lg bg-black/20 border border-white/5 p-4">
              <div className="text-xs text-zinc-500">평균 D7 / D30</div>
              <div className="text-sm text-white mt-1">
                D7 {percent(analysis.summary.avg_d7_rate)}
              </div>
              <div className="text-sm text-white mt-1">
                D30 {percent(analysis.summary.avg_d30_rate)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-zinc-100">
            코호트 리텐션 (최근 14일)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/5">
                <TableHead className="text-zinc-400">코호트 날짜</TableHead>
                <TableHead className="text-zinc-400">코호트 유저</TableHead>
                <TableHead className="text-zinc-400">D1</TableHead>
                <TableHead className="text-zinc-400">D7</TableHead>
                <TableHead className="text-zinc-400">D30</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRetention.map((row) => (
                <TableRow key={row.cohort_date} className="border-white/5">
                  <TableCell className="text-zinc-200">
                    {row.cohort_date}
                  </TableCell>
                  <TableCell className="text-zinc-200">
                    {row.total_users.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-emerald-400">
                    {percent(row.d1_rate)}
                  </TableCell>
                  <TableCell className="text-indigo-300">
                    {percent(row.d7_rate)}
                  </TableCell>
                  <TableCell className="text-rose-300">
                    {percent(row.d30_rate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-zinc-100">
            리텐션 추이 (KST, {trend?.period_start} ~ {trend?.period_end})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isTrendLoading ? (
            <div className="text-zinc-500">로딩중...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/5">
                  <TableHead className="text-zinc-400">날짜</TableHead>
                  <TableHead className="text-zinc-400">신규</TableHead>
                  <TableHead className="text-zinc-400">D1</TableHead>
                  <TableHead className="text-zinc-400">D7</TableHead>
                  <TableHead className="text-zinc-400">D30</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trendRows.map((row) => (
                  <TableRow key={row.date} className="border-white/5">
                    <TableCell className="text-zinc-200">{row.date}</TableCell>
                    <TableCell className="text-zinc-200">
                      {row.new_users.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-emerald-400">
                      {percent(row.d1_rate)}
                    </TableCell>
                    <TableCell className="text-indigo-300">
                      {percent(row.d7_rate)}
                    </TableCell>
                    <TableCell className="text-rose-300">
                      {percent(row.d30_rate)}
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

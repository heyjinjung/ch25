import { useState } from "react";
import { Wallet, AlertTriangle, Users, TrendingUp } from "lucide-react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import styles from "./VaultAnalyticsPage.module.css";

import {
  useAdminVaultAggregate,
  useAdminVaultSpendLimits,
  useAdminVaultSpendLimitSummary,
} from "../../../hooks/useAdminGame";

const getUsageWidthClass = (usageRate: number) => {
  const percent = Math.max(0, Math.min(100, usageRate * 100));
  const step = Math.round(percent / 5) * 5;
  const key = `w${step}` as keyof typeof styles;
  return styles[key] ?? styles.w0;
};

export default function VaultAnalyticsPage() {
  const [minUsageRate, setMinUsageRate] = useState(0);

  const { data: vaultAggregate, isLoading: isLoadingAggregate } =
    useAdminVaultAggregate();
  const { data: spendLimits, isLoading: isLoadingSpendLimits } =
    useAdminVaultSpendLimits({
      min_usage_rate: minUsageRate,
      limit: 50,
    });
  const { data: spendLimitSummary } = useAdminVaultSpendLimitSummary();

  return (
    <div className="space-y-6 min-h-screen p-6 text-white pb-20">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3 mb-2">
          <Wallet className="w-8 h-8 text-indigo-400" />
          금고 분석
        </h1>
        <p className="text-zinc-400">KST 기준 금고 지표를 분석합니다.</p>
      </div>

      {isLoadingAggregate ? (
        <div className="text-center py-20 text-zinc-500">로딩중...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  총 유저 수
                </CardTitle>
                <Users className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {vaultAggregate?.total_users?.toLocaleString() ?? 0}명
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  총 잠금 잔액
                </CardTitle>
                <Wallet className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-400">
                  ₩{vaultAggregate?.total_locked_balance?.toLocaleString() ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  총 가용 잔액
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">
                  ₩
                  {vaultAggregate?.total_available_balance?.toLocaleString() ??
                    0}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  제재 유저
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-400">
                  {vaultAggregate?.suspended_users_count?.toLocaleString() ?? 0}
                  명
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  잔액: ₩
                  {vaultAggregate?.suspended_users_balance?.toLocaleString() ??
                    0}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-zinc-400">
                  평균 잔액
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-white">
                  ₩{vaultAggregate?.average_balance?.toLocaleString() ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-zinc-400">
                  중간값 잔액
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-white">
                  ₩{vaultAggregate?.median_balance?.toLocaleString() ?? 0}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-zinc-400">
                  최대 잔액
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-emerald-400">
                  ₩{vaultAggregate?.max_balance?.toLocaleString() ?? 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="bg-zinc-900 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-400">
            지출 한도 (KST)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div className="rounded-lg bg-black/20 border border-white/5 p-4">
              <div className="text-xs text-zinc-500">오늘 지출 유저</div>
              <div className="text-2xl font-bold text-white mt-1">
                {spendLimitSummary?.total_users?.toLocaleString() ?? 0}명
              </div>
            </div>
            <div className="rounded-lg bg-black/20 border border-white/5 p-4">
              <div className="text-xs text-zinc-500">한도 도달</div>
              <div className="text-2xl font-bold text-rose-400 mt-1">
                {spendLimitSummary?.users_at_limit ?? 0}명
              </div>
            </div>
            <div className="rounded-lg bg-black/20 border border-white/5 p-4">
              <div className="text-xs text-zinc-500">80% 이상</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {spendLimitSummary?.users_above_80_percent ?? 0}명
              </div>
            </div>
            <div className="rounded-lg bg-black/20 border border-white/5 p-4">
              <div className="text-xs text-zinc-500">총 지출액</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                ₩{spendLimitSummary?.total_daily_spent?.toLocaleString() ?? 0}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-zinc-900 p-4 rounded-xl border border-white/5 mb-4">
            <span className="text-sm text-zinc-400">최소 사용률 필터:</span>
            <Select
              value={String(minUsageRate)}
              onValueChange={(v) => setMinUsageRate(Number(v))}
            >
              <SelectTrigger className="w-32 bg-black/20 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                <SelectItem value="0">전체</SelectItem>
                <SelectItem value="0.5">50% 이상</SelectItem>
                <SelectItem value="0.8">80% 이상</SelectItem>
                <SelectItem value="0.95">95% 이상</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-900 overflow-hidden">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-zinc-400">유저</TableHead>
                  <TableHead className="text-zinc-400 text-right">
                    일일 지출
                  </TableHead>
                  <TableHead className="text-zinc-400 text-right">
                    일일 한도
                  </TableHead>
                  <TableHead className="text-zinc-400 text-right">
                    사용률
                  </TableHead>
                  <TableHead className="text-zinc-400 text-center">
                    상태
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingSpendLimits ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-20 text-zinc-500"
                    >
                      로딩중...
                    </TableCell>
                  </TableRow>
                ) : !spendLimits?.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-20 text-zinc-500"
                    >
                      데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  spendLimits.map((item) => (
                    <TableRow
                      key={item.user_id}
                      className="border-white/5 hover:bg-white/5"
                    >
                      <TableCell>
                        <div>
                          <p className="font-bold text-white">
                            {item.nickname}
                          </p>
                          <p className="text-xs text-zinc-500">
                            UID: {item.user_id}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-white">
                        ₩{item.daily_spent.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-zinc-400">
                        ₩{item.daily_limit.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-zinc-800 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                item.usage_rate >= 1
                                  ? "bg-rose-500"
                                  : item.usage_rate >= 0.8
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                              } ${getUsageWidthClass(item.usage_rate)}`}
                            />
                          </div>
                          <span
                            className={`text-sm ${
                              item.usage_rate >= 1
                                ? "text-rose-400"
                                : item.usage_rate >= 0.8
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                            }`}
                          >
                            {(item.usage_rate * 100).toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            item.is_limit_reached
                              ? "border-rose-500/50 text-rose-400"
                              : item.usage_rate >= 0.8
                                ? "border-amber-500/50 text-amber-400"
                                : "border-emerald-500/50 text-emerald-400"
                          }
                        >
                          {item.is_limit_reached
                            ? "한도 도달"
                            : item.usage_rate >= 0.8
                              ? "주의"
                              : "정상"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

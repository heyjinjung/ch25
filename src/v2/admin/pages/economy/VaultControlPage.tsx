import { useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  Search,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  AlertTriangle,
  Users,
  Info,
} from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Textarea } from "../../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import styles from "./VaultControlPage.module.css";

import {
  useAdminWithdrawals,
  useAdminApproveWithdrawal,
  useAdminRejectWithdrawal,
  useVaultUsers,
  useForceEditVault,
  useVaultStats,
} from "../../../hooks/useV2Admin";
import {
  useAdminVaultAggregate,
  useAdminVaultSpendLimits,
  useAdminVaultSpendLimitSummary,
} from "../../../hooks/useAdminGame";
import { AdminWithdrawalDto, UserVaultDto } from "../../../api/adminApi";

const getUsageWidthClass = (usageRate: number) => {
  const percent = Math.max(0, Math.min(100, usageRate * 100));
  const step = Math.round(percent / 5) * 5;
  const key = `w${step}` as keyof typeof styles;
  return styles[key] ?? styles.w0;
};

// Card Detail Modal Types
type CardDetailType =
  | "total_users"
  | "locked_balance"
  | "available_balance"
  | "suspended_users"
  | "average_balance"
  | "median_balance"
  | "max_balance";

const cardDetailInfo: Record<
  CardDetailType,
  { title: string; description: string }
> = {
  total_users: {
    title: "총 유저 수",
    description: "금고에 잔액이 있는 전체 유저 수입니다.",
  },
  locked_balance: {
    title: "총 잠금 잔액",
    description:
      "모든 유저의 잠금된 금고 잔액 합계입니다. 해금 조건을 충족하지 않은 금액입니다.",
  },
  available_balance: {
    title: "총 가용 잔액",
    description: "모든 유저가 출금 가능한 금고 잔액 합계입니다.",
  },
  suspended_users: {
    title: "제재 유저",
    description: "현재 제재 상태인 유저 수와 해당 유저들의 총 금고 잔액입니다.",
  },
  average_balance: {
    title: "평균 잔액",
    description: "전체 유저의 평균 금고 잔액입니다.",
  },
  median_balance: {
    title: "중간값 잔액",
    description:
      "전체 유저 금고 잔액의 중간값입니다. 극단값의 영향을 받지 않는 대표값입니다.",
  },
  max_balance: {
    title: "최대 잔액",
    description: "단일 유저가 보유한 가장 높은 금고 잔액입니다.",
  },
};

export default function VaultControlPage() {
  const [activeTab, setActiveTab] = useState("withdrawals");
  const [searchTerm, setSearchTerm] = useState("");

  // Card Detail Modal State
  const [cardDetailType, setCardDetailType] = useState<CardDetailType | null>(
    null,
  );
  const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);

  const handleCardClick = (type: CardDetailType) => {
    setCardDetailType(type);
    setIsCardDetailOpen(true);
  };

  // Withdrawals State
  const { data: pendingWithdrawals, isLoading: isLoadingPending } =
    useAdminWithdrawals("PENDING");
  const approveMutation = useAdminApproveWithdrawal();
  const rejectMutation = useAdminRejectWithdrawal();

  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<AdminWithdrawalDto | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  const forceEditMutation = useForceEditVault();
  const [forceEditUser, setForceEditUser] = useState<UserVaultDto | null>(null);
  const [forceEditAmount, setForceEditAmount] = useState("");
  const [forceEditReason, setForceEditReason] = useState("");
  const [isForceEditOpen, setIsForceEditOpen] = useState(false);

  // Vault Users State
  const { data: vaultUsers, isLoading: isLoadingUsers } = useVaultUsers();

  // Vault Aggregate & Spend Limits
  const { data: vaultAggregate, isLoading: isLoadingAggregate } =
    useAdminVaultAggregate();
  const [minUsageRate, setMinUsageRate] = useState(0);
  const { data: spendLimits, isLoading: isLoadingSpendLimits } =
    useAdminVaultSpendLimits({
      min_usage_rate: minUsageRate,
      limit: 50,
    });
  const { data: spendLimitSummary } = useAdminVaultSpendLimitSummary();

  // Handlers
  const handleApprove = async (withdrawal: AdminWithdrawalDto) => {
    if (confirm("정말 승인하시겠습니까?")) {
      await approveMutation.mutateAsync(withdrawal.id);
    }
  };

  const handleRejectClick = (withdrawal: AdminWithdrawalDto) => {
    setSelectedWithdrawal(withdrawal);
    setRejectReason("");
    setIsRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!selectedWithdrawal) return;
    await rejectMutation.mutateAsync({
      id: selectedWithdrawal.id,
      reason: rejectReason || "관리자 거절",
    });
    setIsRejectDialogOpen(false);
    setSelectedWithdrawal(null);
  };

  const handleOpenForceEdit = (user: UserVaultDto) => {
    setForceEditUser(user);
    setForceEditAmount("");
    setForceEditReason("");
    setIsForceEditOpen(true);
  };

  const handleForceEdit = async () => {
    if (!forceEditUser) return;
    const amount = Number(forceEditAmount);
    if (!Number.isFinite(amount) || amount === 0) return;
    await forceEditMutation.mutateAsync({
      user_id: forceEditUser.user_id,
      amount,
      reason: forceEditReason || "관리자 강제조정",
    });
    setIsForceEditOpen(false);
    setForceEditUser(null);
  };

  // Filtered Users
  const filteredUsers =
    vaultUsers?.filter(
      (u) =>
        u.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(u.user_id).includes(searchTerm),
    ) ?? [];

  // Dashboard Stats
  const { data: stats } = useVaultStats();

  return (
    <div className="space-y-6 min-h-screen p-6 text-white pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3 mb-2">
          <Wallet className="w-8 h-8 text-indigo-400" />
          금고(Vault) 관리
        </h1>
        <p className="text-zinc-400">
          유저 금고 현황을 조회하고 출금 신청을 승인/반려합니다.
        </p>
      </div>

      {/* Dashboard Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              오늘 금고 잔액
            </CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ₩ {stats?.today_total_vault?.toLocaleString() ?? 0}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              현재 금고에 예치된 총 금액
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              오늘 금고 누적
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ₩ {stats?.today_total_vault?.toLocaleString() ?? 0}
            </div>
            <p className="text-xs text-zinc-500 mt-1">오늘 누적된 금고 금액</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              오늘 출금 신청
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {(
                (stats?.today_withdrawal_pending ?? 0) +
                (stats?.today_withdrawal_approved ?? 0) +
                (stats?.today_withdrawal_rejected ?? 0)
              ).toLocaleString()}{" "}
              건
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              승인: {stats?.today_withdrawal_approved ?? 0} / 대기:{" "}
              {stats?.today_withdrawal_pending ?? 0} / 반려:{" "}
              {stats?.today_withdrawal_rejected ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-900 border border-white/10 p-1">
          <TabsTrigger
            value="withdrawals"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            출금 신청 ({pendingWithdrawals?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            금고 보유 유저
          </TabsTrigger>
          <TabsTrigger
            value="aggregate"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            금고 집계
          </TabsTrigger>
          <TabsTrigger
            value="spend-limits"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            지출 한도
          </TabsTrigger>
        </TabsList>

        {/* Withdrawals Content */}
        <TabsContent value="withdrawals" className="mt-6 space-y-6">
          {isLoadingPending ? (
            <div className="text-center py-20 text-zinc-500">로딩중...</div>
          ) : pendingWithdrawals?.length === 0 ? (
            <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-white/5">
              <CheckCircle2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">대기중인 출금 신청이 없습니다.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingWithdrawals?.map((w) => (
                <Card
                  key={w.id}
                  className="bg-zinc-900 border-white/10 overflow-hidden"
                >
                  <CardHeader className="pb-3 bg-white/5 border-b border-white/5">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-emerald-400 font-mono font-bold">
                          ₩ {w.amount.toLocaleString()}
                        </CardTitle>
                        <CardDescription className="text-zinc-400 mt-1">
                          신청자: {w.nickname} (UID: {w.userId})
                        </CardDescription>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-yellow-500/50 text-yellow-500"
                      >
                        {w.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2 text-sm text-zinc-300">
                    <div className="flex justify-between border-t border-white/5 mt-2">
                      {/* Note: Bank info not available in DTO currently. Assuming future expansion. */}
                      <span className="text-zinc-500">신청일시:</span>
                      <span className="text-zinc-400">
                        {w.requestTime
                          ? format(new Date(w.requestTime), "yyyy-MM-dd HH:mm")
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">위험도:</span>
                      <Badge
                        className={
                          w.riskLevel === "HIGH" ? "bg-red-500" : "bg-zinc-500"
                        }
                      >
                        {w.riskLevel}
                      </Badge>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-black/20 p-3 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="w-full border-red-900/50 text-red-500 hover:bg-red-950 hover:text-red-400"
                      onClick={() => handleRejectClick(w)}
                    >
                      반려
                    </Button>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleApprove(w)}
                    >
                      승인
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Users Content */}
        <TabsContent value="users" className="mt-6 space-y-6">
          <div className="flex items-center gap-4 bg-zinc-900 p-4 rounded-xl border border-white/5">
            <Search className="w-5 h-5 text-zinc-500" />
            <Input
              placeholder="유저 검색 (닉네임/ID)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-zinc-600"
            />
          </div>

          <div className="rounded-xl border border-white/5 bg-zinc-900 overflow-hidden">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-zinc-400">유저 정보</TableHead>
                  <TableHead className="text-zinc-400 text-right">
                    금고 잔액
                  </TableHead>
                  <TableHead className="text-zinc-400 text-right">
                    강제조정
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingUsers ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-20 text-zinc-500"
                    >
                      로딩중...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-20 text-zinc-500"
                    >
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow
                      key={user.user_id}
                      className="border-white/5 hover:bg-white/5"
                    >
                      <TableCell>
                        <div>
                          <p className="font-bold text-white">
                            {user.nickname}
                          </p>
                          <p className="text-xs text-zinc-500">
                            UID: {user.user_id}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-400 font-bold">
                        ₩ {user.vault_balance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10 text-white hover:bg-white/10"
                          onClick={() => handleOpenForceEdit(user)}
                        >
                          조정
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Vault Aggregate Content */}
        <TabsContent value="aggregate" className="mt-6 space-y-6">
          {isLoadingAggregate ? (
            <div className="text-center py-20 text-zinc-500">로딩중...</div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card
                  className="bg-zinc-900 border-white/10 cursor-pointer hover:border-indigo-500/50 transition-colors"
                  onClick={() => handleCardClick("total_users")}
                >
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
                <Card
                  className="bg-zinc-900 border-white/10 cursor-pointer hover:border-emerald-500/50 transition-colors"
                  onClick={() => handleCardClick("locked_balance")}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">
                      총 잠금 잔액
                    </CardTitle>
                    <Wallet className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-400">
                      ₩
                      {vaultAggregate?.total_locked_balance?.toLocaleString() ??
                        0}
                    </div>
                  </CardContent>
                </Card>
                <Card
                  className="bg-zinc-900 border-white/10 cursor-pointer hover:border-blue-500/50 transition-colors"
                  onClick={() => handleCardClick("available_balance")}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">
                      총 가용 잔액
                    </CardTitle>
                    <Wallet className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-400">
                      ₩
                      {vaultAggregate?.total_available_balance?.toLocaleString() ??
                        0}
                    </div>
                  </CardContent>
                </Card>
                <Card
                  className="bg-zinc-900 border-white/10 cursor-pointer hover:border-amber-500/50 transition-colors"
                  onClick={() => handleCardClick("suspended_users")}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">
                      제재 유저
                    </CardTitle>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-400">
                      {vaultAggregate?.suspended_users_count?.toLocaleString() ??
                        0}
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
                <Card
                  className="bg-zinc-900 border-white/10 cursor-pointer hover:border-white/30 transition-colors"
                  onClick={() => handleCardClick("average_balance")}
                >
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
                <Card
                  className="bg-zinc-900 border-white/10 cursor-pointer hover:border-white/30 transition-colors"
                  onClick={() => handleCardClick("median_balance")}
                >
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
                <Card
                  className="bg-zinc-900 border-white/10 cursor-pointer hover:border-emerald-500/50 transition-colors"
                  onClick={() => handleCardClick("max_balance")}
                >
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
        </TabsContent>

        {/* Spend Limits Content */}
        <TabsContent value="spend-limits" className="mt-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  오늘 지출 유저
                </CardTitle>
                <Users className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {spendLimitSummary?.total_users?.toLocaleString() ?? 0}명
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  한도 도달
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-400">
                  {spendLimitSummary?.users_at_limit ?? 0}명
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  80% 이상
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-400">
                  {spendLimitSummary?.users_above_80_percent ?? 0}명
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-white/10">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  총 지출액
                </CardTitle>
                <Wallet className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-400">
                  ₩{spendLimitSummary?.total_daily_spent?.toLocaleString() ?? 0}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  평균 사용률:{" "}
                  {((spendLimitSummary?.average_usage_rate ?? 0) * 100).toFixed(
                    1,
                  )}
                  %
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filter & Table */}
          <div className="flex items-center gap-4 bg-zinc-900 p-4 rounded-xl border border-white/5">
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
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>출금 반려</DialogTitle>
            <DialogDescription className="text-zinc-400">
              반려 사유를 입력해주세요. 유저에게 알림이 전송됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="반려 사유 (예: 계좌 정보 불일치)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="bg-black/20 border-white/10 min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsRejectDialogOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              취소
            </Button>
            <Button
              onClick={confirmReject}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              반려 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Edit Dialog */}
      <Dialog open={isForceEditOpen} onOpenChange={setIsForceEditOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>금고 잔액 강제조정</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {forceEditUser
                ? `${forceEditUser.nickname} (UID: ${forceEditUser.user_id})`
                : "대상 유저"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-zinc-400">조정 금액</label>
              <Input
                type="number"
                placeholder="예: 10000 또는 -5000"
                value={forceEditAmount}
                onChange={(e) => setForceEditAmount(e.target.value)}
                className="bg-black/20 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400">사유</label>
              <Textarea
                value={forceEditReason}
                onChange={(e) => setForceEditReason(e.target.value)}
                className="bg-black/20 border-white/10 text-white"
                placeholder="관리자 강제조정 사유"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsForceEditOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleForceEdit}
              disabled={
                !forceEditUser ||
                !Number.isFinite(Number(forceEditAmount)) ||
                Number(forceEditAmount) === 0 ||
                forceEditMutation.isPending
              }
            >
              적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Detail Modal */}
      <Dialog open={isCardDetailOpen} onOpenChange={setIsCardDetailOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-indigo-400" />
              {cardDetailType && cardDetailInfo[cardDetailType]?.title}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {cardDetailType && cardDetailInfo[cardDetailType]?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {cardDetailType === "total_users" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5">
                  <span className="text-zinc-400">전체 금고 유저</span>
                  <span className="text-2xl font-bold text-white">
                    {vaultAggregate?.total_users?.toLocaleString() ?? 0}명
                  </span>
                </div>
              </div>
            )}
            {cardDetailType === "locked_balance" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5">
                  <span className="text-zinc-400">총 잠금 잔액</span>
                  <span className="text-2xl font-bold text-emerald-400">
                    ₩
                    {vaultAggregate?.total_locked_balance?.toLocaleString() ??
                      0}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  * 해금 조건(일일 플레이 30회, 입금 확인 등)을 충족하지 않아
                  출금 불가능한 금액입니다.
                </p>
              </div>
            )}
            {cardDetailType === "available_balance" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5">
                  <span className="text-zinc-400">총 가용 잔액</span>
                  <span className="text-2xl font-bold text-blue-400">
                    ₩
                    {vaultAggregate?.total_available_balance?.toLocaleString() ??
                      0}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  * 해금 조건을 충족하여 출금 신청이 가능한 금액의 합계입니다.
                </p>
              </div>
            )}
            {cardDetailType === "suspended_users" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5">
                  <span className="text-zinc-400">제재 유저 수</span>
                  <span className="text-2xl font-bold text-amber-400">
                    {vaultAggregate?.suspended_users_count?.toLocaleString() ??
                      0}
                    명
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5">
                  <span className="text-zinc-400">제재 유저 금고 잔액</span>
                  <span className="text-xl font-bold text-amber-400">
                    ₩
                    {vaultAggregate?.suspended_users_balance?.toLocaleString() ??
                      0}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  * 부정행위 등으로 제재된 유저들의 금고 잔액입니다. 출금이
                  차단됩니다.
                </p>
              </div>
            )}
            {cardDetailType === "average_balance" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5">
                  <span className="text-zinc-400">평균 잔액</span>
                  <span className="text-2xl font-bold text-white">
                    ₩{vaultAggregate?.average_balance?.toLocaleString() ?? 0}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  * 전체 유저의 금고 잔액을 유저 수로 나눈 산술평균입니다.
                </p>
              </div>
            )}
            {cardDetailType === "median_balance" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5">
                  <span className="text-zinc-400">중간값 잔액</span>
                  <span className="text-2xl font-bold text-white">
                    ₩{vaultAggregate?.median_balance?.toLocaleString() ?? 0}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  * 유저들의 금고 잔액을 정렬했을 때 중간에 위치하는 값입니다.
                  극단값의 영향을 받지 않습니다.
                </p>
              </div>
            )}
            {cardDetailType === "max_balance" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5">
                  <span className="text-zinc-400">최대 잔액</span>
                  <span className="text-2xl font-bold text-emerald-400">
                    ₩{vaultAggregate?.max_balance?.toLocaleString() ?? 0}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  * 가장 높은 금고 잔액을 보유한 단일 유저의 금액입니다.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCardDetailOpen(false)}
              className="border-white/10 text-white hover:bg-white/10"
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

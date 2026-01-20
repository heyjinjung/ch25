import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { Card, CardHeader, CardContent, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";
import { SlideToApprove } from "../../components/ui/SlideToApprove";
import {
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  RefreshCw,
} from "lucide-react";
import {
  useVaultStats,
  useVaultUsers,
  useVaultTrend,
  useForceEditVault,
  useAdminWithdrawals,
  useAdminApproveWithdrawal,
  useAdminRejectWithdrawal,
} from "../../../hooks/useV2Admin";
import { cn } from "../../../lib/utils";
import type { AdminWithdrawalDto, UserVaultDto } from "../../../api/adminApi";
import { NumberTicker } from "../../components/ui/NumberTicker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

export default function VaultControlPage() {
  const statsRef = useRef<HTMLDivElement>(null);
  const { data: stats, isLoading: statsLoading } = useVaultStats();
  const { data: withdrawals = [] } = useAdminWithdrawals();
  const { data: vaultUsers = [] } = useVaultUsers(50, 0, "vault_balance");
  const { data: trend = [] } = useVaultTrend(30);

  const approveMutation = useAdminApproveWithdrawal();
  const rejectMutation = useAdminRejectWithdrawal();
  const forceEditMutation = useForceEditVault();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [forceEditData, setForceEditData] = useState({
    user_id: "",
    amount: "",
    reason: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("vault_balance");

  // GSAP Animation for Stats Cards
  useEffect(() => {
    if (statsRef.current && stats) {
      const cards = statsRef.current.querySelectorAll(".stat-card");
      gsap.fromTo(
        cards,
        { opacity: 0, y: 30, scale: 0.9 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: "back.out(1.7)",
        }
      );
    }
  }, [stats]);

  const handleApprove = async (id: number) => {
    await approveMutation.mutateAsync(id);
  };

  const handleRejectClick = (id: number) => {
    setRejectId(id);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (rejectId) {
      await rejectMutation.mutateAsync({ id: rejectId, reason: rejectReason });
      setRejectId(null);
    }
  };

  const handleForceEdit = async () => {
    if (!forceEditData.user_id || !forceEditData.amount || !forceEditData.reason) {
      return;
    }

    await forceEditMutation.mutateAsync({
      user_id: parseInt(forceEditData.user_id),
      amount: parseInt(forceEditData.amount),
      reason: forceEditData.reason,
    });

    setIsEditModalOpen(false);
    setForceEditData({ user_id: "", amount: "", reason: "" });
  };

  const pendingWithdrawals = withdrawals.filter(
    (w: AdminWithdrawalDto) => w.status === "PENDING"
  );

  const filteredUsers = vaultUsers.filter((user: UserVaultDto) =>
    user.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.telegram_username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Trend 차트 데이터 포맷
  const chartData = trend.map((item) => ({
    date: item.date.slice(5), // MM-DD만 표시
    총금고액: Math.floor(item.total_vault / 10000), // 만원 단위
    출금액: Math.floor(item.withdrawal_amount / 10000),
  }));

  return (
    <div className="space-y-6 h-full p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-3">
            <Wallet className="w-8 h-8 text-indigo-400" />
            금고 제어
          </h1>
          <p className="text-sm text-zinc-400">
            실시간 금고 통계, 출금 승인, 잔액 조정을 수행합니다.
          </p>
        </div>

        <Button
          variant="outline"
          className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2"
          onClick={() => setIsEditModalOpen(true)}
        >
          <ShieldAlert className="w-4 h-4" />
          금고 강제 조정
        </Button>
      </div>

      {/* Stats Dashboard */}
      <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div className="stat-card">
          <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                당일 금고 총액
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                ₩{" "}
                <NumberTicker
                  value={stats?.today_total_vault || 0}
                  className="text-indigo-400"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">실시간 집계</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="stat-card">
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                출금 대기
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                ₩{" "}
                <NumberTicker
                  value={stats?.today_withdrawal_pending || 0}
                  className="text-amber-400"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {stats?.total_pending_count || 0}건 대기 중
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="stat-card">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                출금 승인 (당일)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                ₩{" "}
                <NumberTicker
                  value={stats?.today_withdrawal_approved || 0}
                  className="text-emerald-400"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">승인 완료</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="stat-card">
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                출금 반려 (당일)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                ₩{" "}
                <NumberTicker
                  value={stats?.today_withdrawal_rejected || 0}
                  className="text-red-400"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">반려 처리</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="withdrawals" className="space-y-4">
        <TabsList className="bg-[#18181B] border border-white/5">
          <TabsTrigger value="withdrawals" className="data-[state=active]:bg-indigo-500/20">
            출금 승인 ({pendingWithdrawals.length})
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-indigo-500/20">
            회원별 금고
          </TabsTrigger>
          <TabsTrigger value="trend" className="data-[state=active]:bg-indigo-500/20">
            일자별 추이
          </TabsTrigger>
        </TabsList>

        {/* 출금 승인 탭 */}
        <TabsContent value="withdrawals" className="space-y-4">
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingWithdrawals.length === 0 && (
                <div className="col-span-full h-40 flex items-center justify-center text-zinc-500 border border-dashed border-white/10 rounded-xl">
                  대기 중인 출금 요청이 없습니다.
                </div>
              )}
              {pendingWithdrawals.map((item: AdminWithdrawalDto) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="bg-[#18181B] border-white/5 overflow-hidden hover:border-white/10 transition-all">
                    <CardHeader className="bg-zinc-900/50 border-b border-white/5 pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium text-zinc-400">
                            Request #{item.id}
                          </div>
                          <div className="text-lg font-bold text-white mt-1">
                            ₩ {item.amount.toLocaleString()}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "bg-black/40",
                            item.riskLevel === "HIGH"
                              ? "text-red-400 border-red-500/30"
                              : "text-emerald-400 border-emerald-500/30"
                          )}
                        >
                          {item.riskLevel} RISK
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">유저</span>
                        <span className="text-zinc-300">
                          {item.nickname} (ID: {item.userId})
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">요청 시각</span>
                        <span className="text-zinc-300">{item.requestTime}</span>
                      </div>

                      <div className="pt-2 flex flex-col gap-2">
                        {item.riskLevel === "HIGH" ? (
                          <Button
                            variant="outline"
                            className="w-full border-red-500/30 text-red-400 cursor-not-allowed opacity-80"
                            disabled
                          >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            고위험 - 수동 검토 필요
                          </Button>
                        ) : (
                          <SlideToApprove onApprove={() => handleApprove(item.id)} />
                        )}
                        <Button
                          variant="ghost"
                          className="w-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleRejectClick(item.id)}
                        >
                          반려 (Reject)
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </TabsContent>

        {/* 회원별 금고 탭 */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="닉네임 또는 텔레그램 검색..."
                className="pl-9 bg-zinc-900 border-zinc-800"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="vault_balance">금고 잔액</SelectItem>
                <SelectItem value="total_deposit">총 입금액</SelectItem>
                <SelectItem value="last_activity">최근 활동</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#18181B] overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-900/50">
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">UID</TableHead>
                  <TableHead className="text-zinc-400">닉네임</TableHead>
                  <TableHead className="text-zinc-400">등급</TableHead>
                  <TableHead className="text-zinc-400 text-right">금고 잔액</TableHead>
                  <TableHead className="text-zinc-400 text-right">총 입금</TableHead>
                  <TableHead className="text-zinc-400 text-right">총 출금</TableHead>
                  <TableHead className="text-zinc-400">최근 활동</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: UserVaultDto) => (
                  <TableRow
                    key={user.user_id}
                    className="border-zinc-800 hover:bg-white/5 transition-colors"
                  >
                    <TableCell className="font-mono text-zinc-400">
                      #{user.user_id}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{user.nickname}</span>
                        {user.telegram_username && (
                          <span className="text-xs text-zinc-500">
                            @{user.telegram_username}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          user.tier === "VVIP"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : user.tier === "VIP"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        )}
                      >
                        {user.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-400 font-bold">
                      ₩{user.vault_balance.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-zinc-300">
                      ₩{user.total_deposit.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-zinc-300">
                      ₩{user.total_withdrawal.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-zinc-400 text-xs">
                      {user.last_activity
                        ? new Date(user.last_activity).toLocaleString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 일자별 추이 탭 */}
        <TabsContent value="trend" className="space-y-4">
          <Card className="bg-[#18181B] border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                최근 30일 금고 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVault" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818CF8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorWithdrawal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F87171" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F87171" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                    <XAxis
                      dataKey="date"
                      stroke="#71717A"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis stroke="#71717A" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181B",
                        border: "1px solid #27272A",
                        borderRadius: "8px",
                        color: "#E4E4E7",
                      }}
                      formatter={(value: number) => [`₩${value}만`, ""]}
                    />
                    <Area
                      type="monotone"
                      dataKey="총금고액"
                      stroke="#818CF8"
                      fillOpacity={1}
                      fill="url(#colorVault)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="출금액"
                      stroke="#F87171"
                      fillOpacity={1}
                      fill="url(#colorWithdrawal)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Force Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2 text-xl">
              <ShieldAlert className="w-6 h-6" /> 금고 강제 조정 경고
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              이 작업은 유저의 실제 금고 잔액을 강제로 변경하며, 모든 내역이{" "}
              <strong className="text-red-400">Audit Log</strong>에 영구히 기록됩니다.
              오입금 처리 등 비상 상황에서만 사용하십시오.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right text-sm text-zinc-400">User ID</span>
              <Input
                value={forceEditData.user_id}
                onChange={(e) =>
                  setForceEditData({ ...forceEditData, user_id: e.target.value })
                }
                className="col-span-3 bg-black/50 border-white/10 text-white"
                placeholder="예: 1001"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right text-sm text-zinc-400">조정 금액</span>
              <Input
                value={forceEditData.amount}
                onChange={(e) =>
                  setForceEditData({ ...forceEditData, amount: e.target.value })
                }
                className="col-span-3 bg-black/50 border-white/10 text-white"
                placeholder="양수=증가, 음수=감소 (예: +50000)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right text-sm text-zinc-400">사유</span>
              <Input
                value={forceEditData.reason}
                onChange={(e) =>
                  setForceEditData({ ...forceEditData, reason: e.target.value })
                }
                className="col-span-3 bg-black/50 border-white/10 text-white"
                placeholder="조정 사유 입력 (필수)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsEditModalOpen(false)}
              className="text-zinc-400"
            >
              취소
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleForceEdit}
              disabled={
                !forceEditData.user_id ||
                !forceEditData.amount ||
                !forceEditData.reason ||
                forceEditMutation.isPending
              }
            >
              {forceEditMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                "강제 실행"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">출금 반려</DialogTitle>
            <DialogDescription className="text-zinc-400">
              반려 사유를 입력하면 유저에게 알림이 발송됩니다.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="예: 부정 플레이 의심, 계좌 정보 불일치 등"
            className="bg-black/50 border-white/10 text-white"
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRejectId(null)}
              className="text-zinc-400"
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectReason}
            >
              반려 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

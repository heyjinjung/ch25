import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";
import {
  ShieldAlert,
  Wallet,
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
  useVaultUserLedger,
  useForceEditVault,
  useAdminWithdrawals,
  useAdminApproveWithdrawal,
  useAdminRejectWithdrawal,
  useAdminUserList,
  useWithdrawalDetails,
} from "../../../hooks/useV2Admin";
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
import { cn } from "../../../lib/utils";
import { getRewardItemLabel } from "../../../constants/rewardItems";
import type {
  AdminWithdrawalDto,
  UserVaultDto,
  AdminUserListDto,
} from "../../../api/adminApi";
import { NumberTicker } from "../../components/ui/NumberTicker";

export default function VaultControlPage() {
  const statsRef = useRef<HTMLDivElement>(null);
  const { data: stats } = useVaultStats();
  const { data: withdrawals = [] } = useAdminWithdrawals();
  const { data: vaultUsers = [] } = useVaultUsers(50, 0, "vault_balance");

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
  const [sortField, setSortField] =
    useState<keyof UserVaultDto>("vault_balance");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Vault Ledger Modal
  const [ledgerUser, setLedgerUser] = useState<UserVaultDto | null>(null);
  const { data: vaultLedger } = useVaultUserLedger(ledgerUser?.user_id ?? null);

  // Withdrawal Details Modal
  const [detailsModalStatus, setDetailsModalStatus] = useState<string | null>(
    null,
  );
  const { data: withdrawalDetails } = useWithdrawalDetails(
    detailsModalStatus || "",
  );

  // User Search for Force Edit
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUserListDto | null>(
    null,
  );
  const { data: userSearchResults } = useAdminUserList({
    search: userSearchTerm,
    limit: 5,
  });

  const handleSelectUser = (user: AdminUserListDto) => {
    setSelectedUser(user);
    setForceEditData((prev) => ({ ...prev, user_id: user.id.toString() }));
    setUserSearchTerm("");
  };

  const clearSelectedUser = () => {
    setSelectedUser(null);
    setForceEditData((prev) => ({ ...prev, user_id: "" }));
  };

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
        },
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
    if (
      !forceEditData.user_id ||
      !forceEditData.amount ||
      !forceEditData.reason
    ) {
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
    (w: AdminWithdrawalDto) => w.status === "PENDING",
  );

  const handleSort = (field: keyof UserVaultDto) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filteredUsers = vaultUsers.filter(
    (user: UserVaultDto) =>
      user.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.telegram_username?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aVal = a[sortField] ?? 0;
    const bVal = b[sortField] ?? 0;

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });

  const normalizeVaultRefType = (value?: string | null) => {
    if (!value) return "-";
    const raw = value.toUpperCase();
    if (raw === "POINT" || raw === "CC_POINT" || raw === "VAULT") {
      return getRewardItemLabel("VAULT");
    }
    return getRewardItemLabel(raw);
  };

  return (
    <div className="space-y-6 h-full p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-3">
            <Wallet className="w-8 h-8 text-indigo-400" />
            Í∏àÍ≥† ?úÏñ¥
          </h1>
          <p className="text-sm text-zinc-400">
            ?§ÏãúÍ∞?Í∏àÍ≥† ?µÍ≥Ñ, Ï∂úÍ∏à ?πÏù∏, ?îÏï° Ï°∞Ï†ï???òÌñâ?©Îãà??
          </p>
        </div>

        <Button
          variant="outline"
          className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2"
          onClick={() => setIsEditModalOpen(true)}
        >
          <ShieldAlert className="w-4 h-4" />
          Í∏àÍ≥† Í∞ïÏ†ú Ï°∞Ï†ï
        </Button>
      </div>

      {/* Stats Dashboard */}
      <div
        ref={statsRef}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div className="stat-card">
          <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-500/20 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                ?πÏùº Í∏àÍ≥† Ï¥ùÏï°
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                ??" "}
                <NumberTicker
                  value={stats?.today_total_vault || 0}
                  className="text-indigo-400"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">?§ÏãúÍ∞?ÏßëÍ≥Ñ</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="stat-card"
          onClick={() => setDetailsModalStatus("PENDING")}
        >
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 overflow-hidden relative cursor-pointer hover:border-amber-500/40 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Ï∂úÍ∏à ?ÄÍ∏?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                ??" "}
                <NumberTicker
                  value={stats?.today_withdrawal_pending || 0}
                  className="text-amber-400"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {stats?.total_pending_count || 0}Í±??ÄÍ∏?Ï§?
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="stat-card"
          onClick={() => setDetailsModalStatus("APPROVED")}
        >
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 overflow-hidden relative cursor-pointer hover:border-emerald-500/40 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Ï∂úÍ∏à ?πÏù∏ (?πÏùº)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                ??" "}
                <NumberTicker
                  value={stats?.today_withdrawal_approved || 0}
                  className="text-emerald-400"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">?πÏù∏ ?ÑÎ£å</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="stat-card"
          onClick={() => setDetailsModalStatus("REJECTED")}
        >
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 overflow-hidden relative cursor-pointer hover:border-red-500/40 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Ï∂úÍ∏à Î∞òÎ†§ (?πÏùº)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                ??" "}
                <NumberTicker
                  value={stats?.today_withdrawal_rejected || 0}
                  className="text-red-400"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">Î∞òÎ†§ Ï≤òÎ¶¨</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="withdrawals" className="space-y-4">
        <TabsList className="bg-[#18181B] border border-white/5">
          <TabsTrigger
            value="withdrawals"
            className="data-[state=active]:bg-indigo-500/20"
          >
            Ï∂úÍ∏à ?πÏù∏ ({pendingWithdrawals.length})
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="data-[state=active]:bg-indigo-500/20"
          >
            ?åÏõêÎ≥?Í∏àÍ≥†
          </TabsTrigger>
        </TabsList>

        {/* Ï∂úÍ∏à ?πÏù∏ ??*/}
        <TabsContent value="withdrawals" className="space-y-4">
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingWithdrawals.length === 0 && (
                <div className="col-span-full h-40 flex items-center justify-center text-zinc-500 border border-dashed border-white/10 rounded-xl">
                  ?ÄÍ∏?Ï§ëÏù∏ Ï∂úÍ∏à ?îÏ≤≠???ÜÏäµ?àÎã§.
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
                            ??{(item.amount || 0).toLocaleString()}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "bg-black/40",
                            item.riskLevel === "HIGH"
                              ? "text-red-400 border-red-500/30"
                              : "text-emerald-400 border-emerald-500/30",
                          )}
                        >
                          {item.riskLevel} RISK
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">?†Ï?</span>
                        <span className="text-zinc-300">
                          {item.nickname} (ID: {item.userId})
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">?îÏ≤≠ ?úÍ∞Å</span>
                        <span className="text-zinc-300">
                          {item.requestTime}
                        </span>
                      </div>

                      <div className="pt-2 flex flex-col gap-2">
                        {item.riskLevel === "HIGH" ? (
                          <Button
                            variant="outline"
                            className="w-full border-red-500/30 text-red-400 cursor-not-allowed opacity-80"
                            disabled
                          >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Í≥†ÏúÑ??- ?òÎèô Í≤Ä???ÑÏöî
                          </Button>
                        ) : (
                          <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleApprove(item.id)}
                            disabled={approveMutation.isPending}
                          >
                            {approveMutation.isPending ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-2" />
                            )}
                            ?πÏù∏ (Approve)
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          className="w-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleRejectClick(item.id)}
                        >
                          Î∞òÎ†§ (Reject)
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </TabsContent>

        {/* ?åÏõêÎ≥?Í∏àÍ≥† ??*/}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="?âÎÑ§???êÎäî ?îÎ†àÍ∑∏Îû® Í≤Ä??.."
                className="pl-9 bg-zinc-900 border-zinc-800"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="?ïÎ†¨" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="vault_balance">Í∏àÍ≥† ?îÏï°</SelectItem>
                <SelectItem value="total_deposit">Ï¥??ÖÍ∏à??/SelectItem>
                <SelectItem value="last_activity">ÏµúÍ∑º ?úÎèô</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#18181B] overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-900/50">
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead
                    className="text-zinc-400 cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort("user_id")}
                  >
                    <div className="flex items-center gap-1">
                      UID
                      {sortField === "user_id" && (
                        <span className="text-xs">
                          {sortOrder === "asc" ? "?? : "??}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-zinc-400 cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort("nickname")}
                  >
                    <div className="flex items-center gap-1">
                      ?âÎÑ§??
                      {sortField === "nickname" && (
                        <span className="text-xs">
                          {sortOrder === "asc" ? "?? : "??}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-zinc-400 cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort("tier")}
                  >
                    <div className="flex items-center gap-1">
                      ?±Í∏â
                      {sortField === "tier" && (
                        <span className="text-xs">
                          {sortOrder === "asc" ? "?? : "??}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-zinc-400 text-right cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort("vault_balance")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Í∏àÍ≥† ?îÏï°
                      {sortField === "vault_balance" && (
                        <span className="text-xs">
                          {sortOrder === "asc" ? "?? : "??}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-zinc-400 text-right cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort("total_deposit")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Ï¥??ÖÍ∏à
                      {sortField === "total_deposit" && (
                        <span className="text-xs">
                          {sortOrder === "asc" ? "?? : "??}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-zinc-400 text-right cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort("total_withdrawal")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Ï¥?Ï∂úÍ∏à
                      {sortField === "total_withdrawal" && (
                        <span className="text-xs">
                          {sortOrder === "asc" ? "?? : "??}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-zinc-400 cursor-pointer hover:text-white transition-colors select-none"
                    onClick={() => handleSort("last_activity")}
                  >
                    <div className="flex items-center gap-1">
                      ÏµúÍ∑º ?úÎèô
                      {sortField === "last_activity" && (
                        <span className="text-xs">
                          {sortOrder === "asc" ? "?? : "??}
                        </span>
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.map((user: UserVaultDto) => (
                  <TableRow
                    key={user.user_id}
                    className="border-zinc-800 hover:bg-white/5 transition-colors"
                  >
                    <TableCell className="font-mono text-zinc-400">
                      #{user.user_id}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => setLedgerUser(user)}
                          className="text-left font-medium text-white hover:text-indigo-300 transition-colors"
                        >
                          {user.nickname}
                        </button>
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
                              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
                        )}
                      >
                        {user.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-400 font-bold">
                      ??(user.vault_balance || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-zinc-300">
                      ??(user.total_deposit || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-zinc-300">
                      ??(user.total_withdrawal || 0).toLocaleString()}
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
      </Tabs>

      {/* Force Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2 text-xl">
              <ShieldAlert className="w-6 h-6" /> Í∏àÍ≥† Í∞ïÏ†ú Ï°∞Ï†ï Í≤ΩÍ≥†
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              ???ëÏóÖ?Ä ?†Ï????§Ï†ú Í∏àÍ≥† ?îÏï°??Í∞ïÏ†úÎ°?Î≥ÄÍ≤ΩÌïòÎ©? Î™®Îì† ?¥Ïó≠??" "}
              <strong className="text-red-400">Audit Log</strong>???ÅÍµ¨??
              Í∏∞Î°ù?©Îãà?? ?§ÏûÖÍ∏?Ï≤òÎ¶¨ ??ÎπÑÏÉÅ ?ÅÌô©?êÏÑúÎß??¨Ïö©?òÏã≠?úÏò§.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right text-sm text-zinc-400">
                ?Ä???†Ï?
              </span>
              <div className="col-span-3 relative">
                {selectedUser ? (
                  <div className="flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-md p-2">
                    <span className="text-white text-sm">
                      {selectedUser.nickname}{" "}
                      <span className="text-zinc-500 text-xs">
                        #{selectedUser.id}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelectedUser}
                      className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="bg-black/50 border-white/10 text-white"
                      placeholder="?âÎÑ§??Í≤Ä??.."
                    />
                    {userSearchTerm &&
                      userSearchResults?.users &&
                      userSearchResults.users.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#27272A] border border-zinc-700 rounded-md shadow-xl z-50 overflow-hidden">
                          {userSearchResults.users.map((user) => (
                            <div
                              key={user.id}
                              className="px-3 py-2 text-sm hover:bg-zinc-700 cursor-pointer flex justify-between items-center"
                              onClick={() => handleSelectUser(user)}
                            >
                              <span className="text-white">
                                {user.nickname}
                              </span>
                              <span className="text-zinc-500 text-xs">
                                #{user.id}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right text-sm text-zinc-400">
                Ï°∞Ï†ï Í∏àÏï°
              </span>
              <Input
                value={forceEditData.amount}
                onChange={(e) =>
                  setForceEditData({ ...forceEditData, amount: e.target.value })
                }
                className="col-span-3 bg-black/50 border-white/10 text-white"
                placeholder="?ëÏàò=Ï¶ùÍ?, ?åÏàò=Í∞êÏÜå (?? +50000)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right text-sm text-zinc-400">?¨Ïú†</span>
              <Input
                value={forceEditData.reason}
                onChange={(e) =>
                  setForceEditData({ ...forceEditData, reason: e.target.value })
                }
                className="col-span-3 bg-black/50 border-white/10 text-white"
                placeholder="Ï°∞Ï†ï ?¨Ïú† ?ÖÎ†• (?ÑÏàò)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsEditModalOpen(false)}
              className="text-zinc-400"
            >
              Ï∑®ÏÜå
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
                  Ï≤òÎ¶¨ Ï§?..
                </>
              ) : (
                "Í∞ïÏ†ú ?§Ìñâ"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vault Ledger Modal */}
      <Dialog
        open={!!ledgerUser}
        onOpenChange={(open) => !open && setLedgerUser(null)}
      >
        <DialogContent className="bg-[#18181B] border-white/10 text-white max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              {ledgerUser
                ? `${ledgerUser.nickname} Í∏àÍ≥† ?ÅÏÑ∏ ?¥Ïó≠`
                : "Í∏àÍ≥† ?ÅÏÑ∏ ?¥Ïó≠"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              ?ÑÏ†Å/Ï∞®Í∞ê ?¥Ïó≠ Î∞??îÏï° Î≥Ä??Í∏∞Î°ù?ÖÎãà??
            </DialogDescription>
          </DialogHeader>

          {vaultLedger ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-zinc-900/60 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-zinc-400">
                      ?ÑÏ†Å
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-emerald-400 font-bold text-lg">
                    ??vaultLedger.total_in.toLocaleString()}
                  </CardContent>
                </Card>
                <Card className="bg-zinc-900/60 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-zinc-400">
                      Ï∞®Í∞ê
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-red-400 font-bold text-lg">
                    ??Math.abs(vaultLedger.total_out).toLocaleString()}
                  </CardContent>
                </Card>
                <Card className="bg-zinc-900/60 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-zinc-400">
                      ?ÑÏû¨ ?îÏï°(?†Ï?)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-indigo-300 font-bold text-lg">
                    ??vaultLedger.current_balance.toLocaleString()}
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-xl border border-white/5 bg-zinc-900/50 overflow-hidden">
                <Table>
                  <TableHeader className="bg-zinc-900">
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-400">?úÍ∞Å</TableHead>
                      <TableHead className="text-zinc-400">?¨Ïú†</TableHead>
                      <TableHead className="text-zinc-400">Íµ¨Î∂Ñ</TableHead>
                      <TableHead className="text-zinc-400 text-right">
                        Ï¶ùÍ∞ê
                      </TableHead>
                      <TableHead className="text-zinc-400 text-right">
                        ?îÏï°
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vaultLedger.items.length === 0 ? (
                      <TableRow className="border-zinc-800">
                        <TableCell
                          colSpan={5}
                          className="text-center text-zinc-500 py-8"
                        >
                          ?¥Ïó≠???ÜÏäµ?àÎã§.
                        </TableCell>
                      </TableRow>
                    ) : (
                      vaultLedger.items.map((item) => (
                        <TableRow
                          key={item.id}
                          className="border-zinc-800 hover:bg-white/5 transition-colors"
                        >
                          <TableCell className="text-zinc-400 text-xs">
                            {new Date(item.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-zinc-300">
                            {item.reason || "-"}
                          </TableCell>
                          <TableCell className="text-zinc-500 text-xs">
                            {normalizeVaultRefType(item.ref_type)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-mono",
                              item.amount >= 0
                                ? "text-emerald-400"
                                : "text-red-400",
                            )}
                          >
                            {item.amount >= 0 ? "+" : ""}??
                            {item.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-zinc-300">
                            ??item.balance_after.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center text-zinc-500 py-12">Î°úÎî© Ï§?..</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={!!rejectId}
        onOpenChange={(open) => !open && setRejectId(null)}
      >
        <DialogContent className="bg-[#18181B] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Ï∂úÍ∏à Î∞òÎ†§</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Î∞òÎ†§ ?¨Ïú†Î•??ÖÎ†•?òÎ©¥ ?†Ï??êÍ≤å ?åÎ¶º??Î∞úÏÜ°?©Îãà??
            </DialogDescription>
          </DialogHeader>
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="?? Î∂Ä???åÎ†à???òÏã¨, Í≥ÑÏ¢å ?ïÎ≥¥ Î∂àÏùºÏπ???
            className="bg-black/50 border-white/10 text-white"
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRejectId(null)}
              className="text-zinc-400"
            >
              Ï∑®ÏÜå
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectReason}
            >
              Î∞òÎ†§ ?ïÏ†ï
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Details Modal */}
      <Dialog
        open={!!detailsModalStatus}
        onOpenChange={(open) => !open && setDetailsModalStatus(null)}
      >
        <DialogContent className="bg-[#18181B] border-white/10 text-white max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-xl">
              {detailsModalStatus === "PENDING" && (
                <>
                  <Clock className="w-5 h-5 text-amber-400" />
                  Ï∂úÍ∏à ?ÄÍ∏??¥Ïó≠
                </>
              )}
              {detailsModalStatus === "APPROVED" && (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  Ï∂úÍ∏à ?πÏù∏ ?¥Ïó≠
                </>
              )}
              {detailsModalStatus === "REJECTED" && (
                <>
                  <XCircle className="w-5 h-5 text-red-400" />
                  Ï∂úÍ∏à Î∞òÎ†§ ?¥Ïó≠
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              {detailsModalStatus} ?ÅÌÉú???πÏùº Ï∂úÍ∏à ?îÏ≤≠ Î™©Î°ù?ÖÎãà??
              {withdrawalDetails && (
                <span className="ml-2 font-semibold text-white">
                  Ï¥?{withdrawalDetails.count}Í±? ??
                  {withdrawalDetails.total_amount.toLocaleString()}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {withdrawalDetails && withdrawalDetails.withdrawals.length > 0 ? (
            <div className="mt-4 rounded-xl border border-white/5 bg-zinc-900/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-zinc-900">
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400">ID</TableHead>
                    <TableHead className="text-zinc-400">?†Ï?</TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      Í∏àÏï°
                    </TableHead>
                    <TableHead className="text-zinc-400">?îÏ≤≠ ?úÍ∞Å</TableHead>
                    {detailsModalStatus === "APPROVED" && (
                      <TableHead className="text-zinc-400">?πÏù∏ ?úÍ∞Å</TableHead>
                    )}
                    {detailsModalStatus === "REJECTED" && (
                      <>
                        <TableHead className="text-zinc-400">
                          Î∞òÎ†§ ?úÍ∞Å
                        </TableHead>
                        <TableHead className="text-zinc-400">
                          Î∞òÎ†§ ?¨Ïú†
                        </TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawalDetails.withdrawals.map((w) => (
                    <TableRow
                      key={w.id}
                      className="border-zinc-800 hover:bg-white/5 transition-colors"
                    >
                      <TableCell className="font-mono text-zinc-400">
                        #{w.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-white">
                            {w.nickname}
                          </span>
                          {w.telegram_username && (
                            <span className="text-xs text-zinc-500">
                              @{w.telegram_username}
                            </span>
                          )}
                          <span className="text-xs text-zinc-600">
                            UID: {w.user_id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-400">
                        ??w.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-xs">
                        {new Date(w.created_at).toLocaleString()}
                      </TableCell>
                      {detailsModalStatus === "APPROVED" && w.approved_at && (
                        <TableCell className="text-zinc-400 text-xs">
                          {new Date(w.approved_at).toLocaleString()}
                        </TableCell>
                      )}
                      {detailsModalStatus === "REJECTED" && (
                        <>
                          <TableCell className="text-zinc-400 text-xs">
                            {w.rejected_at
                              ? new Date(w.rejected_at).toLocaleString()
                              : "-"}
                          </TableCell>
                          <TableCell className="text-red-400 text-sm">
                            {w.rejection_reason || "-"}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-zinc-500 border border-dashed border-white/10 rounded-xl mt-4">
              ?∞Ïù¥?∞Í? ?ÜÏäµ?àÎã§.
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDetailsModalStatus(null)}
              className="border-zinc-700 text-zinc-300"
            >
              ?´Í∏∞
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  useAdminTicketLogs,
  useCreateTicket,
  useUpdateTicket,
  useDeleteTicket,
} from "../../../hooks/useV2Admin";
import { TicketLogDto, getAdminUserList } from "../../../api/adminApi";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../../components/ui/dropdown-menu";
import { Label } from "../../../components/ui/label";
import {
  Search,
  Plus,
  History,
  MoreHorizontal,
  Edit2,
  Trash2,
  Ticket,
  AlertCircle,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  getWalletRewardItems,
  getRewardItemLabel,
  type RewardItem,
} from "../../../constants/rewardItems";

const formatKst = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
};

const normalizeSearchValue = (value: string) => value.trim();

export default function TicketManagementTab() {
  const [searchUserId, setSearchUserId] = useState<number | undefined>(
    undefined,
  );
  const [inputValue, setInputValue] = useState("");

  // Date Range State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals Open State
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Form State
  const [targetUserId, setTargetUserId] = useState("");
  const [targetUserNickname, setTargetUserNickname] = useState("");
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const walletItems = useMemo<RewardItem[]>(() => getWalletRewardItems(), []);
  const walletItemValues = useMemo(
    () => new Set(walletItems.map((item) => item.value)),
    [walletItems],
  );
  const defaultWalletItem = walletItems[0]?.value || "ROULETTE_TICKET";

  const [itemType, setItemType] = useState(defaultWalletItem);
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState("인벤토리 보상");
  const [expiresAt, setExpiresAt] = useState("");

  // Selected Log for Edit/Delete
  const [selectedLog, setSelectedLog] = useState<TicketLogDto | null>(null);

  // Hooks
  const {
    data: logs = [],
    isLoading,
    refetch,
  } = useAdminTicketLogs(searchUserId, startDate, endDate);

  const createTicketMutation = useCreateTicket();
  const updateTicketMutation = useUpdateTicket();
  const deleteTicketMutation = useDeleteTicket();

  // Filter logs to show only wallet items
  const ticketLogs = useMemo(() => {
    return logs.filter((log) => walletItemValues.has(log.itemType));
  }, [logs, walletItemValues]);

  // Stats based on filtered ticket logs
  const stats = useMemo(() => {
    const totalIssued = ticketLogs.filter((l) => l.type === "GRANT").length;
    const totalUsed = ticketLogs.filter((l) => l.type === "USE").length;
    const totalRevoked = ticketLogs.filter((l) => l.type === "REVOKE").length;
    return {
      totalCount: ticketLogs.length,
      totalIssued,
      totalUsed,
      totalRevoked,
    };
  }, [ticketLogs]);

  const handleUserSearch = async (val: string) => {
    setInputValue(val);
    const normalized = normalizeSearchValue(val);
    if (!normalized) {
      setSearchUserId(undefined);
      return;
    }

    const numericId = parseInt(normalized);
    if (!isNaN(numericId) && /^\d+$/.test(normalized)) {
      setSearchUserId(numericId);
      return;
    }

    setSearchUserId(undefined);
  };

  const resolveUserId = async (value: string) => {
    const normalized = normalizeSearchValue(value);
    if (!normalized) {
      return undefined;
    }

    const numericId = parseInt(normalized);
    if (!isNaN(numericId) && /^\d+$/.test(normalized)) {
      return numericId;
    }

    const response = await getAdminUserList({ search: normalized, limit: 1 });
    if (response.users && response.users.length > 0) {
      return response.users[0].id;
    }
    return undefined;
  };

  const handleSearchCommit = async () => {
    const normalized = normalizeSearchValue(inputValue);
    if (!normalized) {
      setSearchUserId(undefined);
      return;
    }

    try {
      const resolved = await resolveUserId(normalized);
      if (resolved) {
        setSearchUserId(resolved);
        return;
      }
      alert("해당 닉네임/ID의 유저를 찾을 수 없습니다.");
      setSearchUserId(undefined);
    } catch (error) {
      console.error("User search failed", error);
      alert("유저 검색 중 오류가 발생했습니다.");
    }
  };

  const lookupUserInForm = async () => {
    const normalized = normalizeSearchValue(targetUserId);
    if (!normalized) return;
    setIsSearchingUser(true);
    try {
      const resolved = await resolveUserId(normalized);
      if (!resolved) {
        setTargetUserNickname("유저를 찾을 수 없음");
        return;
      }
      const response = await getAdminUserList({
        search: String(resolved),
        limit: 1,
      });
      if (response.users && response.users.length > 0) {
        setTargetUserNickname(response.users[0].nickname || "");
      } else {
        setTargetUserNickname("유저를 찾을 수 없음");
      }
    } catch {
      setTargetUserNickname("검색 오류");
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleCreate = async () => {
    const uid = await resolveUserId(targetUserId);
    const amt = parseInt(amount);
    if (!uid || isNaN(amt)) {
      alert("유저 ID/닉네임과 수량을 확인해주세요.");
      return;
    }

    createTicketMutation.mutate(
      {
        user_id: uid,
        ticket_type: itemType,
        amount: amt,
        reason,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          resetForm();
          refetch();
        },
      },
    );
  };

  const handleEdit = () => {
    if (!selectedLog) return;
    const amt = parseInt(amount);
    if (isNaN(amt)) return;

    updateTicketMutation.mutate(
      {
        id: selectedLog.id,
        data: { amount: amt, reason },
      },
      {
        onSuccess: () => {
          setEditOpen(false);
          resetForm();
          refetch();
        },
      },
    );
  };

  const handleDelete = () => {
    if (!selectedLog) return;

    deleteTicketMutation.mutate(selectedLog.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        setSelectedLog(null);
        refetch();
      },
    });
  };

  const resetForm = () => {
    setTargetUserId("");
    setTargetUserNickname("");
    setItemType(defaultWalletItem);
    setAmount("1");
    setReason("인벤토리 보상");
    setExpiresAt("");
    setSelectedLog(null);
  };

  const openEditModal = (log: TicketLogDto) => {
    setSelectedLog(log);
    setAmount((log.amount ?? 0).toString());
    setReason(log.reason);
    setEditOpen(true);
  };

  const openDeleteModal = (log: TicketLogDto) => {
    setSelectedLog(log);
    setDeleteOpen(true);
  };

  return (
    <div className="space-y-6 text-white p-6 h-full overflow-y-auto bg-zinc-950/50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            티켓 관리 (Ticket Management)
          </h1>
          <p className="text-sm text-zinc-400">
            유저 티켓 지급/회수 로그를 관리하고 티켓을 지급합니다.
          </p>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setCreateOpen(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold shadow-[0_0_20px_rgba(16,185,129,0.2)]"
        >
          <Plus className="w-4 h-4 mr-2" />
          티켓 지급 (Issue)
        </Button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#18181B] border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Ticket className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400">
              티켓 로그
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {stats.totalCount.toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              전체 티켓 거래 기록
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#18181B] border-white/5 relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400 flex justify-between items-center">
              지�?건수 (Issued)
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-500 border-none scale-75"
              >
                Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.totalIssued.toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              전체 기간 누적 지급
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#18181B] border-white/5 relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400">
              사용 건수 (Used)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-300">
              {stats.totalUsed.toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">?��?가 ?�모??건수</p>
            <p className="text-[10px] text-zinc-500 mt-1">
              사용자가 소모한 건수
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#18181B] border-white/5 relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400">
              회수 건수 (Revoked)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {stats.totalRevoked.toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">관리자 회수 건수</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end bg-black/20 p-4 rounded-xl border border-white/5">
        <div className="w-full max-w-sm space-y-2">
          <label className="text-xs text-zinc-400 font-medium ml-1">
            로그 검색(닉네임)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="닉네임 또는 ID 입력"
              className="pl-9 bg-black/50 border-white/10 h-11 text-white ring-offset-zinc-950 focus-visible:ring-zinc-800"
              value={inputValue}
              onChange={(e) => handleUserSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchCommit()}
            />
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium ml-1">
              시작일
            </label>
            <Input
              type="date"
              className="bg-black/50 border-white/10 h-11 text-white w-[160px] color-scheme-dark"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <span className="text-zinc-600 pb-3">~</span>
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium ml-1">
              종료일
            </label>
            <Input
              type="date"
              className="bg-black/50 border-white/10 h-11 text-white w-[160px] color-scheme-dark"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={handleSearchCommit}
          className="h-11 px-8 font-semibold"
        >
          조회하기
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setSearchUserId(undefined);
            setInputValue("");
            setStartDate("");
            setEndDate("");
          }}
          className="h-11 w-11 text-zinc-500"
        >
          <History className="w-4 h-4" />
        </Button>
      </div>

      <Card className="bg-[#18181B] border-white/5 overflow-hidden">
        <CardHeader className="bg-white/[0.02]">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5 text-zinc-400" />
            티켓 로그 목록 (Ticket Logs)
          </CardTitle>
                              티켓을 불러오는 중입니다...
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-black/20">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="w-[180px]">시간</TableHead>
                <TableHead>사용자 닉네임</TableHead>
                <TableHead>구분</TableHead>
                <TableHead>티켓 종류</TableHead>
                                      검색된 티켓이 없습니다.
                <TableHead>잔액 (After)</TableHead>
                <TableHead className="max-w-[300px]">사유</TableHead>
                <TableHead className="text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2 text-zinc-500">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      로그를 불러오는 중입니다...
                    </div>
                  </TableCell>
                </TableRow>
              ) : ticketLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2 text-zinc-600">
                      <AlertCircle className="w-8 h-8" />
                      검색된 티켓 로그가 없습니다.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                ticketLogs.map((log: TicketLogDto) => (
                  <TableRow
                    key={log.id}
                    className="border-white/5 hover:bg-white/[0.04] transition-colors"
                  >
                    <TableCell className="text-zinc-500 text-xs font-mono">
                      {formatKst(log.timestamp)}
                    </TableCell>
                    <TableCell className="font-mono text-zinc-300">
                      {log.nickname || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-none px-2 py-0.5 font-bold text-[10px]",
                          log.type === "GRANT"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : log.type === "REVOKE"
                              ? "bg-red-500/10 text-red-500"
                              : log.type === "USE"
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-zinc-800 text-zinc-400",
                        )}
                      >
                        {log.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {getRewardItemLabel(log.itemType)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-bold",
                        log.type === "GRANT"
                          ? "text-emerald-400"
                          : "text-red-400",
                      )}
                    >
                      {log.type === "GRANT" ? "+" : "-"}
                      {(log.amount ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {(log.balanceAfter ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-zinc-500 max-w-[300px] truncate group border-l border-white/5 pl-4 ml-4">
                                                  관리 액션
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                                                    수정 (Edit)
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-white/10"
                          >
                            <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                          </Button>
                                                    삭제 (Delete)
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#18181B] border-white/10 text-white"
                        >
                          <DropdownMenuLabel className="text-zinc-500 text-xs">
                            관리 액션
                          </DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditModal(log)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            수정 (Edit)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem
                            onClick={() => openDeleteModal(log)}
                            className="text-red-400 focus:text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            삭제 (Delete)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CREATE MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white sm:max-w-[450px] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500" />
              티켓 지급
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              유저에게 티켓을 수동으로 지급합니다. 지급 즉시 반영됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userId" className="text-zinc-400">
                지급 대상 (User ID 또는 닉네임)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="userId"
                  placeholder="유저 ID 또는 닉네임 입력"
                  className="bg-black/50 border-white/10 text-white"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={lookupUserInForm}
                  disabled={isSearchingUser}
                >
                  {isSearchingUser ? "..." : "검색"}
                </Button>
              </div>
              {targetUserNickname && (
                <div className="text-[10px] text-emerald-500 font-medium ml-1">
                  검색 결과:{" "}
                  <span className="underline">{targetUserNickname}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">종류 (Type)</Label>
                <Select value={itemType} onValueChange={setItemType}>
                  <SelectTrigger className="bg-black/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-white/10 text-white">
                    {walletItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {getRewardItemLabel(item.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">수량 (Amount)</Label>
                <Input
                  type="number"
                  className="bg-black/50 border-white/10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">지급 사유 (Reason)</Label>
              <Input
                placeholder="사유를 입력하세요"
                className="bg-black/50 border-white/10"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">만료일 (Optional)</Label>
              <Input
                type="datetime-local"
                className="bg-black/50 border-white/10 color-scheme-dark"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createTicketMutation.isPending || !targetUserId}
              className="bg-emerald-500 text-black font-bold"
            >
              지급 실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-sky-500" />
              티켓 로그 수정
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              발행된 티켓의 로그 정보를 수정합니다. (실제 자산 변화는 발생하지
              않음)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-black/30 rounded border border-white/10 text-xs">
              <span className="text-zinc-500">
                ID: #{selectedLog?.id} | User: {selectedLog?.userId} | Type:{" "}
                {selectedLog?.itemType
                  ? getRewardItemLabel(selectedLog.itemType)
                  : "-"}
              </span>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">수량 수정</Label>
              <Input
                type="number"
                className="bg-black/50 border-white/10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">사유 수정</Label>
              <Input
                className="bg-black/50 border-white/10"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              취소
            </Button>
            <Button onClick={handleEdit} className="bg-sky-500 text-white">
              수정 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              로그 삭제 확인
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              이 로그를 정말로 삭제하시겠습니까? <br />
              <span className="text-red-400/80 font-bold">
                삭제 후 복구할 수 없습니다.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="text-sm p-3 bg-red-500/5 rounded border border-red-500/10">
              <div className="font-mono text-zinc-400 mb-1">LOG DETAIL</div>
              <div className="font-medium">
                #{selectedLog?.id} |{" "}
                {selectedLog?.itemType
                  ? getRewardItemLabel(selectedLog.itemType)
                  : "-"}{" "}
                ({selectedLog?.amount})
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {selectedLog?.reason}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              확인 후 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

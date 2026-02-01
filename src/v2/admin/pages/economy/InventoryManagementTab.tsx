import { useMemo, useState } from "react";
import {
  useAdminTicketLogs,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
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
  Package,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  getInventoryRewardItems,
  getRewardItemLabel,
  type RewardItem,
} from "../../../constants/rewardItems";

const formatKst = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
};

const normalizeSearchValue = (value: string) => value.trim();

export default function InventoryManagementTab() {
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
  const [itemType, setItemType] = useState("CHICKEN_GIFTICON_5000");
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState("인벤토리 보상");
  const [expiresAt, setExpiresAt] = useState("");

  // Selected Log for Edit/Delete
  const [selectedLog, setSelectedLog] = useState<TicketLogDto | null>(null);

  type SortKey =
    | "timestamp"
    | "nickname"
    | "type"
    | "itemType"
    | "amount"
    | "balanceAfter"
    | "reason"
    | "userId";
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey | null;
    direction: "asc" | "desc" | null;
  }>({ key: "timestamp", direction: "desc" });

  type DetailFilter = "ALL" | "GRANT" | "USE" | "REVOKE";
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailFilter, setDetailFilter] = useState<DetailFilter>("ALL");

  // Hooks
  const {
    data: logs = [],
    isLoading,
    refetch,
  } = useAdminTicketLogs(searchUserId, startDate, endDate);

  const createInventoryItemMutation = useCreateInventoryItem();
  const updateInventoryItemMutation = useUpdateInventoryItem();
  const deleteInventoryItemMutation = useDeleteInventoryItem();

  const inventoryItems = useMemo<RewardItem[]>(
    () => getInventoryRewardItems(),
    [],
  );
  const inventoryItemValues = useMemo(
    () => new Set(inventoryItems.map((item) => item.value)),
    [inventoryItems],
  );

  // Filter logs to show only inventory items
  const inventoryLogs = useMemo(() => {
    return logs.filter((log) => inventoryItemValues.has(log.itemType));
  }, [logs, inventoryItemValues]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: "asc" };
      }
      if (prev.direction === "asc") return { key, direction: "desc" };
      if (prev.direction === "desc") return { key: null, direction: null };
      return { key, direction: "asc" };
    });
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-zinc-600" />;
    }
    if (sortConfig.direction === "asc") {
      return <ArrowUp className="w-3.5 h-3.5 text-zinc-300" />;
    }
    if (sortConfig.direction === "desc") {
      return <ArrowDown className="w-3.5 h-3.5 text-zinc-300" />;
    }
    return <ArrowUpDown className="w-3.5 h-3.5 text-zinc-600" />;
  };

  const sortedInventoryLogs = useMemo(() => {
    const rows = [...inventoryLogs];
    if (!sortConfig.key || !sortConfig.direction) return rows;

    const dir = sortConfig.direction === "asc" ? 1 : -1;
    return rows.sort((a, b) => {
      const key = sortConfig.key;
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (key === "timestamp") {
        aVal = new Date(a.timestamp).getTime() || 0;
        bVal = new Date(b.timestamp).getTime() || 0;
      } else if (key === "nickname") {
        aVal = (a.nickname || "").toLowerCase();
        bVal = (b.nickname || "").toLowerCase();
      } else if (key === "userId") {
        aVal = a.userId ?? 0;
        bVal = b.userId ?? 0;
      } else if (key === "type") {
        aVal = a.type;
        bVal = b.type;
      } else if (key === "itemType") {
        aVal = a.itemType;
        bVal = b.itemType;
      } else if (key === "amount") {
        aVal = a.amount ?? 0;
        bVal = b.amount ?? 0;
      } else if (key === "balanceAfter") {
        aVal = a.balanceAfter ?? 0;
        bVal = b.balanceAfter ?? 0;
      } else if (key === "reason") {
        aVal = (a.reason || "").toLowerCase();
        bVal = (b.reason || "").toLowerCase();
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return aVal === bVal ? 0 : aVal < bVal ? -1 * dir : 1 * dir;
      }
      return String(aVal).localeCompare(String(bVal)) * dir;
    });
  }, [inventoryLogs, sortConfig]);

  const detailLogs = useMemo(() => {
    if (detailFilter === "ALL") return sortedInventoryLogs;
    return sortedInventoryLogs.filter((l) => l.type === detailFilter);
  }, [detailFilter, sortedInventoryLogs]);

  const openDetail = (filter: DetailFilter) => {
    setDetailFilter(filter);
    setDetailOpen(true);
  };

  // Stats based on filtered inventory logs
  const stats = useMemo(() => {
    const totalIssued = inventoryLogs.filter((l) => l.type === "GRANT").length;
    const totalUsed = inventoryLogs.filter((l) => l.type === "USE").length;
    const totalRevoked = inventoryLogs.filter(
      (l) => l.type === "REVOKE",
    ).length;
    return {
      totalCount: inventoryLogs.length,
      totalIssued,
      totalUsed,
      totalRevoked,
    };
  }, [inventoryLogs]);

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
    if (response.users && response.users.length > 0 && response.users[0]) {
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
      alert("유저를 찾을 수 없습니다.");
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
      if (response.users && response.users.length > 0 && response.users[0]) {
        const foundUser = response.users[0];
        setTargetUserNickname(foundUser.nickname || "");
        setTargetUserId(foundUser.id.toString());
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
      alert("유저 ID와 수량을 확인해주세요.");
      return;
    }

    createInventoryItemMutation.mutate(
      {
        user_id: uid,
        item_type: itemType,
        item_name: itemType,
        quantity: amt,
        reason,
        expires_at: expiresAt || null,
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

    updateInventoryItemMutation.mutate(
      {
        id: selectedLog.id,
        data: { quantity: amt, reason, expires_at: expiresAt || null },
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

    deleteInventoryItemMutation.mutate(selectedLog.id, {
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
    setItemType(inventoryItems[0]?.value || "CHICKEN_GIFTICON_5000");
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
            인벤토리 관리
          </h1>
          <p className="text-sm text-zinc-400">
            유저 아이템 로그를 확인하고 아이템을 지급/회수합니다.
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
          아이템 지급
        </Button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => openDetail("ALL")}
          className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 rounded-xl"
          title="상세 보기"
        >
          <Card className="bg-[#18181B] border-white/5 relative overflow-hidden group cursor-pointer hover:border-white/10 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Package className="w-16 h-16" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400">
                아이템 로그
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-400">
                {stats.totalCount.toLocaleString()}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                전체 아이템 트랜잭션 로그
              </p>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => openDetail("GRANT")}
          className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 rounded-xl"
          title="지급 상세 보기"
        >
          <Card className="bg-[#18181B] border-white/5 relative overflow-hidden cursor-pointer hover:border-white/10 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 flex justify-between items-center">
                지급 건수
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-500 border-none scale-75"
                >
                  활성
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats.totalIssued.toLocaleString()}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">누적 지급 건수</p>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => openDetail("USE")}
          className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 rounded-xl"
          title="사용 상세 보기"
        >
          <Card className="bg-[#18181B] border-white/5 relative overflow-hidden cursor-pointer hover:border-white/10 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400">
                사용 건수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-300">
                {stats.totalUsed.toLocaleString()}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">유저 사용 건수</p>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          onClick={() => openDetail("REVOKE")}
          className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 rounded-xl"
          title="회수 상세 보기"
        >
          <Card className="bg-[#18181B] border-white/5 relative overflow-hidden cursor-pointer hover:border-white/10 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400">
                회수 건수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                {stats.totalRevoked.toLocaleString()}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">관리자 회수 건수</p>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* DETAIL DIALOG */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white sm:max-w-[1000px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-zinc-400" />
              상세내역
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {detailFilter === "ALL"
                ? "전체 인벤토리 로그"
                : detailFilter === "GRANT"
                  ? "지급(GRANT) 로그"
                  : detailFilter === "USE"
                    ? "사용(USE) 로그"
                    : "회수(REVOKE) 로그"}
              <span className="ml-2 text-zinc-500">
                (총 {detailLogs.length.toLocaleString()}건)
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-white/10">
            <Table>
              <TableHeader className="bg-black/20 sticky top-0 z-10">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="w-[180px]">
                    <button
                      type="button"
                      onClick={() => handleSort("timestamp")}
                      className="inline-flex items-center gap-1 hover:text-white"
                    >
                      시간
                      {getSortIcon("timestamp")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort("nickname")}
                      className="inline-flex items-center gap-1 hover:text-white"
                    >
                      유저
                      {getSortIcon("nickname")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort("type")}
                      className="inline-flex items-center gap-1 hover:text-white"
                    >
                      유형
                      {getSortIcon("type")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort("itemType")}
                      className="inline-flex items-center gap-1 hover:text-white"
                    >
                      아이템
                      {getSortIcon("itemType")}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("amount")}
                      className="inline-flex items-center gap-1 hover:text-white"
                    >
                      수량
                      {getSortIcon("amount")}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      type="button"
                      onClick={() => handleSort("balanceAfter")}
                      className="inline-flex items-center gap-1 hover:text-white"
                    >
                      잔액(후)
                      {getSortIcon("balanceAfter")}
                    </button>
                  </TableHead>
                  <TableHead className="max-w-[360px]">
                    <button
                      type="button"
                      onClick={() => handleSort("reason")}
                      className="inline-flex items-center gap-1 hover:text-white"
                    >
                      사유
                      {getSortIcon("reason")}
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-16 text-zinc-500"
                    >
                      표시할 로그가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  detailLogs.map((log) => (
                    <TableRow
                      key={log.id}
                      className="border-white/5 hover:bg-white/[0.04] transition-colors"
                    >
                      <TableCell className="text-zinc-500 text-xs font-mono">
                        {formatKst(log.timestamp)}
                      </TableCell>
                      <TableCell className="font-mono text-zinc-300">
                        <div className="flex flex-col">
                          <span className="text-white font-bold">
                            {log.nickname || "-"}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            #{log.userId}
                          </span>
                        </div>
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
                          "font-bold text-right",
                          log.type === "GRANT"
                            ? "text-emerald-400"
                            : "text-red-400",
                        )}
                      >
                        {log.type === "GRANT" ? "+" : "-"}
                        {(log.amount ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-right font-mono text-xs">
                        {(log.balanceAfter ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-zinc-500 max-w-[360px] truncate">
                        {log.reason}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDetailOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row gap-4 items-end bg-black/20 p-4 rounded-xl border border-white/5">
        <div className="w-full max-w-sm space-y-2">
          <label className="text-xs text-zinc-400 font-medium ml-1">
            로그 검색(유저)
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
          검색
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
            인벤토리 로그 목록
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-black/20">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="w-[180px]">
                  <button
                    type="button"
                    onClick={() => handleSort("timestamp")}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    시간
                    {getSortIcon("timestamp")}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("nickname")}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    유저
                    {getSortIcon("nickname")}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("type")}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    유형
                    {getSortIcon("type")}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("itemType")}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    아이템
                    {getSortIcon("itemType")}
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("amount")}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    수량
                    {getSortIcon("amount")}
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("balanceAfter")}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    잔액(후)
                    {getSortIcon("balanceAfter")}
                  </button>
                </TableHead>
                <TableHead className="max-w-[300px]">
                  <button
                    type="button"
                    onClick={() => handleSort("reason")}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    사유
                    {getSortIcon("reason")}
                  </button>
                </TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2 text-zinc-500">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      로그 불러오는 중...
                    </div>
                  </TableCell>
                </TableRow>
              ) : inventoryLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2 text-zinc-600">
                      <AlertCircle className="w-8 h-8" />
                      인벤토리 로그가 없습니다.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedInventoryLogs.map((log: TicketLogDto) => (
                  <TableRow
                    key={log.id}
                    className="border-white/5 hover:bg-white/[0.04] transition-colors"
                  >
                    <TableCell className="text-zinc-500 text-xs font-mono">
                      {formatKst(log.timestamp)}
                    </TableCell>
                    <TableCell className="font-mono text-zinc-300">
                      <div className="flex flex-col">
                        <span className="text-white font-bold">
                          {log.nickname || "-"}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          #{log.userId}
                        </span>
                      </div>
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
                        "font-bold text-right",
                        log.type === "GRANT"
                          ? "text-emerald-400"
                          : "text-red-400",
                      )}
                    >
                      {log.type === "GRANT" ? "+" : "-"}
                      {(log.amount ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-zinc-400 text-right font-mono text-xs">
                      {(log.balanceAfter ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-zinc-500 max-w-[300px] truncate group border-l border-white/5 pl-4 ml-4">
                      {log.reason}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-white/10"
                          >
                            <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#18181B] border-white/10 text-white"
                        >
                          <DropdownMenuLabel className="text-zinc-500 text-xs">
                            작업 관리
                          </DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditModal(log)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem
                            onClick={() => openDeleteModal(log)}
                            className="text-red-400 focus:text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            삭제
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
              아이템 지급
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              유저에게 아이템을 수동으로 지급합니다. 즉시 반영됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userId" className="text-zinc-400">
                대상(유저 ID 또는 닉네임)
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
                  {isSearchingUser ? "조회중..." : "조회"}
                </Button>
              </div>
              {targetUserNickname && (
                <div className="text-[10px] text-emerald-500 font-medium ml-1">
                  조회 결과:{" "}
                  <span className="underline">{targetUserNickname}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">아이템</Label>
                <Select value={itemType} onValueChange={setItemType}>
                  <SelectTrigger className="bg-black/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-white/10 text-white max-h-[300px]">
                    {inventoryItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {getRewardItemLabel(item.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">수량</Label>
                <Input
                  type="number"
                  className="bg-black/50 border-white/10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">사유</Label>
              <Input
                placeholder="사유 입력"
                className="bg-black/50 border-white/10"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">만료일시(선택)</Label>
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
              disabled={createInventoryItemMutation.isPending || !targetUserId}
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
              아이템 로그 수정
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              지급 로그 정보를 수정합니다. (실제 자산에는 영향 없음)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-black/30 rounded border border-white/10 text-xs">
              <span className="text-zinc-500">
                ID: #{selectedLog?.id} | 유저: {selectedLog?.userId} | 아이템:{" "}
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
            <div className="space-y-2">
              <Label className="text-zinc-400">만료일시 수정(선택)</Label>
              <Input
                type="datetime-local"
                className="bg-black/50 border-white/10 color-scheme-dark"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
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
              이 로그를 삭제하시겠습니까? <br />
              <span className="text-red-400/80 font-bold">
                이 작업은 로그를 시스템 기록에서 영구 삭제합니다.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="text-sm p-3 bg-red-500/5 rounded border border-red-500/10">
              <div className="font-mono text-zinc-400 mb-1">로그 상세</div>
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
              삭제 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

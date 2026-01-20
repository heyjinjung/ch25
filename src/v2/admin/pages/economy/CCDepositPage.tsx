import { useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  User as UserIcon,
  AlertCircle,
  RefreshCw,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  useAdminDepositLogs,
  useCreateDepositLog,
  useUpdateDepositLog,
  useDeleteDepositLog,
  useAdminUserList,
} from "../../../hooks/useV2Admin";
import type {
  AdminDepositLogDto,
  AdminUserListDto,
} from "../../../api/adminApi";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { cn } from "../../../lib/utils";
import { format } from "date-fns";

export default function CCDepositPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const {
    data: logs = [],
    isLoading,
    refetch,
  } = useAdminDepositLogs(searchTerm);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{
    key: keyof AdminDepositLogDto | null;
    direction: "asc" | "desc" | null;
  }>({ key: null, direction: null });

  const handleSort = (key: keyof AdminDepositLogDto) => {
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") direction = "desc";
      else if (sortConfig.direction === "desc") direction = null;
    }
    setSortConfig({ key: direction ? key : null, direction });
  };

  // Group logs by userId and aggregate
  const sortedLogs = [...logs].sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;

    let aVal: any;
    let bVal: any;

    // Map sortConfig.key to logs data
    if (sortConfig.key === "id") {
      aVal = a.id;
      bVal = b.id;
    } else if (sortConfig.key === "nickname") {
      aVal = a.nickname;
      bVal = b.nickname;
    } else if (sortConfig.key === "amount") {
      aVal = a.amount;
      bVal = b.amount;
    } else if (sortConfig.key === "kstDate") {
      aVal = a.kstDate;
      bVal = b.kstDate;
    } else if (sortConfig.key === "createdAt") {
      aVal = a.createdAt;
      bVal = b.createdAt;
    } else {
      return 0;
    }

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const getSortIcon = (key: keyof AdminDepositLogDto) => {
    if (sortConfig.key !== key)
      return <ChevronsUpDown className="w-3 h-3 ml-1 text-zinc-600" />;
    if (sortConfig.direction === "asc")
      return <ChevronUp className="w-3 h-3 ml-1 text-indigo-400" />;
    return <ChevronDown className="w-3 h-3 ml-1 text-indigo-400" />;
  };

  const formatKstDateTime = (value?: string) => {
    if (!value) return "-";
    const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
    if (match) return `${match[1]} ${match[2]}`;
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "-";
    return format(dt, "yyyy-MM-dd HH:mm");
  };

  const createMutation = useCreateDepositLog();
  const updateMutation = useUpdateDepositLog();
  const deleteMutation = useDeleteDepositLog();

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<AdminDepositLogDto | null>(null);

  // Create / Edit Form State
  const [formUserId, setFormUserId] = useState<number | null>(null);
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUserListDto | null>(
    null,
  );

  const { data: userSearchResults } = useAdminUserList({
    search: userSearchTerm,
    limit: 5,
  });

  const handleAddClick = () => {
    setFormUserId(null);
    setSelectedUser(null);
    setFormAmount("");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setUserSearchTerm("");
    setIsAddModalOpen(true);
  };

  const handleEditClick = (log: AdminDepositLogDto) => {
    setEditingLog(log);
    setFormAmount(log.amount.toString());
    setFormDate(log.kstDate);
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (!formUserId || !formAmount) return;
    await createMutation.mutateAsync({
      user_id: formUserId,
      amount: parseInt(formAmount),
      kst_date: formDate,
    });
    setIsAddModalOpen(false);
  };

  const handleUpdateSubmit = async () => {
    if (!editingLog || !formAmount) return;
    await updateMutation.mutateAsync({
      id: editingLog.id,
      data: {
        amount: parseInt(formAmount),
        kst_date: formDate,
      },
    });
    setIsEditModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (
      confirm(
        "정말 이 입금 내역을 삭제하시겠습니까? 전체 누적액에서도 차감됩니다.",
      )
    ) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleSelectUser = (user: AdminUserListDto) => {
    setSelectedUser(user);
    setFormUserId(user.id);
    setUserSearchTerm("");
  };

  return (
    <div className="space-y-6 h-full p-6 text-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-3">
            <UserIcon className="w-8 h-8 text-indigo-400" />
            CC 입금 관리
          </h1>
          <p className="text-sm text-zinc-400">
            수동으로 입금 내역을 생성하거나, 잘못 기입된 내역을 수정/삭제합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-white/10 hover:bg-white/5"
            onClick={() => refetch()}
          >
            <RefreshCw
              className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")}
            />
            새로고침
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            onClick={handleAddClick}
          >
            <Plus className="w-4 h-4" />새 행 추가
          </Button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="닉네임으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-zinc-900/50 border-white/10"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="rounded-xl border border-white/5 bg-[#18181B] overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead
                className="text-zinc-400 w-[80px] cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("id")}
              >
                <div className="flex items-center">
                  ID {getSortIcon("id")}
                </div>
              </TableHead>
              <TableHead
                className="text-zinc-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("nickname")}
              >
                <div className="flex items-center">
                  유저 {getSortIcon("nickname")}
                </div>
              </TableHead>
              <TableHead
                className="text-zinc-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("amount")}
              >
                <div className="flex items-center">
                  금액 (KRW) {getSortIcon("amount")}
                </div>
              </TableHead>
              <TableHead
                className="text-zinc-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("kstDate")}
              >
                <div className="flex items-center">
                  입금 날짜 (KST) {getSortIcon("kstDate")}
                </div>
              </TableHead>
              <TableHead
                className="text-zinc-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("createdAt")}
              >
                <div className="flex items-center">
                  작업일시 {getSortIcon("createdAt")}
                </div>
              </TableHead>
              <TableHead className="text-zinc-400 w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLogs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-20 text-zinc-500"
                >
                  {isLoading ? "불러오는 중..." : "입금 내역이 없습니다."}
                </TableCell>
              </TableRow>
            ) : (
              sortedLogs.map((log) => (
                <TableRow
                  key={log.id}
                  className="border-white/5 hover:bg-white/5 transition-colors"
                >
                  <TableCell className="font-mono text-zinc-500">
                    #{log.id}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-white">
                        {log.nickname || "(미설정)"}
                      </span>
                      <span className="text-xs text-zinc-500">
                        UID: {log.userId}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-lg text-emerald-400 font-mono">
                    ₩ {log.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Calendar className="w-4 h-4 text-zinc-500" />
                      {log.kstDate}
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-500 text-xs">
                    {formatKstDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-white/10"
                        >
                          <MoreVertical className="h-4 w-4 text-zinc-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-[#1C1C1F] border-white/10 text-white"
                      >
                        <DropdownMenuItem
                          className="gap-2 focus:bg-zinc-800 focus:text-white"
                          onClick={() => handleEditClick(log)}
                        >
                          <Edit2 className="w-4 h-4 text-blue-400" />
                          편집
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 focus:bg-red-500/20 focus:text-red-400 text-red-400"
                          onClick={() => handleDelete(log.id)}
                        >
                          <Trash2 className="w-4 h-4" />
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
      </div>

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>새 입금 로그 추가</DialogTitle>
            <DialogDescription className="text-zinc-400">
              특정 유저의 일자별 입금액을 추가합니다. 랭킹에 즉시 반영됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>유저 검색</Label>
              {selectedUser ? (
                <div className="flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-md p-2">
                  <span className="text-white">
                    {selectedUser.nickname}{" "}
                    <span className="text-zinc-500 text-xs">
                      #{selectedUser.id}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(null);
                      setFormUserId(null);
                    }}
                    className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="닉네임 검색..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="bg-black/40 border-white/10"
                  />
                  {userSearchTerm &&
                    userSearchResults?.users &&
                    userSearchResults.users.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#27272A] border border-zinc-700 rounded-md shadow-xl z-50 max-h-40 overflow-y-auto">
                        {userSearchResults.users.map((u) => (
                          <div
                            key={u.id}
                            className="px-3 py-2 text-sm hover:bg-indigo-600 cursor-pointer flex justify-between"
                            onClick={() => handleSelectUser(u)}
                          >
                            <span>{u.nickname}</span>
                            <span className="text-zinc-500 text-xs">
                              #{u.id}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>금액 (KRW)</Label>
                <Input
                  type="number"
                  placeholder="금액 입력"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="bg-black/40 border-white/10 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>입금 날짜</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="bg-black/40 border-white/10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              취소
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleCreateSubmit}
              disabled={!formUserId || !formAmount || createMutation.isPending}
            >
              {createMutation.isPending ? "추가 중..." : "행 추가 완료"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>입금 로그 편집</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editingLog?.nickname} (#{editingLog?.userId})의 내역을
              수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>금액 (KRW)</Label>
                <Input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="bg-black/40 border-white/10 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>입금 날짜</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="bg-black/40 border-white/10"
                />
              </div>
            </div>
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3 text-xs text-red-200">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>
                날짜를 수정하면 해당 날짜의 랭킹 데이터로 이동하며, 기존 날짜의
                데이터는 재계산됩니다.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              취소
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleUpdateSubmit}
              disabled={!formAmount || updateMutation.isPending}
            >
              {updateMutation.isPending ? "저장 중..." : "수정사항 저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

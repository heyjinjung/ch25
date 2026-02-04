import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { cn } from "../../../lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Mail,
  Ban,
} from "lucide-react";
import { UserDetailDrawer } from "./UserDetailDrawer";
import {
  useAdminUserList,
  useCreateAdminUser,
  useUpdateUserSegment,
} from "../../../hooks/useV2Admin";
import { AdminUserListDto, UserSearchParams } from "../../../api/adminApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

// Simple Checkbox component (temporary)
const Checkbox = ({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean;
  onCheckedChange: () => void;
  className?: string;
}) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={onCheckedChange}
    className={cn(
      "w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500",
      className,
    )}
  />
);

// 세그먼트 설정
const SEGMENTS = [
  {
    value: "NEW",
    label: "신규",
    color: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  },
  {
    value: "COMMON",
    label: "일반",
    color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  },
  {
    value: "VIP",
    label: "VIP",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  {
    value: "WHALE",
    label: "고액",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  {
    value: "WINNER",
    label: "승자",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  {
    value: "AT_RISK",
    label: "이탈위험",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
];

const getSegmentStyle = (segment: string | null) => {
  const found = SEGMENTS.find((s) => s.value === segment);
  return found || SEGMENTS[1]; // default COMMON
};

export default function UserListPage({
  initialUserId,
  initialDrawerTab,
}: {
  initialUserId?: number | null;
  initialDrawerTab?: string | null;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedDrawerTab, setSelectedDrawerTab] =
    useState<string>("overview");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createCcId, setCreateCcId] = useState("");
  const [createNickname, setCreateNickname] = useState("");
  const [createTelegramId, setCreateTelegramId] = useState("");
  const [createTelegramUsername, setCreateTelegramUsername] = useState("");
  const [createLevel, setCreateLevel] = useState("1");
  const [createStatus, setCreateStatus] = useState<
    "ACTIVE" | "INACTIVE" | "SUSPENDED"
  >("ACTIVE");

  useEffect(() => {
    if (!initialUserId) return;
    setSelectedUserId(initialUserId);
    setSelectedDrawerTab(initialDrawerTab || "wallet");
  }, [initialDrawerTab, initialUserId]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [minLevel, setMinLevel] = useState<string>("");
  const [maxLevel, setMaxLevel] = useState<string>("");
  const [sortBy, setSortBy] = useState<
    | "last_active"
    | "level"
    | "vault_balance"
    | "created_at"
    | "uid"
    | "nickname"
    | "telegram_id"
  >("last_active");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Build search params
  const searchParams: UserSearchParams = {
    search: searchTerm || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    minLevel: minLevel ? parseInt(minLevel) : undefined,
    maxLevel: maxLevel ? parseInt(maxLevel) : undefined,
    sortBy,
    sortOrder,
    page,
    limit,
  };

  const { data: userListData, isLoading } = useAdminUserList(searchParams);
  const createUserMutation = useCreateAdminUser();
  const updateSegmentMutation = useUpdateUserSegment();
  const users = userListData?.users || [];
  const total = userListData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // 세그먼트 변경 핸들러
  const handleSegmentChange = (userId: number, newSegment: string) => {
    updateSegmentMutation.mutate({
      userId,
      request: { segment: newSegment },
    });
  };

  const handleSort = (
    field:
      | "last_active"
      | "level"
      | "vault_balance"
      | "created_at"
      | "uid"
      | "nickname"
      | "telegram_id",
  ) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map((u) => u.id));
    }
  };

  const toggleSelectUser = (userId: number) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleCreateUser = async () => {
    const ccId = createCcId.trim();
    if (!ccId) return;

    const level = Number.parseInt(createLevel, 10);
    const telegramId = Number.parseInt(createTelegramId, 10);

    await createUserMutation.mutateAsync({
      ccId,
      nickname: createNickname.trim() || undefined,
      level: Number.isFinite(level) ? level : undefined,
      status: createStatus,
      telegramId: Number.isFinite(telegramId) ? telegramId : undefined,
      telegramUsername: createTelegramUsername.trim() || undefined,
    });

    setIsCreateOpen(false);
    setCreateCcId("");
    setCreateNickname("");
    setCreateTelegramId("");
    setCreateTelegramUsername("");
    setCreateLevel("1");
    setCreateStatus("ACTIVE");
  };

  return (
    <div className="space-y-6 h-full text-[#E4E4E7]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            회원 관리
          </h1>
          <p className="text-sm text-zinc-400">
            총 {total.toLocaleString()}명의 회원을 관리하고 상세 정보를
            조회합니다.
          </p>
        </div>
        <Button
          className="bg-[#D2FD9C] text-black hover:bg-[#D2FD9C]/90 font-bold"
          onClick={() => setIsCreateOpen(true)}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          회원 등록
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-[#18181B] p-4 rounded-xl border border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="닉네임, CC ID, Telegram ID, Telegram Username 검색..."
            className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-200 focus:ring-[#D2FD9C]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 gap-2"
            >
              <Filter className="h-4 w-4" />
              필터
              {(statusFilter || minLevel || maxLevel) && (
                <Badge className="ml-1 h-5 px-1.5 bg-[#D2FD9C] text-black">
                  {[statusFilter, minLevel, maxLevel].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-[#18181B] border-white/10 text-white">
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">상태</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="ALL">전체</SelectItem>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                    <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">
                  레벨 범위
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    className="bg-zinc-900 border-zinc-800"
                    value={minLevel}
                    onChange={(e) => setMinLevel(e.target.value)}
                  />
                  <span className="text-zinc-500">~</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    className="bg-zinc-900 border-zinc-800"
                    value={maxLevel}
                    onChange={(e) => setMaxLevel(e.target.value)}
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setStatusFilter("");
                  setMinLevel("");
                  setMaxLevel("");
                }}
              >
                필터 초기화
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Batch Actions */}
        {selectedUserIds.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <span className="text-sm text-indigo-400 font-medium">
              {selectedUserIds.length}개 선택
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-zinc-300 hover:text-white"
            >
              <Mail className="w-3 h-3 mr-1" />
              메시지
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-red-400 hover:text-red-300"
            >
              <Ban className="w-3 h-3 mr-1" />
              차단
            </Button>
          </div>
        )}
      </div>

      {/* Compact Table */}
      <div className="rounded-xl border border-white/5 bg-[#18181B] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-zinc-500">
            Loading...
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={
                      users.length > 0 &&
                      selectedUserIds.length === users.length
                    }
                    onCheckedChange={toggleSelectAll}
                    className="border-zinc-600"
                  />
                </TableHead>
                <TableHead className="w-[100px] text-zinc-400">
                  <button
                    className="flex items-center gap-1 hover:text-white transition-colors"
                    onClick={() => handleSort("uid")}
                  >
                    UID
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-zinc-400">
                  <button
                    className="flex items-center gap-1 hover:text-white transition-colors"
                    onClick={() => handleSort("nickname")}
                  >
                    닉네임
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-zinc-400">
                  <button
                    className="flex items-center gap-1 hover:text-white transition-colors"
                    onClick={() => handleSort("telegram_id")}
                  >
                    텔레그램 ID
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-zinc-400">
                  <button
                    className="flex items-center gap-1 hover:text-white transition-colors"
                    onClick={() => handleSort("level")}
                  >
                    레벨
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-zinc-400 w-[110px]">
                  세그먼트
                </TableHead>
                <TableHead className="text-zinc-400">
                  <button
                    className="flex items-center gap-1 hover:text-white transition-colors"
                    onClick={() => handleSort("vault_balance")}
                  >
                    금고 잔액
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-zinc-400">
                  <button
                    className="flex items-center gap-1 hover:text-white transition-colors"
                    onClick={() => handleSort("last_active")}
                  >
                    최근 접속일
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
                <TableHead className="text-center text-zinc-400 w-[80px]">
                  관리
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: AdminUserListDto) => (
                <TableRow
                  key={user.id}
                  className="border-zinc-800 hover:bg-white/5 transition-colors"
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedUserIds.includes(user.id)}
                      onCheckedChange={() => toggleSelectUser(user.id)}
                      className="border-zinc-600"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-zinc-400">
                    #{user.cc_id}
                  </TableCell>
                  <TableCell className="font-medium text-white">
                    {user.nickname || "(미설정)"}
                  </TableCell>
                  <TableCell className="text-zinc-400 text-xs">
                    {user.telegram_username ? (
                      <span className="font-mono">
                        @{user.telegram_username}
                      </span>
                    ) : user.telegram_id ? (
                      <span className="font-mono">{user.telegram_id}</span>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    Lv.{user.level}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.segment || "COMMON"}
                      onValueChange={(value) =>
                        handleSegmentChange(user.id, value)
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "h-7 w-[100px] text-xs border",
                          getSegmentStyle(user.segment)?.color ||
                            "bg-zinc-500/20 text-zinc-400",
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {SEGMENTS.map((seg) => (
                          <SelectItem
                            key={seg.value}
                            value={seg.value}
                            className={cn(
                              "text-xs",
                              seg.color?.split(" ")[1] || "",
                            )}
                          >
                            {seg.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-zinc-300">
                    ₩{(user.vaultBalance || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-zinc-400 text-xs">
                    {user.last_active}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 font-normal hover:font-bold transition-all"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setSelectedDrawerTab("overview");
                      }}
                    >
                      관리
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#18181B] rounded-xl border border-white/5">
        <div className="text-sm text-zinc-400">
          {(page - 1) * limit + 1}~{Math.min(page * limit, total)} / 총 {total}
          명
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <span className="text-sm text-zinc-400">
            {page} / {totalPages} 페이지
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <UserDetailDrawer
        isOpen={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
        userId={selectedUserId}
        defaultTab={selectedDrawerTab}
      />

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-[#121214] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">회원 등록</DialogTitle>
            <DialogDescription className="text-zinc-400">
              CC ID는 필수입니다. 나머지는 선택 입력입니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-zinc-300">CC ID</label>
              <Input
                value={createCcId}
                onChange={(e) => setCreateCcId(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-zinc-200"
                placeholder="예: cc_123"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-300">닉네임</label>
              <Input
                value={createNickname}
                onChange={(e) => setCreateNickname(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-zinc-200"
                placeholder="예: 홍길동"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-zinc-300">레벨</label>
                <Input
                  type="number"
                  value={createLevel}
                  onChange={(e) => setCreateLevel(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-zinc-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-300">상태</label>
                <Select
                  value={createStatus}
                  onValueChange={(v) =>
                    setCreateStatus(v as "ACTIVE" | "INACTIVE" | "SUSPENDED")
                  }
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                    <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-zinc-300">telegram_id</label>
                <Input
                  type="number"
                  value={createTelegramId}
                  onChange={(e) => setCreateTelegramId(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-zinc-200"
                  placeholder="선택"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-300">
                  telegram_username
                </label>
                <Input
                  value={createTelegramUsername}
                  onChange={(e) => setCreateTelegramUsername(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-zinc-200"
                  placeholder="@username"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-300"
              onClick={() => setIsCreateOpen(false)}
              disabled={createUserMutation.isPending}
            >
              취소
            </Button>
            <Button
              className="bg-[#D2FD9C] text-black hover:bg-[#D2FD9C]/90 font-bold"
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending || !createCcId.trim()}
            >
              {createUserMutation.isPending ? "등록 중.." : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
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
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Mail,
  Ban,
  Wallet,
  Package,
  Shield,
  MessageSquare,
  History,
} from "lucide-react";
import { UserDetailDrawer } from "./UserDetailDrawer";
import { useAdminUserList } from "../../../hooks/useV2Admin";
import { AdminUserListDto, UserSearchParams } from "../../../api/adminApi";

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

export default function UserListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedDrawerTab, setSelectedDrawerTab] = useState<string>("overview");

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [minLevel, setMinLevel] = useState<string>("");
  const [maxLevel, setMaxLevel] = useState<string>("");
  const [sortBy, setSortBy] = useState<
    "last_active" | "level" | "vault_balance" | "created_at"
  >("last_active");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Build search params
  const searchParams: UserSearchParams = {
    search: searchTerm || undefined,
    status: statusFilter || undefined,
    minLevel: minLevel ? parseInt(minLevel) : undefined,
    maxLevel: maxLevel ? parseInt(maxLevel) : undefined,
    sortBy,
    sortOrder,
    page,
    limit,
  };

  const { data: userListData, isLoading } = useAdminUserList(searchParams);
  const users = userListData?.users || [];
  const total = userListData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const handleSort = (
    field: "last_active" | "level" | "vault_balance" | "created_at",
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

  return (
    <div className="space-y-6 h-full text-[#E4E4E7]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            회원 관리
          </h1>
          <p className="text-sm text-zinc-400">
            총 {total.toLocaleString()}명의 회원을 관리하고 상세 정보를 조회합니다.
          </p>
        </div>
        <Button className="bg-[#D2FD9C] text-black hover:bg-[#D2FD9C]/90 font-bold">
          <UserPlus className="w-4 h-4 mr-2" />
          회원 등록
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-[#18181B] p-4 rounded-xl border border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="닉네임, CC_id, telegram_id, telegram_username 검색..."
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
                <label className="text-sm text-zinc-400 mb-2 block">
                  상태
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="">전체</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
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
              {selectedUserIds.length}명 선택
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
              정지
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
                <TableHead className="w-[100px] text-zinc-400">UID</TableHead>
                <TableHead className="text-zinc-400">닉네임</TableHead>
                <TableHead className="text-zinc-400">텔레그램 ID</TableHead>
                <TableHead className="text-zinc-400">
                  <button
                    className="flex items-center gap-1 hover:text-white transition-colors"
                    onClick={() => handleSort("level")}
                  >
                    레벨
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
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
                <TableHead className="text-center text-zinc-400">관리</TableHead>
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
                  <TableCell className="text-zinc-300">
                    ₩{user.vaultBalance.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-zinc-400 text-xs">
                    {user.last_active}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800"
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setSelectedDrawerTab("overview");
                        }}
                        title="상세 정보"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-indigo-400 hover:text-white hover:bg-zinc-800"
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setSelectedDrawerTab("wallet");
                        }}
                        title="지갑 관리"
                      >
                        <Wallet className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-emerald-400 hover:text-white hover:bg-zinc-800"
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setSelectedDrawerTab("vault");
                        }}
                        title="금고 관리"
                      >
                        <Wallet className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-purple-400 hover:text-white hover:bg-zinc-800"
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setSelectedDrawerTab("inventory");
                        }}
                        title="인벤토리"
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-400 hover:text-white hover:bg-zinc-800"
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setSelectedDrawerTab("logs");
                        }}
                        title="활동 로그"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-400 hover:text-white hover:bg-zinc-800"
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setSelectedDrawerTab("notes");
                        }}
                        title="상담/메모"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-white hover:bg-zinc-800"
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setSelectedDrawerTab("overview");
                        }}
                        title="제재 관리"
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                    </div>
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
          {(page - 1) * limit + 1}~{Math.min(page * limit, total)} / 총{" "}
          {total}개
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
    </div>
  );
}

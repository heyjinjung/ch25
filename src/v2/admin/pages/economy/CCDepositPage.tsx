import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Trash2,
  Calendar,
  User as UserIcon,
  RefreshCw,
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
} from "../../../hooks/useV2Admin";
import { getAdminUserList } from "../../../api/adminApi";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../../../components/ui/table";
import { cn } from "../../../lib/utils";
import { format } from "date-fns";

type EditableRow = {
  id?: number;
  userId?: number;
  nickname?: string | null;
  amount: number;
  kstDate: string;
  createdAt?: string;
  userQuery: string;
  __key: string;
  __isNew?: boolean;
  __dirty?: boolean;
};

type SortKey = "nickname" | "amount" | "kstDate" | "createdAt";

type ResolveRowStatus =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; user: { id: number; nickname: string | null } }
  | { state: "error"; message: string };

const newRowKey = () =>
  `new:${Date.now()}:${Math.random().toString(16).slice(2)}`;

export default function CCDepositPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const {
    data: logs = [],
    isLoading,
    refetch,
  } = useAdminDepositLogs(searchTerm);

  const [rows, setRows] = useState<EditableRow[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [resolveStatusByKey, setResolveStatusByKey] = useState<
    Record<string, ResolveRowStatus>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey | null;
    direction: "asc" | "desc" | null;
  }>({ key: null, direction: null });

  const handleSort = (key: SortKey) => {
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") direction = "desc";
      else if (sortConfig.direction === "desc") direction = null;
    }
    setSortConfig({ key: direction ? key : null, direction });
  };

  useEffect(() => {
    const mapped: EditableRow[] = logs.map((log) => ({
      __key: `id:${log.id}`,
      id: log.id,
      userId: log.userId,
      nickname: log.nickname ?? null,
      amount: log.amount,
      kstDate: log.kstDate,
      createdAt: log.createdAt,
      userQuery: log.nickname ?? String(log.userId ?? ""),
      __isNew: false,
      __dirty: false,
    }));
    setRows(mapped);
    setIsDirty(false);
    setDeletedIds([]);
    const initialResolve: Record<string, ResolveRowStatus> = {};
    for (const row of mapped) {
      initialResolve[row.__key] = row.userId
        ? {
            state: "ok",
            user: { id: row.userId, nickname: row.nickname ?? null },
          }
        : { state: "idle" };
    }
    setResolveStatusByKey(initialResolve);
  }, [logs]);

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;

    let aVal: any;
    let bVal: any;

    // Map sortConfig.key to logs data
    if (sortConfig.key === "nickname") {
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

  const getSortIcon = (key: SortKey) => {
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

  const handleRowChange = (
    key: string,
    field: keyof EditableRow,
    value: string | number,
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.__key === key
          ? {
              ...row,
              [field]:
                field === "amount"
                  ? Number(value)
                  : field === "userQuery"
                    ? String(value)
                    : value,
              __dirty: true,
            }
          : row,
      ),
    );
    setIsDirty(true);
    if (field === "userQuery") {
      setRows((prev) =>
        prev.map((row) =>
          row.__key === key
            ? { ...row, userId: undefined, nickname: null, __dirty: true }
            : row,
        ),
      );
      setResolveStatusByKey((prev) => ({ ...prev, [key]: { state: "idle" } }));
    }
  };

  const addRow = () => {
    const key = newRowKey();
    setRows((prev) => [
      {
        __key: key,
        amount: 0,
        kstDate: format(new Date(), "yyyy-MM-dd"),
        userQuery: "",
        __isNew: true,
        __dirty: true,
      },
      ...prev,
    ]);
    setIsDirty(true);
    setResolveStatusByKey((prev) => ({ ...prev, [key]: { state: "idle" } }));
  };

  const removeRow = (row: EditableRow) => {
    if (row.id) {
      setDeletedIds((prev) => [...prev, row.id!]);
    }
    setRows((prev) => prev.filter((r) => r.__key !== row.__key));
    setIsDirty(true);
  };

  const resolveRowUser = async (row: EditableRow) => {
    const query = String(row.userQuery ?? "").trim();
    if (!query) {
      setResolveStatusByKey((prev) => ({
        ...prev,
        [row.__key]: { state: "idle" },
      }));
      return;
    }

    setResolveStatusByKey((prev) => ({
      ...prev,
      [row.__key]: { state: "loading" },
    }));
    try {
      const response = await getAdminUserList({ search: query, limit: 1 });
      if (response.users && response.users.length > 0 && response.users[0]) {
        const user = response.users[0];
        setRows((prev) =>
          prev.map((r) =>
            r.__key === row.__key
              ? {
                  ...r,
                  userId: user.id,
                  nickname: user.nickname ?? null,
                  __dirty: true,
                }
              : r,
          ),
        );
        setResolveStatusByKey((prev) => ({
          ...prev,
          [row.__key]: {
            state: "ok",
            user: { id: user.id, nickname: user.nickname ?? null },
          },
        }));
        setIsDirty(true);
      } else {
        setResolveStatusByKey((prev) => ({
          ...prev,
          [row.__key]: { state: "error", message: "유저를 찾을 수 없습니다." },
        }));
      }
    } catch {
      setResolveStatusByKey((prev) => ({
        ...prev,
        [row.__key]: { state: "error", message: "유저 검색 오류" },
      }));
    }
  };

  const handleSaveAll = async () => {
    if (isSaving) return;

    const invalidRows = rows.filter(
      (row) => !row.userId || !row.amount || !row.kstDate,
    );
    if (invalidRows.length > 0) {
      alert("유저 검증, 금액, 날짜가 비어 있는 행이 있습니다.");
      return;
    }

    setIsSaving(true);
    try {
      for (const id of deletedIds) {
        await deleteMutation.mutateAsync(id);
      }

      for (const row of rows) {
        if (row.__isNew) {
          await createMutation.mutateAsync({
            user_id: row.userId!,
            amount: Number(row.amount),
            kst_date: row.kstDate,
          });
          continue;
        }
        if (row.__dirty && row.id) {
          await updateMutation.mutateAsync({
            id: row.id,
            data: {
              amount: Number(row.amount),
              kst_date: row.kstDate,
            },
          });
        }
      }

      await refetch();
      setIsDirty(false);
      setDeletedIds([]);
    } finally {
      setIsSaving(false);
    }
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
            자동으로 입금 내역을 생성하거나 잘못 기입된 내역을 수정/삭제합니다.
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
            onClick={addRow}
          >
            <Plus className="w-4 h-4" /> 행 추가
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            onClick={handleSaveAll}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? "저장중.." : "전체 저장"}
          </Button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="닉네임으로 검색.."
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
                  작업 일시 {getSortIcon("createdAt")}
                </div>
              </TableHead>
              <TableHead className="text-zinc-400">검수</TableHead>
              <TableHead className="text-zinc-400 w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-20 text-zinc-500"
                >
                  {isLoading ? "불러오는 중.." : "입금 내역이 없습니다."}
                </TableCell>
              </TableRow>
            ) : (
              sortedRows.map((row) => {
                const status = resolveStatusByKey[row.__key];
                return (
                  <TableRow
                    key={row.__key}
                    className="border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <TableCell className="py-[5px]">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Input
                            value={row.userQuery}
                            onChange={(e) =>
                              handleRowChange(
                                row.__key,
                                "userQuery",
                                e.target.value,
                              )
                            }
                            placeholder="닉네임/ID"
                            className="bg-black/40 border-white/10 h-9"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-white/10 h-9"
                            onClick={() => resolveRowUser(row)}
                          >
                            검색
                          </Button>
                        </div>
                        <div className="text-xs text-zinc-500">
                          UID: {row.userId ?? "-"} / {row.nickname ?? "미확인"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-emerald-400 font-mono py-[5px]">
                      <Input
                        type="number"
                        value={String(row.amount ?? 0)}
                        onChange={(e) =>
                          handleRowChange(row.__key, "amount", e.target.value)
                        }
                        className="bg-emerald-950/20 border-white/10 h-9 font-mono text-emerald-400"
                      />
                    </TableCell>
                    <TableCell className="py-[5px]">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        <Input
                          type="date"
                          value={row.kstDate}
                          onChange={(e) =>
                            handleRowChange(
                              row.__key,
                              "kstDate",
                              e.target.value,
                            )
                          }
                          className="bg-black/40 border-white/10 h-9"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-500 text-xs py-[5px]">
                      {formatKstDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs py-[5px]">
                      {status?.state === "loading" && (
                        <span className="text-zinc-500">확인중..</span>
                      )}
                      {status?.state === "ok" && (
                        <span className="text-emerald-400">확인됨</span>
                      )}
                      {status?.state === "error" && (
                        <span className="text-red-400">{status.message}</span>
                      )}
                      {status?.state === "idle" && (
                        <span className="text-zinc-500">대기</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-[5px]">
                      <Button
                        variant="ghost"
                        className="h-9 w-9 p-0 hover:bg-white/10"
                        onClick={() => removeRow(row)}
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

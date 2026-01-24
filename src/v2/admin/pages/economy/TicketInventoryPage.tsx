import { useMemo, useState } from "react";
import {
  useAdminTicketLogs,
  useCreateTicket,
  useUpdateTicket,
  useDeleteTicket,
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
  Ticket,
  Package,
  AlertCircle,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  getWalletRewardItems,
  getInventoryRewardItems,
  getRewardItemLabel,
} from "../../../constants/rewardItems";

export default function TicketInventoryPage() {
  const normalizeSearchValue = (value: string) => value.trim();

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
  const walletItems = useMemo(() => getWalletRewardItems(), []);
  const inventoryItems = useMemo(() => getInventoryRewardItems(), []);
  const walletItemValues = useMemo(
    () => new Set(walletItems.map((item) => item.value)),
    [walletItems],
  );
  const inventoryItemValues = useMemo(
    () => new Set(inventoryItems.map((item) => item.value)),
    [inventoryItems],
  );
  const combinedItems = useMemo(
    () => [...walletItems, ...inventoryItems],
    [walletItems, inventoryItems],
  );
  const defaultItemType = combinedItems[0]?.value || "ROULETTE_TICKET";

  const [itemType, setItemType] = useState(defaultItemType);
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState("?¥Î≤§??Î≥¥ÏÉÅ");
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

  const createInventoryItemMutation = useCreateInventoryItem();
  const updateInventoryItemMutation = useUpdateInventoryItem();
  const deleteInventoryItemMutation = useDeleteInventoryItem();

  // Stats (Mocked or derived from logs if enough data)
  const stats = useMemo(() => {
    const totalIssued = logs.filter((l) => l.type === "GRANT").length;
    const totalUsed = logs.filter((l) => l.type === "USE").length;
    return {
      totalTickets: logs.filter((l) => walletItemValues.has(l.itemType)).length,
      totalItems: logs.filter((l) => inventoryItemValues.has(l.itemType))
        .length,
      totalIssued,
      totalUsed,
    };
  }, [logs, walletItemValues, inventoryItemValues]);

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
    }
  };

  const handleSearchCommit = async () => {
    const normalized = normalizeSearchValue(inputValue);
    if (!normalized) {
      setSearchUserId(undefined);
      return;
    }

    const numericId = parseInt(normalized);
    if (!isNaN(numericId) && /^\d+$/.test(normalized)) {
      setSearchUserId(numericId);
      return;
    }

    try {
      const response = await getAdminUserList({
        search: normalized,
        limit: 1,
      });
      if (response.users && response.users.length > 0) {
        setSearchUserId(response.users[0].id);
      } else {
        alert("?¥Îãπ ?âÎÑ§?ÑÏùò ?†Ï?Î•?Ï∞æÏùÑ ???ÜÏäµ?àÎã§.");
        setSearchUserId(undefined);
      }
    } catch (error) {
      console.error("User search failed", error);
      alert("?†Ï? Í≤Ä??Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.");
    }
  };

  const lookupUserInForm = async () => {
    const normalized = normalizeSearchValue(targetUserId);
    if (!normalized) return;
    setIsSearchingUser(true);
    try {
      const response = await getAdminUserList({
        search: normalized,
        limit: 1,
      });
      if (response.users && response.users.length > 0) {
        const foundUser = response.users[0];
        setTargetUserNickname(foundUser.nickname || "");
        setTargetUserId(foundUser.id.toString()); // Auto-fill ID
      } else {
        setTargetUserNickname("?†Ï?Î•?Ï∞æÏùÑ ???ÜÏùå");
      }
    } catch {
      setTargetUserNickname("Í≤Ä???§Î•ò");
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleCreate = () => {
    const uid = parseInt(targetUserId);
    const amt = parseInt(amount);
    if (isNaN(uid) || isNaN(amt)) return;

    const isTicket = walletItemValues.has(itemType);

    if (isTicket) {
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
    } else {
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
    }
  };

  const handleEdit = () => {
    if (!selectedLog) return;
    const amt = parseInt(amount);
    if (isNaN(amt)) return;

    const isTicket = walletItemValues.has(selectedLog.itemType);

    if (isTicket) {
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
    } else {
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
    }
  };

  const handleDelete = () => {
    if (!selectedLog) return;

    const isTicket = walletItemValues.has(selectedLog.itemType);

    if (isTicket) {
      deleteTicketMutation.mutate(selectedLog.id, {
        onSuccess: () => {
          setDeleteOpen(false);
          setSelectedLog(null);
          refetch();
        },
      });
    } else {
      deleteInventoryItemMutation.mutate(selectedLog.id, {
        onSuccess: () => {
          setDeleteOpen(false);
          setSelectedLog(null);
          refetch();
        },
      });
    }
  };

  const resetForm = () => {
    setTargetUserId("");
    setTargetUserNickname("");
    setItemType(defaultItemType);
    setAmount("1");
    setReason("?¥Î≤§??Î≥¥ÏÉÅ");
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
            ?∞Ïºì/?∏Î≤§?†Î¶¨ Í¥ÄÎ¶?(Inventory Ops)
          </h1>
          <p className="text-sm text-zinc-400">
            ?†Ï? ?ÑÏù¥??ÏßÄÍ∏??åÏàò Î°úÍ∑∏Î•?Í¥ÄÎ¶¨ÌïòÍ≥?Î≥¥ÏÉÅ??ÏßÄÍ∏âÌï©?àÎã§.
          </p>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setCreateOpen(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold shadow-[0_0_20px_rgba(16,185,129,0.2)]"
        >
          <Plus className="w-4 h-4 mr-2" />??Î≥¥ÏÉÅ ÏßÄÍ∏?(Issue)
        </Button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#18181B] border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Ticket className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400 flex justify-between items-center">
              Ï¥?Î∞úÌñâ ?∞Ïºì
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-500 hover:text-white"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#18181B] border-white/10 text-white"
                >
                  <DropdownMenuItem
                    onClick={() => {
                      setItemType("TICKET");
                      setCreateOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    ?∞Ïºì Ï¶âÏãú ÏßÄÍ∏?
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <History className="w-4 h-4 mr-2" />
                    ?∞Ïºì ?µÍ≥Ñ ?ÅÏÑ∏Î≥¥Í∏∞
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {stats.totalTickets.toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              ?¥Î≤§??Î∞?ÎØ∏ÏÖò Î≥¥ÏÉÅ ?¨Ìï®
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#18181B] border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Package className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400 flex justify-between items-center">
              Ï¥?Î≥¥Ïú† ?ÑÏù¥??
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-500 hover:text-white"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#18181B] border-white/10 text-white"
                >
                  <DropdownMenuItem
                    onClick={() => {
                      setItemType("BUNDLE");
                      setCreateOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    ?ÑÏù¥??ÏßÄÍ∏?
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-400">
              {stats.totalItems.toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Íæ∏Îü¨ÎØ? ?åÎ™®?????ÑÏ≤¥
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#18181B] border-white/5 relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400 flex justify-between items-center">
              ÏßÄÍ∏?Í±¥Ïàò (Total Issued)
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-500 border-none scale-75 border-emerald-500/20"
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
              ?ÑÏ≤¥ Í∏∞Í∞Ñ ?ÑÏ†Å Í±¥Ïàò
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#18181B] border-white/5 relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400 flex justify-between items-center">
              ?¨Ïö© Í±¥Ïàò (Total Used)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-300">
              {stats.totalUsed.toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">?†Ï?Í∞Ä ?åÎ™®??Í±¥Ïàò</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end bg-black/20 p-4 rounded-xl border border-white/5">
        <div className="w-full max-w-sm space-y-2">
          <label className="text-xs text-zinc-400 font-medium ml-1">
            Î°úÍ∑∏ Í≤Ä??(?†Ï?)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="?âÎÑ§???êÎäî ID ?ÖÎ†•"
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
              ?úÏûë??
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
              Ï¢ÖÎ£å??
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
          Ï°∞Ìöå?òÍ∏∞
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
            ?ÑÏù¥??Î°úÍ∑∏ Î™©Î°ù (Inventory Logs)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-black/20">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="w-[180px]">?úÍ∞Ñ</TableHead>
                <TableHead>?†Ï? ID</TableHead>
                <TableHead>Íµ¨Î∂Ñ</TableHead>
                <TableHead>?ÑÏù¥??/TableHead>
                <TableHead>?òÎüâ</TableHead>
                <TableHead>?îÏï° (After)</TableHead>
                <TableHead className="max-w-[300px]">?¨Ïú†</TableHead>
                <TableHead className="text-right">?°ÏÖò</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2 text-zinc-500">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      Î°úÍ∑∏Î•?Î∂àÎü¨?§Îäî Ï§ëÏûÖ?àÎã§...
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2 text-zinc-600">
                      <AlertCircle className="w-8 h-8" />
                      Í≤Ä?âÎêú Î°úÍ∑∏Í∞Ä ?ÜÏäµ?àÎã§.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log: TicketLogDto) => (
                  <TableRow
                    key={log.id}
                    className="border-white/5 hover:bg-white/[0.04] transition-colors"
                  >
                    <TableCell className="text-zinc-500 text-xs font-mono">
                      {log.timestamp}
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
                      {log.itemType}
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
                            Í¥ÄÎ¶??°ÏÖò
                          </DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditModal(log)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            ?òÏ†ï (Edit)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem
                            onClick={() => openDeleteModal(log)}
                            className="text-red-400 focus:text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            ??†ú (Delete)
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
              <Plus className="w-5 h-5 text-emerald-500" />???ÑÏù¥?úÎ≥¥??ÏßÄÍ∏?
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              ?†Ï??êÍ≤å ?∞Ïºì?¥ÎÇò ?ÑÏù¥?úÏùÑ ?òÎèô?ºÎ°ú ÏßÄÍ∏âÌï©?àÎã§. ÏßÄÍ∏?Ï¶âÏãú
              Î∞òÏòÅ?©Îãà??
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userId" className="text-zinc-400">
                ÏßÄÍ∏??Ä??(User ID)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="userId"
                  placeholder="?†Ï? ID ?ÖÎ†•"
                  className="bg-black/50 border-white/10 text-white"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={lookupUserInForm}
                  disabled={isSearchingUser}
                >
                  {isSearchingUser ? "..." : "Í≤Ä??}
                </Button>
              </div>
              {targetUserNickname && (
                <div className="text-[10px] text-emerald-500 font-medium ml-1">
                  Í≤Ä??Í≤∞Í≥º:{" "}
                  <span className="underline">{targetUserNickname}</span> ?†Ï?
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Ï¢ÖÎ•ò (Type)</Label>
                <Select value={itemType} onValueChange={setItemType}>
                  <SelectTrigger className="bg-black/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-white/10 text-white max-h-[300px]">
                    {combinedItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {getRewardItemLabel(item.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">?òÎüâ (Amount)</Label>
                <Input
                  type="number"
                  className="bg-black/50 border-white/10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">ÏßÄÍ∏??¨Ïú† (Reason)</Label>
              <Input
                placeholder="?¨Ïú†Î•??ÖÎ†•?òÏÑ∏??
                className="bg-black/50 border-white/10"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            {itemType === "TICKET" && (
              <div className="space-y-2">
                <Label className="text-zinc-400">ÎßåÎ£å??(Optional)</Label>
                <Input
                  type="datetime-local"
                  className="bg-black/50 border-white/10 color-scheme-dark"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Ï∑®ÏÜå
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                createTicketMutation.isPending ||
                createInventoryItemMutation.isPending ||
                !targetUserId
              }
              className="bg-emerald-500 text-black font-bold"
            >
              ÏßÄÍ∏??§Ìñâ
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
              Î≥¥ÏÉÅ Î°úÍ∑∏ ?òÏ†ï
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Î∞úÌñâ??Î≥¥ÏÉÅ???¥Î? Î°úÍ∑∏ ?ïÎ≥¥Î•??òÏ†ï?©Îãà?? (?§Ï†ú ?êÏÇ∞ Î≥Ä?ôÏ?
              Î∞úÏÉù?òÏ? ?äÏùå)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-black/30 rounded border border-white/10 text-xs">
              <span className="text-zinc-500">
                ID: #{selectedLog?.id} | User: {selectedLog?.userId} | Type:{" "}
                {selectedLog?.itemType}
              </span>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">?òÎüâ ?òÏ†ï</Label>
              <Input
                type="number"
                className="bg-black/50 border-white/10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">?¨Ïú† ?òÏ†ï</Label>
              <Input
                className="bg-black/50 border-white/10"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Ï∑®ÏÜå
            </Button>
            <Button onClick={handleEdit} className="bg-sky-500 text-white">
              ?òÏ†ï ?ÑÎ£å
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
              Î°úÍ∑∏ ??†ú ?ïÏù∏
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              ??Î°úÍ∑∏Î•??ïÎßêÎ°???†ú?òÏãúÍ≤†Ïäµ?àÍπå? <br />
              <span className="text-red-400/80 font-bold">
                ?????ëÏóÖ?Ä ?úÏä§??Í∏∞Î°ù?êÏÑú Î°úÍ∑∏Î•??ÅÍµ¨???úÍ±∞?©Îãà??
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="text-sm p-3 bg-red-500/5 rounded border border-red-500/10">
              <div className="font-mono text-zinc-400 mb-1">LOG DETAIL</div>
              <div className="font-medium">
                #{selectedLog?.id} | {selectedLog?.itemType} (
                {selectedLog?.amount})
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {selectedLog?.reason}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Ï∑®ÏÜå
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              ?ïÏù∏ Î∞???†ú
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

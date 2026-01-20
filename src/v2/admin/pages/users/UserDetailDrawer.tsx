import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../../components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { cn } from "../../../lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { NumberTicker } from "../../components/ui/NumberTicker";
import {
  Shield,
  AlertTriangle,
  Ticket,
  Edit,
  CheckCircle2,
  Package,
  MessageSquare,
  Target,
  Trophy,
} from "lucide-react";
import {
  useRef,
  useEffect,
  useState,
  JSXElementConstructor,
  Key,
  ReactElement,
  ReactNode,
  ReactPortal,
} from "react";
import gsap from "gsap";
import { WalletEditor } from "../../components/users/WalletEditor";
import {
  useUserMissionHistory,
  useForceCompleteMission,
  useUserSegment,
  useAdminTicketLogs,
  useAdjustUserWallet,
  useAdjustUserInventory,
  useAdminUserDetail,
  useCreateUserNote,
  useRunIntervention,
  useUserActivityLogs,
  useUserInventory,
  useUserNotes,
} from "../../../hooks/useV2Admin";
import { REWARD_ITEMS } from "../../../constants/rewardItems";
import { Textarea } from "../../../components/ui/textarea";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";

interface UserDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
  defaultTab?: string;
}

export function UserDetailDrawer({
  isOpen,
  onClose,
  userId,
  defaultTab = "overview",
}: UserDetailDrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isWalletEditorOpen, setIsWalletEditorOpen] = useState(false);
  const [walletEditorInitialType, setWalletEditorInitialType] =
    useState<string>("ROULETTE_COIN");
  const [newNote, setNewNote] = useState("");
  const [inventoryAdjustItemType, setInventoryAdjustItemType] =
    useState<string>("DIAMOND");
  const [inventoryAdjustDelta, setInventoryAdjustDelta] = useState<string>("");
  const [inventoryAdjustNote, setInventoryAdjustNote] = useState<string>("");

  const { data: user, isLoading } = useAdminUserDetail(userId);
  const { data: activityLogs } = useUserActivityLogs(userId);
  const { data: inventory } = useUserInventory(userId);
  const { data: notes } = useUserNotes(userId);
  const { data: missions } = useUserMissionHistory(userId);
  const { data: segment } = useUserSegment(userId);
  const { data: ticketLogs } = useAdminTicketLogs(userId || undefined);

  const runIntervention = useRunIntervention();
  const adjustWallet = useAdjustUserWallet();
  const adjustInventory = useAdjustUserInventory();
  const createNote = useCreateUserNote();
  const forceCompleteMission = useForceCompleteMission();

  // GSAP Animation for Tab Content
  useEffect(() => {
    if (isOpen && contentRef.current && user) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
      );
    }
  }, [isOpen, user]);

  const handleCreateNote = async () => {
    if (!userId || !newNote.trim()) return;
    await createNote.mutateAsync({ userId, content: newNote });
    setNewNote("");
  };

  const handleInventoryAdjust = async () => {
    if (!userId) return;
    const delta = Number.parseInt(inventoryAdjustDelta, 10);
    if (!Number.isFinite(delta) || delta === 0) return;
    await adjustInventory.mutateAsync({
      userId,
      request: {
        itemType: inventoryAdjustItemType,
        delta,
        note: inventoryAdjustNote.trim() || undefined,
      },
    });
    setInventoryAdjustDelta("");
    setInventoryAdjustNote("");
  };

  if (!userId) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[90%] sm:w-[900px] bg-[#121214] border-l border-white/10 p-0 text-white overflow-y-auto">
        {isLoading || !user ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4">
            <SheetHeader className="sr-only">
              <SheetTitle>Loading User Details</SheetTitle>
              <SheetDescription>
                유저 정보를 불러오는 중입니다.
              </SheetDescription>
            </SheetHeader>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            <span>Loading User Details...</span>
          </div>
        ) : (
          <>
            <SheetHeader className="px-6 py-4 border-b border-white/5 bg-[#18181B] sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-lg border border-indigo-500/30">
                    {user.nickname?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <SheetTitle className="text-white text-lg font-bold flex items-center gap-2">
                      {user.nickname || "(미설정)"} (#{userId})
                      {user.vipLevel === "VIP" && (
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] h-5">
                          VIP
                        </Badge>
                      )}
                      {segment && (
                        <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px] h-5">
                          {segment.label}
                        </Badge>
                      )}
                    </SheetTitle>
                    <SheetDescription className="text-zinc-400 text-xs">
                      가입일 {new Date(user.createdAt).toLocaleDateString()} •
                      레벨 {user.level || 1}
                    </SheetDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  {user.isActive ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 bg-red-900/40 text-red-500 hover:bg-red-900/60 border border-red-900/50"
                    >
                      <Shield className="w-3 h-3 mr-1" /> 정지
                    </Button>
                  ) : (
                    <Badge className="bg-red-500 text-white">정지됨</Badge>
                  )}
                </div>
              </div>
            </SheetHeader>

            <Tabs defaultValue={defaultTab} className="h-full">
              <TabsList className="w-full grid grid-cols-3 gap-2 bg-[#18181B] p-4 h-auto">
                <TabsTrigger value="overview" className="tab-trigger">
                  기본 정보
                </TabsTrigger>
                <TabsTrigger value="wallet" className="tab-trigger">
                  지갑
                </TabsTrigger>
                <TabsTrigger value="vault" className="tab-trigger">
                  금고
                </TabsTrigger>
                <TabsTrigger value="inventory" className="tab-trigger">
                  인벤토리
                </TabsTrigger>
                <TabsTrigger value="logs" className="tab-trigger">
                  활동 로그
                </TabsTrigger>
                <TabsTrigger value="notes" className="tab-trigger">
                  상담/메모
                </TabsTrigger>
                <TabsTrigger value="segment" className="tab-trigger">
                  세그먼트
                </TabsTrigger>
                <TabsTrigger value="missions" className="tab-trigger">
                  미션
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[calc(100vh-160px)] bg-[#121214]">
                <div className="p-6 space-y-6" ref={contentRef}>
                  {/* 1. 기본 정보 (Overview) */}
                  <TabsContent value="overview" className="m-0 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-[#18181B] border-white/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-zinc-400">
                            총 입금
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-white flex items-baseline gap-1">
                            ₩ <NumberTicker value={user.totalDeposit || 0} />
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-[#18181B] border-white/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-zinc-400">
                            현재 자산
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-emerald-400 flex items-baseline gap-1">
                            ₩ <NumberTicker value={user.currentAssets || 0} />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Risk Section */}
                    {user.riskLevel === "HIGH" ? (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-bold text-red-400 mb-1">
                            위험 경고 ({user.riskLevel})
                          </h4>
                          <p className="text-xs text-red-400/80">
                            {user.riskReason ||
                              "비정상적인 활동이 감지되었습니다."}
                          </p>
                        </div>
                      </div>
                    ) : user.riskLevel === "MEDIUM" ? (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-bold text-amber-400 mb-1">
                            중간 위험도
                          </h4>
                          <p className="text-xs text-amber-400/80">
                            면밀한 모니터링이 필요합니다.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-bold text-emerald-400 mb-1">
                            정상
                          </h4>
                          <p className="text-xs text-emerald-400/80">
                            위험 요소가 감지되지 않았습니다.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Intervention Playbook */}
                    {user.playbook &&
                      user.playbook.suggestedActions.length > 0 && (
                        <Card className="bg-[#18181B] border-red-500/10">
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Shield className="w-4 h-4 text-red-500" />
                              추천 개입 조치
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {user.playbook.suggestedActions
                              .slice(0, 2)
                              .map((action) => (
                                <div
                                  key={action.actionId}
                                  className="flex justify-between items-center p-3 rounded-lg bg-zinc-900/50 border border-white/5"
                                >
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">
                                      {action.label}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                      {action.description}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-indigo-500 text-white hover:bg-indigo-600"
                                    onClick={() =>
                                      runIntervention.mutate({
                                        userId: user.id,
                                        actionId: action.actionId,
                                      })
                                    }
                                    disabled={runIntervention.isPending}
                                  >
                                    실행
                                  </Button>
                                </div>
                              ))}
                          </CardContent>
                        </Card>
                      )}
                  </TabsContent>

                  {/* 2. 지갑 (Wallet) */}
                  <TabsContent value="wallet" className="m-0 space-y-4">
                    <div className="flex justify-between items-center bg-[#18181B] p-4 rounded-xl border border-white/5">
                      <div>
                        <div className="text-sm text-zinc-500">
                          현재 티켓 보유량
                        </div>
                        <div className="text-2xl font-mono text-white font-bold flex items-center gap-2">
                          <Ticket className="w-6 h-6 text-indigo-400" />
                          {(user.ticketBalance || 0).toLocaleString()} T
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                        onClick={() => {
                          setWalletEditorInitialType("ROULETTE_COIN");
                          setIsWalletEditorOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        수량 조정
                      </Button>
                    </div>

                    <div className="rounded-xl bg-[#18181B] border border-white/5 overflow-hidden">
                      <div className="p-3 border-b border-white/5 bg-zinc-900/30 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        티켓 변동 내역
                      </div>
                      <Table>
                        <TableHeader className="bg-transparent">
                          <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-[10px] h-8">
                              구분
                            </TableHead>
                            <TableHead className="text-[10px] h-8">
                              변동
                            </TableHead>
                            <TableHead className="text-[10px] h-8">
                              잔액
                            </TableHead>
                            <TableHead className="text-[10px] h-8">
                              사유
                            </TableHead>
                            <TableHead className="text-right text-[10px] h-8">
                              일시
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ticketLogs && ticketLogs.length > 0 ? (
                            ticketLogs.map(
                              (log: {
                                id: Key | null | undefined;
                                type:
                                  | string
                                  | number
                                  | boolean
                                  | ReactElement<
                                      any,
                                      string | JSXElementConstructor<any>
                                    >
                                  | Iterable<ReactNode>
                                  | null
                                  | undefined;
                                amount:
                                  | string
                                  | number
                                  | boolean
                                  | ReactElement<
                                      any,
                                      string | JSXElementConstructor<any>
                                    >
                                  | Iterable<ReactNode>
                                  | null
                                  | undefined;
                                balanceAfter:
                                  | string
                                  | number
                                  | boolean
                                  | ReactElement<
                                      any,
                                      string | JSXElementConstructor<any>
                                    >
                                  | Iterable<ReactNode>
                                  | ReactPortal
                                  | null
                                  | undefined;
                                reason:
                                  | string
                                  | number
                                  | boolean
                                  | ReactElement<
                                      any,
                                      string | JSXElementConstructor<any>
                                    >
                                  | Iterable<ReactNode>
                                  | ReactPortal
                                  | null
                                  | undefined;
                                timestamp: string | number | Date;
                              }) => (
                                <TableRow
                                  key={log.id}
                                  className="border-white/5 hover:bg-white/5 text-[11px]"
                                >
                                  <TableCell className="py-2">
                                    <Badge
                                      className={cn(
                                        "text-[9px] px-1 h-4",
                                        log.type === "USE"
                                          ? "bg-red-500/10 text-red-500"
                                          : "bg-emerald-500/10 text-emerald-500",
                                      )}
                                    >
                                      {log.type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell
                                    className={cn(
                                      "py-2 font-mono",
                                      (log.amount as number) > 0
                                        ? "text-emerald-400"
                                        : "text-red-400",
                                    )}
                                  >
                                    {(log.amount as number) > 0
                                      ? `+${log.amount}`
                                      : log.amount}
                                  </TableCell>
                                  <TableCell className="py-2 text-zinc-400">
                                    {log.balanceAfter} T
                                  </TableCell>
                                  <TableCell className="py-2 text-zinc-300 max-w-[120px] truncate">
                                    {log.reason}
                                  </TableCell>
                                  <TableCell className="py-2 text-right text-zinc-500">
                                    {new Date(
                                      log.timestamp,
                                    ).toLocaleDateString()}
                                  </TableCell>
                                </TableRow>
                              ),
                            )
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="h-24 text-center text-zinc-600"
                              >
                                최근 내역이 없습니다.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* 3. 금고 (Vault) */}
                  <TabsContent value="vault" className="m-0 space-y-4">
                    <div className="flex justify-between items-center bg-[#18181B] p-4 rounded-xl border border-white/5">
                      <div>
                        <div className="text-sm text-zinc-500">
                          현재 금고 잔액
                        </div>
                        <div className="text-2xl font-mono text-white font-bold flex items-center gap-2">
                          ₩ {(user.vaultBalance || 0).toLocaleString()}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                        onClick={() => {
                          setWalletEditorInitialType("VAULT");
                          setIsWalletEditorOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        강제 수정
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-[#18181B] border-white/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-zinc-400">
                            누적 출금
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl text-zinc-300 font-bold">
                            ₩{" "}
                            {((user.totalDeposit || 0) * 0.3).toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-[#18181B] border-white/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-zinc-400">
                            총 입금
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl text-emerald-400 font-bold">
                            ₩ {(user.totalDeposit || 0).toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="rounded-xl bg-[#18181B] border border-white/5 overflow-hidden">
                      <div className="p-3 border-b border-white/5 bg-zinc-900/30 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        입출금 트랜잭션
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-[10px] h-8 text-zinc-400">
                              구분
                            </TableHead>
                            <TableHead className="text-[10px] h-8 text-zinc-400">
                              금액
                            </TableHead>
                            <TableHead className="text-[10px] h-8 text-zinc-400">
                              상태
                            </TableHead>
                            <TableHead className="text-right text-[10px] h-8 text-zinc-400">
                              일시
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Placeholder rows to simulate real data since specialized Vault API is pending */}
                          <TableRow className="border-white/5 hover:bg-white/5 text-[11px]">
                            <TableCell className="py-2 text-indigo-400">
                              WITHDRAWAL
                            </TableCell>
                            <TableCell className="py-2 text-red-400 font-mono">
                              -₩50,000
                            </TableCell>
                            <TableCell className="py-2 text-zinc-300">
                              COMPLETED
                            </TableCell>
                            <TableCell className="py-2 text-right text-zinc-500 font-mono">
                              2024.01.20
                            </TableCell>
                          </TableRow>
                          <TableRow className="border-white/5 hover:bg-white/5 text-[11px]">
                            <TableCell className="py-2 text-emerald-400">
                              DEPOSIT
                            </TableCell>
                            <TableCell className="py-2 text-emerald-400 font-mono">
                              +₩100,000
                            </TableCell>
                            <TableCell className="py-2 text-zinc-300">
                              COMPLETED
                            </TableCell>
                            <TableCell className="py-2 text-right text-zinc-500 font-mono">
                              2024.01.18
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* 4. 인벤토리 (Inventory) */}
                  <TabsContent value="inventory" className="m-0 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-lg font-bold">보유 아이템</h3>
                    </div>
                    <Card className="bg-[#18181B] border-white/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-zinc-200">
                          인벤토리 강제 수정
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">
                              아이템 타입
                            </Label>
                            <Select
                              value={inventoryAdjustItemType}
                              onValueChange={setInventoryAdjustItemType}
                            >
                              <SelectTrigger className="bg-black/60 border-white/10 text-zinc-100">
                                <SelectValue placeholder="아이템 선택" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#18181B] border-white/10 text-white">
                                {REWARD_ITEMS.map((item) => (
                                  <SelectItem
                                    key={item.value}
                                    value={item.value}
                                    className="text-zinc-100 focus:bg-zinc-800"
                                  >
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">
                              수량 (+지급, -차감)
                            </Label>
                            <Input
                              type="number"
                              placeholder="예: 10 또는 -10"
                              value={inventoryAdjustDelta}
                              onChange={(e) =>
                                setInventoryAdjustDelta(e.target.value)
                              }
                              className="bg-black/50 border-white/10 text-white font-mono"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-zinc-400">사유</Label>
                          <Textarea
                            placeholder="예: 운영자 조정"
                            value={inventoryAdjustNote}
                            onChange={(e) =>
                              setInventoryAdjustNote(e.target.value)
                            }
                            className="bg-black/50 border-white/10 text-white min-h-[70px]"
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            className="bg-indigo-600 hover:bg-indigo-700"
                            onClick={handleInventoryAdjust}
                            disabled={
                              adjustInventory.isPending ||
                              !inventoryAdjustDelta.trim()
                            }
                          >
                            {adjustInventory.isPending
                              ? "처리 중..."
                              : "수정 실행"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    {inventory && inventory.length > 0 ? (
                      <div className="grid gap-3">
                        {inventory.map((item) => (
                          <Card
                            key={item.id}
                            className="bg-[#18181B] border-white/5"
                          >
                            <CardContent className="p-4 flex justify-between items-center">
                              <div>
                                <div className="font-medium">
                                  {item.itemName}
                                </div>
                                <div className="text-xs text-zinc-500">
                                  {item.itemType} • x{item.quantity}
                                </div>
                              </div>
                              <Badge
                                className={
                                  item.status === "ACTIVE"
                                    ? "bg-green-500/10 text-green-500"
                                    : "bg-zinc-500/10 text-zinc-500"
                                }
                              >
                                {item.status}
                              </Badge>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-zinc-500 py-10">
                        보유 중인 아이템이 없습니다.
                      </div>
                    )}
                  </TabsContent>

                  {/* 5. 활동 로그 (Activity Logs) */}
                  <TabsContent value="logs" className="m-0 space-y-4">
                    {activityLogs && activityLogs.length > 0 ? (
                      <div className="space-y-2">
                        {activityLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-3 rounded-lg bg-[#18181B] border border-white/5"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <Badge className="text-[10px]">{log.type}</Badge>
                              <span className="text-xs text-zinc-500">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-sm text-zinc-300">
                              {log.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-zinc-500 py-10">
                        활동 로그가 없습니다.
                      </div>
                    )}
                  </TabsContent>

                  {/* 6. 상담/메모 (Notes) */}
                  <TabsContent value="notes" className="m-0 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-lg font-bold">운영자 메모</h3>
                    </div>

                    <Card className="bg-[#18181B] border-white/5">
                      <CardContent className="p-4 space-y-3">
                        <Textarea
                          placeholder="메모 내용을 입력하세요..."
                          className="bg-zinc-900 border-zinc-800 text-white min-h-[100px]"
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                        />
                        <Button
                          className="w-full bg-indigo-500 hover:bg-indigo-600"
                          onClick={handleCreateNote}
                          disabled={!newNote.trim() || createNote.isPending}
                        >
                          메모 저장
                        </Button>
                      </CardContent>
                    </Card>

                    {notes && notes.length > 0 ? (
                      <div className="space-y-3">
                        {notes.map((note) => (
                          <Card
                            key={note.id}
                            className="bg-[#18181B] border-white/5"
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-medium text-indigo-400">
                                  {note.adminNickname}
                                </span>
                                <span className="text-xs text-zinc-500">
                                  {new Date(note.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                                {note.content}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-zinc-500 py-10">
                        작성된 메모가 없습니다.
                      </div>
                    )}
                  </TabsContent>

                  {/* 7. 세그먼트 (Segment) */}
                  <TabsContent value="segment" className="m-0 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-lg font-bold">유저 세그먼트</h3>
                    </div>

                    {segment ? (
                      <Card className="bg-[#18181B] border-white/5">
                        <CardHeader>
                          <CardTitle>현재 세그먼트</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Badge className="text-lg px-4 py-2">
                            {segment.label}
                          </Badge>
                          <p className="text-sm text-zinc-400 mt-3">
                            이 유저는 자동 분류 규칙에 따라 위 세그먼트에
                            속합니다.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="text-center text-zinc-500 py-10">
                        세그먼트 정보를 불러올 수 없습니다.
                      </div>
                    )}
                  </TabsContent>

                  {/* 8. 미션 (Missions) */}
                  <TabsContent value="missions" className="m-0 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-lg font-bold">
                        미션 수행 이력 (당일)
                      </h3>
                    </div>

                    {missions && missions.length > 0 ? (
                      <div className="space-y-3">
                        {missions
                          .filter((mission) => {
                            // Filter DAILY and WEEKLY missions to show only today's
                            if (
                              mission.category === "DAILY" ||
                              mission.category === "WEEKLY"
                            ) {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const missionDate = new Date(mission.updatedAt);
                              missionDate.setHours(0, 0, 0, 0);
                              return missionDate.getTime() === today.getTime();
                            }
                            // Show all other mission types
                            return true;
                          })
                          .map((mission) => (
                            <Card
                              key={mission.id}
                              className="bg-[#18181B] border-white/5"
                            >
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <div className="font-medium">
                                      {mission.missionTitle}
                                    </div>
                                    <Badge className="text-[10px] mt-1">
                                      {mission.category}
                                    </Badge>
                                  </div>
                                  <Badge
                                    className={
                                      mission.status === "COMPLETED"
                                        ? "bg-green-500/10 text-green-500"
                                        : "bg-zinc-500/10 text-zinc-500"
                                    }
                                  >
                                    {mission.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="flex-1">
                                    <progress
                                      value={mission.progress}
                                      max={mission.maxProgress || 1}
                                      className="h-2 w-full appearance-none rounded-full overflow-hidden bg-zinc-800 [&::-webkit-progress-bar]:bg-zinc-800 [&::-webkit-progress-value]:bg-indigo-500 [&::-moz-progress-bar]:bg-indigo-500"
                                    />
                                  </div>
                                  <span className="text-xs text-zinc-400">
                                    {mission.progress}/{mission.maxProgress}
                                  </span>
                                </div>
                                {mission.status !== "COMPLETED" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full mt-2"
                                    onClick={() =>
                                      forceCompleteMission.mutate({
                                        userId: user.id,
                                        missionId: mission.missionId,
                                      })
                                    }
                                    disabled={forceCompleteMission.isPending}
                                  >
                                    강제 완료 처리
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center text-zinc-500 py-10">
                        미션 수행 이력이 없습니다.
                      </div>
                    )}
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          </>
        )}

        {/* Wallet Editor Modal */}
        {user && (
          <WalletEditor
            isOpen={isWalletEditorOpen}
            onClose={() => setIsWalletEditorOpen(false)}
            userId={user.id}
            currentTickets={user.ticketBalance}
            initialTokenType={walletEditorInitialType}
            onUpdate={async (amt, reason, type) => {
              if (user) {
                await adjustWallet.mutateAsync({
                  userId: user.id,
                  request: {
                    amount: amt,
                    token_type: type,
                    reason: reason,
                  },
                });
              }
            }}
          />
        )}
      </SheetContent>

      <style>{`
        .tab-trigger {
          @apply rounded-md border border-white/5 bg-zinc-900/50 data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:border-indigo-500 px-3 py-2 text-zinc-400 text-sm whitespace-nowrap transition-all hover:bg-white/5;
        }
      `}</style>
    </Sheet>
  );
}

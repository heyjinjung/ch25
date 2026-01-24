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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Ticket, Edit, Package, Vault } from "lucide-react";
import { useRef, useEffect, useState, useMemo } from "react";
import gsap from "gsap";
import WalletEditor from "../../components/users/WalletEditor";
import {
  useAdjustUserWallet,
  useAdjustUserInventory,
  useAdminUserDetail,
  useAdminTicketLogs,
  useUserInventory,
} from "../../../hooks/useV2Admin";
import {
  getInventoryRewardItems,
  getWalletRewardItems,
  getRewardItemLabel,
  type RewardCategory,
} from "../../../constants/rewardItems";
import { Textarea } from "../../../components/ui/textarea";
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

const formatKst = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
};

export function UserDetailDrawer({
  isOpen,
  onClose,
  userId,
  defaultTab = "wallet",
}: UserDetailDrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isWalletEditorOpen, setIsWalletEditorOpen] = useState(false);
  const [walletEditorInitialType, setWalletEditorInitialType] =
    useState<string>("ROULETTE_TICKET");
  const [walletEditorCategories, setWalletEditorCategories] = useState<
    RewardCategory[]
  >(["GAME_TICKET"]);
  const inventoryAdjustItems = useMemo(() => getInventoryRewardItems(), []);
  const defaultInventoryItem =
    inventoryAdjustItems[0]?.value || "CHICKEN_GIFTICON_5000";
  const [inventoryAdjustItemType, setInventoryAdjustItemType] =
    useState<string>(defaultInventoryItem);
  const [inventoryAdjustDelta, setInventoryAdjustDelta] = useState<string>("");
  const [inventoryAdjustNote, setInventoryAdjustNote] = useState<string>("");
  const walletItems = useMemo(() => getWalletRewardItems(), []);
  const walletItemValues = useMemo(
    () => new Set(walletItems.map((item) => item.value)),
    [walletItems],
  );

  const { data: user, isLoading } = useAdminUserDetail(userId);
  const { data: inventory } = useUserInventory(userId);
  const { data: ticketLogs = [] } = useAdminTicketLogs(
    userId ?? undefined,
    undefined,
    undefined,
    50,
    { enabled: Boolean(userId) },
  );
  const adjustWallet = useAdjustUserWallet();
  const adjustInventory = useAdjustUserInventory();
  const walletLogs = useMemo(
    () => ticketLogs.filter((log) => walletItemValues.has(log.itemType)),
    [ticketLogs, walletItemValues],
  );
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
      <SheetContent className="w-[90%] sm:max-w-[600px] sm:w-[600px] bg-[#121214] border-l border-white/10 p-0 text-white overflow-y-auto">
        {isLoading || !user ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4">
            <SheetHeader className="sr-only">
              <SheetTitle>Loading User Details</SheetTitle>
              <SheetDescription>
                사용자 정보를 불러오는 중입니다.
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
                    </SheetTitle>
                    <SheetDescription className="text-zinc-400 text-xs">
                      가입일 {new Date(user.createdAt).toLocaleDateString()} |
                      레벨 {user.level || 1}
                    </SheetDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* ?��? 버튼 ?�거??(Placeholder) */}
                </div>
              </div>
            </SheetHeader>

            <Tabs defaultValue={defaultTab} className="h-full">
              <TabsList className="w-full grid grid-cols-3 gap-2 bg-[#18181B] p-4 h-auto">
                <TabsTrigger value="wallet" className="tab-trigger">
                  티켓
                </TabsTrigger>
                <TabsTrigger value="inventory" className="tab-trigger">
                  인벤토리
                </TabsTrigger>
                <TabsTrigger value="vault" className="tab-trigger">
                  금고
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[calc(100vh-160px)] bg-[#121214]">
                <div className="p-6 space-y-6" ref={contentRef}>
                  {/* 1. 티켓 (Wallet) */}
                  <TabsContent value="wallet" className="m-0 space-y-4">
                    <div className="flex justify-between items-center bg-[#18181B] p-4 rounded-xl border border-white/5">
                      <div>
                        <div className="text-sm text-zinc-500">보유 티켓</div>
                        <div className="text-2xl font-mono text-white font-bold flex items-center gap-2">
                          <Ticket className="w-6 h-6 text-indigo-400" />
                          {(user.ticketBalance || 0).toLocaleString()} T
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                        onClick={() => {
                          setWalletEditorInitialType("ROULETTE_TICKET");
                          setWalletEditorCategories(["GAME_TICKET"]);
                          setIsWalletEditorOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        티켓 지급/회수
                      </Button>
                    </div>

                    <Card className="bg-[#18181B] border-white/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-zinc-200">
                          최근 티켓 로그
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {walletLogs.length > 0 ? (
                          walletLogs.slice(0, 10).map((log) => (
                            <div
                              key={log.id}
                              className="flex flex-col gap-1 rounded-lg border border-white/5 bg-black/40 px-3 py-2 text-xs"
                            >
                              <div className="flex items-center justify-between text-zinc-500">
                                <span>{formatKst(log.timestamp)}</span>
                                <Badge
                                  variant="outline"
                                  className={
                                    log.type === "GRANT"
                                      ? "border-none bg-emerald-500/10 text-emerald-400"
                                      : log.type === "REVOKE"
                                        ? "border-none bg-red-500/10 text-red-400"
                                        : "border-none bg-blue-500/10 text-blue-400"
                                  }
                                >
                                  {log.type}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-zinc-200">
                                <span>{getRewardItemLabel(log.itemType)}</span>
                                <span className="font-mono">
                                  {log.type === "GRANT" ? "+" : "-"}
                                  {(log.amount ?? 0).toLocaleString()}
                                </span>
                              </div>
                              {log.reason && (
                                <div className="text-[11px] text-zinc-500">
                                  {log.reason}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-zinc-500">
                            표시할 로그가 없습니다.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* 2. 인벤토리 (Inventory) */}
                  <TabsContent value="inventory" className="m-0 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-lg font-bold">보유 아이템</h3>
                    </div>
                    <Card className="bg-[#18181B] border-white/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-zinc-200">
                          인벤토리 강제 조정
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">
                              아이템 선택
                            </Label>
                            <Select
                              value={inventoryAdjustItemType}
                              onValueChange={setInventoryAdjustItemType}
                            >
                              <SelectTrigger className="bg-black/60 border-white/10 text-zinc-100">
                                <SelectValue placeholder="아이템 선택" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#18181B] border-white/10 text-white">
                                {inventoryAdjustItems.map((item) => (
                                  <SelectItem
                                    key={item.value}
                                    value={item.value}
                                    className="text-zinc-100 focus:bg-zinc-800"
                                  >
                                    {getRewardItemLabel(item.value)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">
                              수량 (+지급 -차감)
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
                            placeholder="예: 운영상 조정"
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
                              ? "처리 중.."
                              : "조정 실행"}
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
                                  {item.itemType} ??x{item.quantity}
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
                        보유 중인 ?�이?�이 ?�습?�다.
                      </div>
                    )}
                  </TabsContent>

                  {/* 3. 금고 (Vault) */}
                  <TabsContent value="vault" className="m-0 space-y-4">
                    <div className="flex justify-between items-center bg-[#18181B] p-4 rounded-xl border border-white/5">
                      <div>
                        <div className="text-sm text-zinc-500">보유 금고</div>
                        <div className="text-2xl font-mono text-white font-bold flex items-center gap-2">
                          <Vault className="w-6 h-6 text-emerald-400" />₩{" "}
                          {(user.vaultBalance || 0).toLocaleString()} P
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => {
                          setWalletEditorInitialType("VAULT");
                          setWalletEditorCategories(["VAULT"]);
                          setIsWalletEditorOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        금고 지�?차감
                      </Button>
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>

            {isWalletEditorOpen && (
              <WalletEditor
                isOpen={isWalletEditorOpen}
                onClose={() => setIsWalletEditorOpen(false)}
                userId={user.id}
                currentTickets={user.ticketBalance}
                currentVaultBalance={user.vaultBalance}
                initialTokenType={walletEditorInitialType}
                allowedCategories={walletEditorCategories}
                onUpdate={async (amt: number, reason: string, type: string) => {
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
          </>
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

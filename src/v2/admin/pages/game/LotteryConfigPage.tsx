import { useState, useEffect } from "react";
import {
  useLotteryConfig,
  useUpdateLotteryConfig,
  useUpdateLotteryPrize,
  useCreateLotteryPrize,
  useDeleteLotteryPrize,
} from "../../../hooks/useAdminGameConfig";
import {
  type AdminLotteryConfigDto,
  type AdminLotteryPrizeDto,
} from "../../../api/adminApi";
import { REWARD_ITEMS } from "../../../constants/rewardItems";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { Switch } from "../../../components/ui/switch";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Slider } from "../../../components/ui/slider";
import {
  Ticket,
  Save,
  Info,
  Settings,
  Grid2x2,
  Trophy,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";

export default function LotteryConfigPage() {
  const { data: config, isLoading } = useLotteryConfig();
  const updateConfigMutation = useUpdateLotteryConfig();
  const updatePrizeMutation = useUpdateLotteryPrize();
  const createPrizeMutation = useCreateLotteryPrize();
  const deletePrizeMutation = useDeleteLotteryPrize();

  const [localConfig, setLocalConfig] = useState<AdminLotteryConfigDto | null>(
    null,
  );

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleConfigChange = (
    field: keyof AdminLotteryConfigDto,
    value: any,
  ) => {
    if (localConfig) {
      setLocalConfig({ ...localConfig, [field]: value });
    }
  };

  const handlePrizeChangeLocal = (
    id: number,
    field: keyof AdminLotteryPrizeDto,
    value: any,
  ) => {
    if (!localConfig) return;
    const newPrizes = localConfig.prizes.map((p) =>
      p.id === id ? { ...p, [field]: value } : p,
    );
    setLocalConfig({ ...localConfig, prizes: newPrizes });
  };

  const handleSaveConfig = () => {
    if (!localConfig) return;
    updateConfigMutation.mutate(localConfig);
  };

  const handleUpdatePrize = (prizeId: number) => {
    if (!localConfig) return;
    const prize = localConfig.prizes.find((p) => p.id === prizeId);
    if (!prize) return;
    updatePrizeMutation.mutate({
      configId: localConfig.id,
      prizeId,
      data: prize,
    });
  };

  const handleAddPrize = () => {
    if (!localConfig) return;
    createPrizeMutation.mutate({
      configId: localConfig.id,
      data: {
        label: "새 보상",
        weight: 100,
        rewardType: "NONE",
        rewardAmount: 0,
        isActive: true,
      },
    });
  };

  const handleDeletePrize = (prizeId: number) => {
    if (!localConfig || !confirm("정말 이 보상을 삭제하시겠습니까?")) return;
    deletePrizeMutation.mutate({ configId: localConfig.id, prizeId });
  };

  if (isLoading)
    return (
      <div className="text-center py-20 text-zinc-500 animate-pulse font-mono tracking-widest uppercase">
        Initializing Strategy...
      </div>
    );
  if (!localConfig)
    return (
      <div className="text-center py-20 text-zinc-500">Config Load Failed</div>
    );

  const activePrizes = localConfig.prizes.filter((p) => p.isActive);
  const totalWeight = activePrizes.reduce((sum, p) => sum + p.weight, 0) || 1;

  return (
    <div className="admin-page-container custom-scrollbar">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-white">
            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <Ticket className="w-8 h-8 text-purple-400" />
            </div>
            복권 시스템 제어
          </h1>
          <p className="text-zinc-400 mt-2 ml-1">
            즉석 복권의 당첨 확률, 재고 및 이벤트를 실시간으로 관리합니다.
          </p>
        </div>
        <Button
          onClick={handleSaveConfig}
          disabled={updateConfigMutation.isPending}
          className="btn-admin-primary px-8 h-12 shadow-purple-500/10"
        >
          <Save className="w-4 h-4 mr-2" />
          {updateConfigMutation.isPending ? "저장 중..." : "전역 설정 저장"}
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6 pb-20">
        {/* Bento Box 1: Global Settings */}
        <Card className="col-span-12 lg:col-span-4 admin-card-premium flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <Settings className="w-5 h-5 text-zinc-400" />
              기본 운영 환경
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-colors">
              <div className="space-y-0.5">
                <Label className="text-base text-zinc-200 font-bold">
                  복권 서비스 활성화
                </Label>
                <p className="text-xs text-zinc-500 italic">
                  비활성 시 상점에서 상품이 숨겨집니다.
                </p>
              </div>
              <Switch
                checked={localConfig.isActive}
                onCheckedChange={(v) => handleConfigChange("isActive", v)}
              />
            </div>

            <div className="space-y-3">
              <Label className="admin-label">전략 식별명</Label>
              <Input
                value={localConfig.name}
                onChange={(e) => handleConfigChange("name", e.target.value)}
                className="admin-input w-full bg-black/40 border-white/5"
                placeholder="전략 이름 입력..."
              />
            </div>

            <div className="space-y-3">
              <Label className="admin-label">유저별 일일 구매 한도</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={localConfig.maxDailyPlays}
                  onChange={(e) =>
                    handleConfigChange(
                      "maxDailyPlays",
                      parseInt(e.target.value),
                    )
                  }
                  className="admin-input w-full pr-12 text-zinc-200 font-mono"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-bold">
                  TICKET
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <Grid2x2 className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-bold text-purple-400 uppercase tracking-widest">
                  Puzzle Event
                </span>
              </div>
              <div className="p-5 rounded-2xl bg-purple-500/5 border border-purple-500/10 space-y-4">
                <div className="flex justify-between items-end">
                  <Label className="text-zinc-400 text-[10px] font-black uppercase">
                    Drop Probability
                  </Label>
                  <span className="text-2xl font-mono font-black text-purple-400 tracking-tighter">
                    {localConfig.puzzlePieceProbability}%
                  </span>
                </div>
                <Slider
                  value={[localConfig.puzzlePieceProbability]}
                  max={100}
                  step={0.1}
                  onValueChange={(vals) =>
                    handleConfigChange("puzzlePieceProbability", vals[0])
                  }
                  className="py-2"
                />
                <div className="flex items-center gap-2 p-2 bg-purple-500/10 rounded-lg">
                  <Info className="w-3 h-3 text-purple-400 shrink-0" />
                  <p className="text-[10px] text-purple-300/80 leading-tight">
                    복권 플레이 시 보너스 퍼즐 조각이 드랍될 확률입니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex flex-col items-center justify-center py-6 bg-gradient-to-b from-transparent to-zinc-900/50 rounded-b-xl">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-blue-400 animate-pulse" />
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                  Active Total Weight
                </span>
              </div>
              <div className="text-5xl font-black font-mono text-zinc-100 tracking-tighter shadow-blue-500/50 drop-shadow-xl">
                {totalWeight}
              </div>
              <p className="text-[10px] text-zinc-600 mt-2">
                비활성화된 보상은 계산에서 제외됩니다.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bento Box 2: Prize Table */}
        <Card className="col-span-12 lg:col-span-8 admin-card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-zinc-100">
                <Trophy className="w-5 h-5 text-amber-500" />
                당첨 보상 매트릭스
              </CardTitle>
              <CardDescription className="text-zinc-500 mt-1">
                각 보상의 가중치(확률)와 현재 재고를 정밀하게 제어합니다.
              </CardDescription>
            </div>
            <Button
              onClick={handleAddPrize}
              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 h-9 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 mr-2" />
              보상 추가
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-white/5 overflow-hidden">
              <Table>
                <TableHeader className="bg-zinc-900/80">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="w-[60px] text-center text-zinc-500 font-bold text-[10px] uppercase">
                      Status
                    </TableHead>
                    <TableHead className="text-zinc-500 font-bold text-[10px] uppercase">
                      Prize Label
                    </TableHead>
                    <TableHead className="text-zinc-500 font-bold text-[10px] uppercase">
                      Reward Type
                    </TableHead>
                    <TableHead className="text-zinc-500 font-bold text-[10px] uppercase text-right">
                      Value
                    </TableHead>
                    <TableHead className="w-[80px] text-center text-zinc-500 font-bold text-[10px] uppercase">
                      Stock
                    </TableHead>
                    <TableHead className="w-[100px] text-center text-zinc-500 font-bold text-[10px] uppercase">
                      Weight
                    </TableHead>
                    <TableHead className="w-[80px] text-right text-zinc-500 font-bold text-[10px] uppercase">
                      Prob%
                    </TableHead>
                    <TableHead className="w-[80px] text-center text-zinc-500 font-bold text-[10px] uppercase">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localConfig.prizes.map((prize) => {
                    const probability = prize.isActive
                      ? ((prize.weight / totalWeight) * 100).toFixed(2)
                      : "0.00";
                    return (
                      <TableRow
                        key={prize.id}
                        className="border-white/5 hover:bg-white/5 group transition-colors"
                      >
                        <TableCell className="text-center">
                          <Switch
                            checked={prize.isActive}
                            onCheckedChange={(v) =>
                              handlePrizeChangeLocal(prize.id, "isActive", v)
                            }
                            className="scale-75 data-[state=checked]:bg-emerald-500"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={prize.label}
                            onChange={(e) =>
                              handlePrizeChangeLocal(
                                prize.id,
                                "label",
                                e.target.value,
                              )
                            }
                            className={`h-9 bg-transparent border-transparent hover:border-white/10 w-full font-bold transition-all ${!prize.isActive ? "text-zinc-600 line-through" : "text-zinc-200"}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={prize.rewardType}
                            onValueChange={(v) =>
                              handlePrizeChangeLocal(prize.id, "rewardType", v)
                            }
                          >
                            <SelectTrigger className="h-9 bg-black/40 border-white/5 hover:border-white/10 w-full text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#18181b] border-white/10 text-zinc-200">
                              {REWARD_ITEMS.map((item) => (
                                <SelectItem
                                  key={item.value}
                                  value={item.value}
                                  className="text-xs hover:bg-white/5"
                                >
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={prize.rewardAmount}
                            onChange={(e) =>
                              handlePrizeChangeLocal(
                                prize.id,
                                "rewardAmount",
                                parseFloat(e.target.value),
                              )
                            }
                            className="h-9 bg-transparent border-transparent text-right font-mono font-bold text-zinc-100 group-hover:bg-black/40 group-hover:border-white/5"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="relative flex justify-center">
                            <Input
                              type="number"
                              placeholder="∞"
                              value={prize.stock ?? ""}
                              onChange={(e) => {
                                const val =
                                  e.target.value === ""
                                    ? undefined
                                    : parseInt(e.target.value);
                                handlePrizeChangeLocal(prize.id, "stock", val);
                              }}
                              className={`h-9 bg-zinc-900/50 border-white/5 w-[64px] text-center font-mono text-xs ${prize.stock === 0 ? "text-red-500 animate-pulse" : "text-zinc-400"}`}
                            />
                            {prize.stock === undefined && (
                              <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-600 font-black">
                                ∞
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={prize.weight}
                            onChange={(e) =>
                              handlePrizeChangeLocal(
                                prize.id,
                                "weight",
                                parseInt(e.target.value),
                              )
                            }
                            className="h-9 bg-zinc-900 border-white/5 w-full font-black text-amber-500 text-center font-mono"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`text-xs font-mono font-bold ${prize.isActive ? "text-emerald-400" : "text-zinc-600"}`}
                          >
                            {probability}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleUpdatePrize(prize.id)}
                              className="h-8 w-8 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                              title="저장"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeletePrize(prize.id)}
                              className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="mt-6 p-4 bg-zinc-900/50 border border-white/5 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Info className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-zinc-200">
                  데이터 동기화 알림
                </h4>
                <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">
                  각 보상 행의 저장 버튼을 누르면 즉시 DB에 반영됩니다. 상단
                  '전역 설정 저장'은 이름, 활성 상태, 일일 한도 전용입니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

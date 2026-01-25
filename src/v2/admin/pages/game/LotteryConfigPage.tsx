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
  Loader2,
  Plus,
  Save,
  Trash2,
  RefreshCw,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";

export default function LotteryConfigPage() {
  const { data: config, isLoading, refetch } = useLotteryConfig();
  const updateConfig = useUpdateLotteryConfig();
  const updatePrize = useUpdateLotteryPrize();
  const createPrize = useCreateLotteryPrize();
  const deletePrize = useDeleteLotteryPrize();

  const [localConfig, setLocalConfig] = useState<AdminLotteryConfigDto | null>(
    null,
  );
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
      setIsDirty(false);
    }
  }, [config]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!localConfig) return <div>Failed to load config</div>;

  const handleConfigChange = (
    field: keyof AdminLotteryConfigDto,
    value: any,
  ) => {
    setLocalConfig((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
    setIsDirty(true);
  };

  const handleSaveConfig = async () => {
    if (!localConfig) return;
    await updateConfig.mutateAsync(localConfig);
    setIsDirty(false);
    await refetch();
  };

  const handlePrizeChangeLocal = (
    prizeId: number,
    field: keyof AdminLotteryPrizeDto,
    value: any,
  ) => {
    setLocalConfig((prev) => {
      if (!prev) return null;
      const newPrizes = prev.prizes.map((p) =>
        p.id === prizeId ? { ...p, [field]: value } : p,
      );
      return { ...prev, prizes: newPrizes };
    });
  };

  const handleSavePrize = async (prize: AdminLotteryPrizeDto) => {
    if (!localConfig) return;
    await updatePrize.mutateAsync({
      configId: localConfig.id,
      prizeId: prize.id,
      data: prize,
    });
    await refetch();
  };

  const handleCreatePrize = async () => {
    if (!localConfig) return;
    await createPrize.mutateAsync({
      configId: localConfig.id,
      data: {
        label: "New Prize",
        weight: 10,
        rewardType: "NONE",
        rewardAmount: 0,
        isActive: false,
        stock: undefined, // Unlimited
      },
    });
    await refetch();
  };

  const handleDeletePrize = async (prizeId: number) => {
    if (!localConfig) return;
    if (!confirm("정말 이 경품을 삭제하시겠습니까?")) return;
    await deletePrize.mutateAsync({
      configId: localConfig.id,
      prizeId,
    });
    await refetch();
  };

  return (
    <div className="space-y-8 p-6 pb-20 max-w-[1600px] mx-auto text-white">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            로또(Lottery) 설정
          </h1>
          <p className="text-zinc-400">
            일일 로또 이벤트의 당첨 확률과 경품을 설정합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-white/10 hover:bg-white/5"
            onClick={() => refetch()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={!isDirty}
            onClick={handleSaveConfig}
          >
            <Save className="w-4 h-4 mr-2" />
            기본 설정 저장
          </Button>
        </div>
      </div>

      {/* Basic Settings */}
      <Card className="bg-zinc-900 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            기본 설정
            {isDirty && (
              <Badge
                variant="outline"
                className="text-amber-400 border-amber-500/50"
              >
                변경사항 있음
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            게임 활성화 여부 및 기본 규칙을 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-zinc-400">티켓 타입</Label>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-white/10 text-zinc-200"
              >
                LOTTERY_TICKET (고정)
              </Badge>
              <span className="text-xs text-zinc-500">
                복권은 1종 고정입니다.
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-400">활성화 상태</Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={localConfig.isActive}
                onCheckedChange={(checked) =>
                  handleConfigChange("isActive", checked)
                }
              />
              <span
                className={
                  localConfig.isActive
                    ? "text-emerald-400 font-bold"
                    : "text-zinc-500"
                }
              >
                {localConfig.isActive ? "운영중 (Active)" : "중지됨 (Inactive)"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-400">게임 이름</Label>
            <Input
              value={localConfig.name}
              onChange={(e) => handleConfigChange("name", e.target.value)}
              className="bg-black/20 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-400">일일 최대 참여 횟수</Label>
            <Input
              type="number"
              value={localConfig.maxDailyPlays}
              onChange={(e) =>
                handleConfigChange("maxDailyPlays", parseInt(e.target.value))
              }
              className="bg-black/20 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-400">퍼즐 조각 드랍 확률 (%)</Label>
            <div className="relative">
              <Input
                type="number"
                value={localConfig.puzzlePieceProbability}
                onChange={(e) =>
                  handleConfigChange(
                    "puzzlePieceProbability",
                    parseInt(e.target.value),
                  )
                }
                className="bg-black/20 border-white/10 pr-8"
              />
              <span className="absolute right-3 top-2.5 text-zinc-500">%</span>
            </div>
            <p className="text-xs text-zinc-500">
              꽝이 나올 때 퍼즐 조각을 획득할 확률입니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Prize List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            경품 목록 (Prize List)
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
              총 {localConfig.prizes.length}개
            </Badge>
          </h2>
          <Button
            onClick={handleCreatePrize}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            경품 추가
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {localConfig.prizes.map((prize) => (
            <Card
              key={prize.id}
              className="bg-zinc-900 border-white/10 overflow-hidden"
            >
              <CardContent className="p-0">
                <div className="flex items-center gap-4 p-4">
                  {/* Status Toggle */}
                  <div className="flex flex-col items-center gap-2">
                    <Switch
                      checked={prize.isActive}
                      onCheckedChange={(checked) =>
                        handlePrizeChangeLocal(prize.id, "isActive", checked)
                      }
                    />
                    <span
                      className={`text-[10px] uppercase font-bold ${prize.isActive ? "text-emerald-500" : "text-zinc-600"}`}
                    >
                      {prize.isActive ? "ON" : "OFF"}
                    </span>
                  </div>

                  {/* Main Settings Form */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    {/* Label */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-500">
                        경품명 (Label)
                      </Label>
                      <Input
                        value={prize.label}
                        onChange={(e) =>
                          handlePrizeChangeLocal(
                            prize.id,
                            "label",
                            e.target.value,
                          )
                        }
                        className="h-8 bg-black/20 border-white/10"
                      />
                    </div>

                    {/* Weight */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-500">
                        가중치 (Weight)
                      </Label>
                      <div className="relative">
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
                          className="h-8 bg-black/20 border-white/10 font-mono"
                        />
                        {prize.weight === 0 && (
                          <AlertTriangle className="absolute right-2 top-2 w-4 h-4 text-amber-500 opacity-50" />
                        )}
                      </div>
                    </div>

                    {/* Stock */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-500">
                        재고 (Stock)
                      </Label>
                      <Input
                        type="number"
                        placeholder="무제한"
                        value={prize.stock ?? ""}
                        onChange={(e) => {
                          const val =
                            e.target.value === ""
                              ? undefined
                              : parseInt(e.target.value);
                          handlePrizeChangeLocal(prize.id, "stock", val);
                        }}
                        className="h-8 bg-black/20 border-white/10 font-mono placeholder:text-zinc-700"
                      />
                    </div>

                    {/* Reward Type / Amount */}
                    <div className="flex gap-2">
                      <div className="space-y-1.5 flex-1">
                        <Label className="text-xs text-zinc-500">
                          보상 타입
                        </Label>
                        <Select
                          value={prize.rewardType}
                          onValueChange={(v) =>
                            handlePrizeChangeLocal(prize.id, "rewardType", v)
                          }
                        >
                          <SelectTrigger className="h-8 bg-black/20 border-white/10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-800 border-zinc-700">
                            {REWARD_ITEMS.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 w-[80px]">
                        <Label className="text-xs text-zinc-500">수량</Label>
                        <Input
                          type="number"
                          value={prize.rewardAmount}
                          onChange={(e) =>
                            handlePrizeChangeLocal(
                              prize.id,
                              "rewardAmount",
                              parseInt(e.target.value),
                            )
                          }
                          className="h-8 bg-black/20 border-white/10 text-right"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pl-4 border-l border-white/5">
                    <Button
                      size="sm"
                      className="h-8 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      onClick={() => handleSavePrize(prize)}
                    >
                      저장
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-900 hover:text-red-500 hover:bg-red-950/30"
                      onClick={() => handleDeletePrize(prize.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {/* Footer Info */}
                <div className="bg-black/20 px-4 py-2 flex items-center gap-4 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    개별 저장 필요
                  </span>
                  <span>ID: {prize.id}</span>
                  {prize.stock !== undefined && prize.stock !== null && (
                    <span
                      className={
                        (prize.stock ?? 0) <= 0 ? "text-red-500 font-bold" : ""
                      }
                    >
                      {(prize.stock ?? 0) <= 0
                        ? "재고 소진 (발급 불가)"
                        : `남은 재고: ${prize.stock}`}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  useDiceConfig,
  useUpdateDiceConfig,
} from "../../../hooks/useAdminGameConfig";
import { type AdminDiceConfigDto } from "../../../api/adminApi";
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
import { Badge } from "../../../components/ui/badge";
import { Loader2, Save, RefreshCw } from "lucide-react";

export default function DiceConfigPage() {
  const { data: config, isLoading, refetch } = useDiceConfig();
  const updateConfig = useUpdateDiceConfig();

  const [localConfig, setLocalConfig] = useState<AdminDiceConfigDto | null>(
    null,
  );
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
      setIsDirty(false);
    }
  }, [config]);

  const handleConfigChange = (field: keyof AdminDiceConfigDto, value: any) => {
    setLocalConfig((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!localConfig) return;

    // Validation: Probabilities sum check
    const sum =
      (localConfig.winProbability || 0) +
      (localConfig.drawProbability || 0) +
      (localConfig.loseProbability || 0);

    // Float comparison tolerance
    if (Math.abs(sum - 100) > 0.01) {
      if (
        !confirm(
          `확률의 합이 ${sum.toFixed(2)}% 입니다. 100%가 아니어도 저장하시겠습니까?`,
        )
      ) {
        return;
      }
    }

    await updateConfig.mutateAsync(localConfig);
    setIsDirty(false);
    await refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!localConfig) {
    return (
      <div className="flex items-center justify-center h-96 text-zinc-500">
        설정을 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 pb-20 max-w-[1600px] mx-auto text-white">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            주사위(Dice) 설정
          </h1>
          <p className="text-zinc-400">
            주사위 게임의 승률, 보상 및 골든 아워 설정을 관리합니다.
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
            onClick={handleSave}
          >
            <Save className="w-4 h-4 mr-2" />
            저장
          </Button>
        </div>
      </div>

      <div className="space-y-6">
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
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
                  {localConfig.isActive
                    ? "운영중 (Active)"
                    : "중지됨 (Inactive)"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">이름</Label>
              <Input
                value={localConfig.name}
                onChange={(e) => handleConfigChange("name", e.target.value)}
                className="bg-black/20 border-white/10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">일일 최대 이용 횟수</Label>
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
              <Label className="text-zinc-400">
                일일 최대 수익 제한 (Point)
              </Label>
              <Input
                type="number"
                value={localConfig.dailyGainCap}
                onChange={(e) =>
                  handleConfigChange("dailyGainCap", parseInt(e.target.value))
                }
                className="bg-black/20 border-white/10 font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Probabilities */}
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">확률 설정 (%)</CardTitle>
            <CardDescription>
              승리, 무승부, 패배 확률의 합은 100%가 되어야 합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-emerald-400 font-bold">승리 (Win)</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={localConfig.winProbability}
                  onChange={(e) =>
                    handleConfigChange(
                      "winProbability",
                      parseFloat(e.target.value),
                    )
                  }
                  className="bg-black/20 border-emerald-500/30 text-emerald-400 font-mono"
                />
                <span className="absolute right-3 top-2.5 text-emerald-500/50">
                  %
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-amber-400 font-bold">무승부 (Draw)</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={localConfig.drawProbability}
                  onChange={(e) =>
                    handleConfigChange(
                      "drawProbability",
                      parseFloat(e.target.value),
                    )
                  }
                  className="bg-black/20 border-amber-500/30 text-amber-400 font-mono"
                />
                <span className="absolute right-3 top-2.5 text-amber-500/50">
                  %
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-red-400 font-bold">패배 (Lose)</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={localConfig.loseProbability}
                  onChange={(e) =>
                    handleConfigChange(
                      "loseProbability",
                      parseFloat(e.target.value),
                    )
                  }
                  className="bg-black/20 border-red-500/30 text-red-400 font-mono"
                />
                <span className="absolute right-3 top-2.5 text-red-500/50">
                  %
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rewards */}
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">보상 설정</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Win Reward */}
              <div className="p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-xl space-y-3">
                <Label className="text-emerald-400">승리 보상</Label>
                <Select
                  value={localConfig.winRewardType}
                  onValueChange={(v) => handleConfigChange("winRewardType", v)}
                >
                  <SelectTrigger className="bg-black/20 border-white/10">
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
                <Input
                  type="number"
                  value={localConfig.winRewardAmount}
                  onChange={(e) =>
                    handleConfigChange(
                      "winRewardAmount",
                      parseInt(e.target.value),
                    )
                  }
                  className="bg-black/20 border-white/10"
                  placeholder="Amount"
                />
              </div>

              {/* Draw Reward */}
              <div className="p-4 border border-amber-500/20 bg-amber-500/5 rounded-xl space-y-3">
                <Label className="text-amber-400">무승부 보상</Label>
                <Select
                  value={localConfig.drawRewardType}
                  onValueChange={(v) => handleConfigChange("drawRewardType", v)}
                >
                  <SelectTrigger className="bg-black/20 border-white/10">
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
                <Input
                  type="number"
                  value={localConfig.drawRewardAmount}
                  onChange={(e) =>
                    handleConfigChange(
                      "drawRewardAmount",
                      parseInt(e.target.value),
                    )
                  }
                  className="bg-black/20 border-white/10"
                  placeholder="Amount"
                />
              </div>

              {/* Lose Reward */}
              <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-xl space-y-3">
                <Label className="text-red-400">패배 보상 (위로금)</Label>
                <Select
                  value={localConfig.loseRewardType}
                  onValueChange={(v) => handleConfigChange("loseRewardType", v)}
                >
                  <SelectTrigger className="bg-black/20 border-white/10">
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
                <Input
                  type="number"
                  value={localConfig.loseRewardAmount}
                  onChange={(e) =>
                    handleConfigChange(
                      "loseRewardAmount",
                      parseInt(e.target.value),
                    )
                  }
                  className="bg-black/20 border-white/10"
                  placeholder="Amount"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Golden Hour */}
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              골든 아워 (Golden Hour)
              <Badge
                variant="outline"
                className="border-yellow-500 text-yellow-500"
              >
                Event
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">이벤트 활성화</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={localConfig.enableGoldenHour}
                  onCheckedChange={(checked) =>
                    handleConfigChange("enableGoldenHour", checked)
                  }
                />
                <span
                  className={
                    localConfig.enableGoldenHour
                      ? "text-yellow-400 font-bold"
                      : "text-zinc-500"
                  }
                >
                  {localConfig.enableGoldenHour
                    ? "골든 아워 켜짐"
                    : "골든 아워 꺼짐"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">
                승리 보상 배율 (Multiplier)
              </Label>
              <Input
                type="number"
                step="0.1"
                value={localConfig.goldenHourMultiplier}
                onChange={(e) =>
                  handleConfigChange(
                    "goldenHourMultiplier",
                    parseFloat(e.target.value),
                  )
                }
                className="bg-black/20 border-white/10 font-mono text-yellow-400"
              />
              <p className="text-xs text-zinc-500">
                골든 아워 기간 동안 보상에 적용될 배율입니다.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">시작 시간 (KST)</Label>
              <Input
                type="time"
                step="1"
                value={(
                  localConfig.goldenHourStartTime || "21:30:00"
                ).substring(0, 5)}
                onChange={(e) =>
                  handleConfigChange(
                    "goldenHourStartTime",
                    e.target.value + ":00",
                  )
                }
                className="bg-black/20 border-white/10 font-mono text-yellow-400"
              />
              <p className="text-xs text-zinc-500">
                골든 아워 시작 시간 (예: 21:30)
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-400">종료 시간 (KST)</Label>
              <Input
                type="time"
                step="1"
                value={(localConfig.goldenHourEndTime || "22:30:00").substring(
                  0,
                  5,
                )}
                onChange={(e) =>
                  handleConfigChange(
                    "goldenHourEndTime",
                    e.target.value + ":00",
                  )
                }
                className="bg-black/20 border-white/10 font-mono text-yellow-400"
              />
              <p className="text-xs text-zinc-500">
                골든 아워 종료 시간 (예: 22:30)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

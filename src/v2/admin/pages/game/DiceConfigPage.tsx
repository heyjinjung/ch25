import { useEffect, useRef, useState } from "react";
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
import {
  Dice5,
  Save,
  TriangleAlert,
  Settings2,
  Zap,
  TrendingUp,
  Trophy,
  Info,
} from "lucide-react";

export default function DiceConfigPage() {
  const { data: config, isLoading } = useDiceConfig();
  const updateMutation = useUpdateDiceConfig();

  const [localConfig, setLocalConfig] = useState<AdminDiceConfigDto | null>(
    null,
  );
  const winBarRef = useRef<HTMLDivElement | null>(null);
  const drawBarRef = useRef<HTMLDivElement | null>(null);
  const loseBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (config) {
      setLocalConfig({
        ...config,
        enableGoldenHour: config.enableGoldenHour ?? true,
        goldenHourMultiplier: config.goldenHourMultiplier ?? 2.0,
      });
    }
  }, [config]);

  useEffect(() => {
    if (!localConfig) return;
    if (winBarRef.current) {
      winBarRef.current.style.width = `${localConfig.winProbability * 100}%`;
    }
    if (drawBarRef.current) {
      drawBarRef.current.style.width = `${localConfig.drawProbability * 100}%`;
    }
    if (loseBarRef.current) {
      loseBarRef.current.style.width = `${localConfig.loseProbability * 100}%`;
    }
  }, [localConfig]);

  const handleChange = (field: keyof AdminDiceConfigDto, value: any) => {
    if (localConfig) {
      setLocalConfig({ ...localConfig, [field]: value });
    }
  };

  const handleSave = () => {
    if (localConfig) {
      updateMutation.mutate(localConfig);
    }
  };

  if (isLoading)
    return (
      <div className="text-center py-20 text-zinc-500 animate-pulse">
        Loading config...
      </div>
    );
  if (!localConfig)
    return (
      <div className="text-center py-20 text-zinc-500">Config Load Failed</div>
    );

  return (
    <div className="admin-page-container custom-scrollbar">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-white">
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <Dice5 className="w-8 h-8 text-indigo-400" />
            </div>
            주사위 게임 설정
          </h1>
          <p className="text-zinc-400 mt-2 ml-1">
            전역 전략, 승률 및 보상 시스템을 관리합니다.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="btn-admin-primary px-8 h-12 shadow-indigo-500/10"
        >
          <Save className="w-4 h-4 mr-2" />
          {updateMutation.isPending ? "저장 중..." : "설정 변경사항 저장"}
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6 pb-20">
        {/* Row 1: Basic (4) + Probability (8) */}
        <Card className="col-span-12 lg:col-span-4 admin-card-premium flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <Settings2 className="w-5 h-5 text-zinc-400" />
              기본 운영 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-colors">
              <div className="space-y-0.5">
                <Label className="text-base text-zinc-200">
                  게임 서비스 활성화
                </Label>
                <p className="text-xs text-zinc-500">
                  비활성화 시 모든 유저의 진입이 차단됩니다.
                </p>
              </div>
              <Switch
                checked={localConfig.isActive}
                onCheckedChange={(c) => handleChange("isActive", c)}
              />
            </div>

            <div className="space-y-3">
              <Label className="admin-label">전략 설정명</Label>
              <Input
                value={localConfig.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="admin-input w-full"
                placeholder="예: 2026 신년 이벤트 전략"
              />
            </div>

            <div className="space-y-3">
              <Label className="admin-label">일일 최대 플레이 횟수</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={localConfig.maxDailyPlays}
                  onChange={(e) =>
                    handleChange("maxDailyPlays", parseInt(e.target.value))
                  }
                  className="admin-input w-full pr-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">
                  회
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 italic">
                * 0으로 입력 시 무제한 플레이가 가능합니다.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-8 admin-card-premium">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-zinc-100">
                <Zap className="w-5 h-5 text-amber-400" />
                승률 전략 (Probability System)
              </CardTitle>
              <CardDescription className="text-zinc-500 mt-1">
                확률 총합이 1.0(100%)이 되도록 정밀하게 조정하세요.
              </CardDescription>
            </div>
            <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] text-amber-400 font-bold uppercase tracking-wider">
              Simulation Mode
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-6">
            {/* Probability Inputs - No more heavy backgrounds */}
            <div className="space-y-3 group">
              <div className="flex justify-between items-center px-1">
                <Label className="text-emerald-400 font-bold text-xs uppercase tracking-tighter">
                  Win Rate
                </Label>
                <span className="text-xl font-mono font-black text-emerald-400">
                  {(localConfig.winProbability * 100).toFixed(0)}%
                </span>
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={localConfig.winProbability}
                onChange={(e) =>
                  handleChange("winProbability", parseFloat(e.target.value))
                }
                className="admin-input border-emerald-500/20 focus:ring-emerald-500/30 text-emerald-400 font-mono text-center text-lg"
              />
              <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  ref={winBarRef}
                  className="h-full bg-emerald-500 transition-all duration-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <Label className="text-zinc-400 font-bold text-xs uppercase tracking-tighter">
                  Draw Rate
                </Label>
                <span className="text-xl font-mono font-black text-zinc-400">
                  {(localConfig.drawProbability * 100).toFixed(0)}%
                </span>
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={localConfig.drawProbability}
                onChange={(e) =>
                  handleChange("drawProbability", parseFloat(e.target.value))
                }
                className="admin-input border-white/5 focus:ring-zinc-500/30 text-zinc-300 font-mono text-center text-lg"
              />
              <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  ref={drawBarRef}
                  className="h-full bg-zinc-500 transition-all duration-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <Label className="text-red-400 font-bold text-xs uppercase tracking-tighter">
                  Lose Rate
                </Label>
                <span className="text-xl font-mono font-black text-red-400">
                  {(localConfig.loseProbability * 100).toFixed(0)}%
                </span>
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={localConfig.loseProbability}
                onChange={(e) =>
                  handleChange("loseProbability", parseFloat(e.target.value))
                }
                className="admin-input border-red-500/20 focus:ring-red-500/30 text-red-400 font-mono text-center text-lg"
              />
              <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  ref={loseBarRef}
                  className="h-full bg-red-500 transition-all duration-500"
                />
              </div>
            </div>

            <div className="col-span-3 mt-4">
              <div
                className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
                  Math.abs(
                    localConfig.winProbability +
                      localConfig.drawProbability +
                      localConfig.loseProbability -
                      1.0,
                  ) < 0.001
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/5 border-red-500/20 text-red-400 animate-pulse"
                }`}
              >
                <TriangleAlert className="w-5 h-5 shrink-0" />
                <div className="text-sm">
                  현재 확률 총합:{" "}
                  <span className="font-mono font-bold">
                    {(
                      localConfig.winProbability +
                      localConfig.drawProbability +
                      localConfig.loseProbability
                    ).toFixed(2)}
                  </span>
                  {Math.abs(
                    localConfig.winProbability +
                      localConfig.drawProbability +
                      localConfig.loseProbability -
                      1.0,
                  ) < 0.001
                    ? " - 완벽한 비율입니다."
                    : " - 총합이 1.0이 되도록 조정이 필요합니다."}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 2: Rewards (8) + Caps (4) */}
        <Card className="col-span-12 lg:col-span-8 admin-card-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <Trophy className="w-5 h-5 text-emerald-400" />
              결과별 보상 매트릭스
            </CardTitle>
            <CardDescription className="text-zinc-500">
              게임 결과에 따른 보상 아이템과 수량을 설정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Reward Row - Refined with Mono colors and glass look */}
            {[
              {
                label: "승리 (WIN)",
                typeField: "winRewardType" as const,
                amountField: "winRewardAmount" as const,
                color: "emerald",
              },
              {
                label: "무승부 (DRAW)",
                typeField: "drawRewardType" as const,
                amountField: "drawRewardAmount" as const,
                color: "zinc",
              },
              {
                label: "패배 (LOSE)",
                typeField: "loseRewardType" as const,
                amountField: "loseRewardAmount" as const,
                color: "red",
              },
            ].map((row) => (
              <div
                key={row.label}
                className={`flex items-center gap-6 p-4 rounded-2xl bg-[#1c1c20] border border-white/5 transition-all hover:bg-[#222226]`}
              >
                <div className="w-32">
                  <Label
                    className={`text-${row.color}-400 font-black text-sm uppercase tracking-tight`}
                  >
                    {row.label}
                  </Label>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <Select
                    value={localConfig[row.typeField]}
                    onValueChange={(v) => handleChange(row.typeField, v)}
                  >
                    <SelectTrigger className="admin-input border-white/5 bg-black/40 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      {REWARD_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Input
                      type="number"
                      value={localConfig[row.amountField]}
                      onChange={(e) =>
                        handleChange(row.amountField, parseInt(e.target.value))
                      }
                      className={`admin-input border-white/5 bg-black/40 h-10 text-right pr-12 font-bold text-${row.color}-400`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 font-bold uppercase">
                      Value
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Golden Hour Multiplier Card */}
        <Card className="col-span-12 lg:col-span-4 admin-card-premium flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <Zap className="w-5 h-5 text-amber-400" />
              골든아워 배율 설정
            </CardTitle>
            <CardDescription className="text-zinc-500">
              특정 시간대 보상을 배율만큼 증폭합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            <div className="flex items-center justify-between p-4 bg-amber-500/5 rounded-xl border border-amber-500/10 group hover:border-amber-500/20 transition-colors">
              <div className="space-y-0.5">
                <Label className="text-base text-zinc-200">골든아워 적용</Label>
                <p className="text-xs text-zinc-500">
                  비활성화 시 배율이 적용되지 않습니다.
                </p>
              </div>
              <Switch
                checked={localConfig.enableGoldenHour}
                onCheckedChange={(c) => handleChange("enableGoldenHour", c)}
              />
            </div>

            <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-4">
              <div className="flex justify-between items-end">
                <Label className="text-zinc-300 text-xs font-bold">
                  보상 배율 (Multiplier)
                </Label>
                <span className="text-3xl font-mono font-black text-amber-400 tracking-tighter">
                  ×{localConfig.goldenHourMultiplier.toFixed(1)}
                </span>
              </div>
              <Input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={localConfig.goldenHourMultiplier}
                onChange={(e) =>
                  handleChange(
                    "goldenHourMultiplier",
                    parseFloat(e.target.value),
                  )
                }
                className="admin-input border-amber-500/20 bg-black/30 w-full h-12 text-center text-xl font-mono"
              />
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  골든아워 활성화 시 모든 주사위 보상에 이 배율이 곱해집니다.
                  (예: 100P × 2.0 = 200P)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-4 admin-card-premium flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-100">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              경제 안정성 (Global Caps)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 flex-1">
            <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
              <div className="flex justify-between items-end">
                <Label className="text-zinc-300 text-xs font-bold">
                  일일 누적 획득 한도
                </Label>
                <span className="text-2xl font-mono font-black text-indigo-400 tracking-tighter">
                  {localConfig.dailyGainCap.toLocaleString()}
                </span>
              </div>
              <Input
                type="number"
                value={localConfig.dailyGainCap}
                onChange={(e) =>
                  handleChange("dailyGainCap", parseInt(e.target.value))
                }
                className="admin-input border-indigo-500/20 bg-black/30 w-full h-12 text-center text-xl font-mono"
              />
              <div className="flex items-start gap-2 p-3 bg-indigo-500/10 rounded-lg">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-300/80 leading-relaxed">
                  유저가 24시간 내에 획득 가능한 총량입니다. 초과 시 보상이
                  지급되지 않습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

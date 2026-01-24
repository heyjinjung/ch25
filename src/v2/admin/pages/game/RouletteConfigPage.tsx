import { useState, useEffect } from "react";
import {
  useRouletteConfigs,
  useUpdateRouletteConfig,
} from "../../../hooks/useAdminGameConfig";
import {
  type AdminRouletteConfigDto,
  type AdminRouletteSegmentDto,
  type RouletteGrade,
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
import { Badge } from "../../../components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Loader2, Save, RefreshCw, AlertTriangle } from "lucide-react";

export default function RouletteConfigPage() {
  const { data: configs, isLoading, refetch } = useRouletteConfigs();
  const updateConfig = useUpdateRouletteConfig();

  const [selectedGrade, setSelectedGrade] = useState<RouletteGrade>("COMMON");
  const [localConfig, setLocalConfig] = useState<AdminRouletteConfigDto | null>(
    null,
  );
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (configs) {
      const config = configs.find((c) => c.grade === selectedGrade);
      setLocalConfig(config || null);
      setIsDirty(false);
    }
  }, [configs, selectedGrade]);

  const handleConfigChange = (
    field: keyof AdminRouletteConfigDto,
    value: any,
  ) => {
    setLocalConfig((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
    setIsDirty(true);
  };

  const handleSegmentChange = (
    index: number,
    field: keyof AdminRouletteSegmentDto,
    value: any,
  ) => {
    setLocalConfig((prev) => {
      if (!prev) return null;
      const newSegments = [...prev.segments];
      newSegments[index] = { ...newSegments[index], [field]: value };
      return { ...prev, segments: newSegments };
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!localConfig) return;
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

  // If no config found for grade, standard handling
  if (!localConfig && configs && configs.length > 0) {
    // Fallback or empty state
  }

  return (
    <div className="space-y-8 p-6 pb-20 max-w-[1600px] mx-auto text-white">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            룰렛(Roulette) 설정
          </h1>
          <p className="text-zinc-400">
            등급별(Common, VIP, Whale) 룰렛의 확률과 보상을 설정합니다.
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

      {/* Grade Tabs */}
      <Tabs
        value={selectedGrade}
        onValueChange={(v) => setSelectedGrade(v as RouletteGrade)}
        className="w-full"
      >
        <TabsList className="bg-zinc-900 border border-white/10 p-1">
          {["COMMON", "VIP", "WHALE"].map((grade) => (
            <TabsTrigger
              key={grade}
              value={grade}
              className="px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              {grade}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {localConfig ? (
        <div className="space-y-6">
          {/* Basic Settings */}
          <Card className="bg-zinc-900 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                기본 설정 ({selectedGrade})
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
                  value={localConfig.maxDailySpins}
                  onChange={(e) =>
                    handleConfigChange(
                      "maxDailySpins",
                      parseInt(e.target.value),
                    )
                  }
                  className="bg-black/20 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400">소모 티켓 타입</Label>
                <Select
                  value={localConfig.ticketType}
                  onValueChange={(v) => handleConfigChange("ticketType", v)}
                >
                  <SelectTrigger className="bg-black/20 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="ROULETTE_TICKET">
                      일반 룰렛 티켓
                    </SelectItem>
                    <SelectItem value="TRIAL_TICKET">체험 티켓</SelectItem>
                    <SelectItem value="DIAMOND_TICKET">다이아 티켓</SelectItem>
                    <SelectItem value="GOLDEN_TICKET">황금 티켓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Segments Table */}
          <Card className="bg-zinc-900 border-white/10 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-white">
                슬롯(Segment) 및 확률 설정
              </CardTitle>
              <CardDescription>
                룰렛판의 각 슬롯에 대한 가중치와 보상을 설정합니다. 가중치가
                높을수록 당첨 확률이 높아집니다.
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-zinc-400 w-[80px] text-center">
                      슬롯
                    </TableHead>
                    <TableHead className="text-zinc-400">라벨</TableHead>
                    <TableHead className="text-zinc-400 w-[120px]">
                      가중치
                    </TableHead>
                    <TableHead className="text-zinc-400 w-[100px] text-right">
                      확률(Est.)
                    </TableHead>
                    <TableHead className="text-zinc-400 w-[200px]">
                      보상 타입
                    </TableHead>
                    <TableHead className="text-zinc-400 w-[120px]">
                      수량
                    </TableHead>
                    <TableHead className="text-zinc-400 text-center">
                      잭팟 여부
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localConfig.segments.map((segment, index) => {
                    const totalWeight = localConfig.segments.reduce(
                      (sum, s) => sum + s.weight,
                      0,
                    );
                    const probability =
                      totalWeight > 0
                        ? ((segment.weight / totalWeight) * 100).toFixed(2)
                        : "0.00";

                    return (
                      <TableRow
                        key={index}
                        className="border-white/5 hover:bg-white/5"
                      >
                        <TableCell className="text-center font-mono text-zinc-500">
                          #{index + 1}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={segment.label}
                            onChange={(e) =>
                              handleSegmentChange(
                                index,
                                "label",
                                e.target.value,
                              )
                            }
                            className="bg-black/20 border-white/10 h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <Input
                              type="number"
                              value={segment.weight}
                              onChange={(e) =>
                                handleSegmentChange(
                                  index,
                                  "weight",
                                  parseInt(e.target.value),
                                )
                              }
                              className={`bg-black/20 border-white/10 h-8 font-mono ${segment.weight === 0 ? "text-zinc-500" : "text-emerald-400"}`}
                            />
                            {segment.weight === 0 && (
                              <AlertTriangle className="absolute right-2 top-2 w-4 h-4 text-amber-500 opacity-50" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-zinc-400 font-mono text-xs">
                          {probability}%
                        </TableCell>
                        <TableCell>
                          <Select
                            value={segment.rewardType}
                            onValueChange={(v) =>
                              handleSegmentChange(index, "rewardType", v)
                            }
                          >
                            <SelectTrigger className="bg-black/20 border-white/10 h-8">
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
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={segment.rewardAmount}
                            onChange={(e) =>
                              handleSegmentChange(
                                index,
                                "rewardAmount",
                                parseInt(e.target.value),
                              )
                            }
                            className="bg-black/20 border-white/10 h-8 text-right font-mono"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={segment.isJackpot}
                            onCheckedChange={(checked) =>
                              handleSegmentChange(index, "isJackpot", checked)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="text-center py-20 bg-zinc-900 border border-white/10 rounded-xl">
          <p className="text-zinc-500">
            해당 등급의 설정을 불러올 수 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}

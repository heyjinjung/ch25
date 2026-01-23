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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
// Tabs import removed to fix build error
import { ListOrdered, Save, Info, TriangleAlert, Settings } from "lucide-react";
import { cn } from "../../../lib/utils";
import { REWARD_ITEMS } from "../../../constants/rewardItems";

export default function RouletteConfigPage() {
  const { data: configs = [], isLoading } = useRouletteConfigs();
  const updateMutation = useUpdateRouletteConfig();

  const [selectedGrade, setSelectedGrade] = useState<RouletteGrade>("COMMON");
  const [activeConfig, setActiveConfig] =
    useState<AdminRouletteConfigDto | null>(null);

  const rewardOptions = REWARD_ITEMS;

  useEffect(() => {
    if (configs.length === 0) {
      setActiveConfig(null);
      return;
    }

    const target = configs.find((c) => c.grade === selectedGrade) ?? null;
    if (!target) {
      setActiveConfig(null);
      return;
    }

    // Detach from react-query cache objects to avoid cross-grade accidental mutation.
    setActiveConfig({
      ...target,
      segments: target.segments.map((s) => ({ ...s })),
    });
  }, [configs, selectedGrade]);

  const handleConfigChange = (
    field: keyof AdminRouletteConfigDto,
    value: any,
  ) => {
    if (!activeConfig) return;
    setActiveConfig({ ...activeConfig, [field]: value });
  };

  const handleSegmentChange = (
    slotIndex: number,
    field: keyof AdminRouletteSegmentDto,
    value: any,
  ) => {
    if (!activeConfig) return;
    const newSegments = activeConfig.segments.map((s) =>
      s.slotIndex === slotIndex ? { ...s, [field]: value } : s,
    );
    setActiveConfig({ ...activeConfig, segments: newSegments });
  };

  const handleSave = () => {
    if (!activeConfig) return;
    const totalWeight = activeConfig.segments.reduce(
      (sum, s) => sum + s.weight,
      0,
    );
    if (totalWeight <= 0) {
      alert("총 가중치는 0보다 커야 합니다.");
      return;
    }
    updateMutation.mutate(activeConfig, {
      onError: () => {
        alert("설정 저장 실패");
      },
    });
  };

  if (isLoading)
    return (
      <div className="text-center py-20 text-zinc-500 animate-pulse">
        Loading configurations...
      </div>
    );
  if (!activeConfig)
    return (
      <div className="text-center py-20 text-zinc-500">
        No configuration found for {selectedGrade}
      </div>
    );

  const sortedSegments = activeConfig.segments
    .slice()
    .sort((a, b) => a.slotIndex - b.slotIndex);

  const totalWeight =
    activeConfig.segments.reduce((sum, s) => sum + s.weight, 0) || 1;

  const grades: { value: RouletteGrade; label: string; color: string }[] = [
    { value: "COMMON", label: "일반 (Common)", color: "text-zinc-400" },
    { value: "VIP", label: "VIP", color: "text-yellow-400" },
    { value: "WHALE", label: "WHALE (고래)", color: "text-purple-400" },
    { value: "AT_RISK", label: "관리 대상 (At Risk)", color: "text-red-400" },
  ];

  return (
    <div className="space-y-6 text-white p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-400" />
            룰렛 설정 (Roulette Config SoT)
          </h1>
          <p className="text-sm text-zinc-400">
            등급별 룰렛 정책 및 세그먼트 가중치를 관리합니다. (V2 Specs: Grade &
            Weight)
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
        >
          <Save className="w-4 h-4 mr-2" />
          {updateMutation.isPending ? "저장 중..." : "설정 저장"}
        </Button>
      </div>

      {/* Custom Tab UI */}
      <div className="grid w-full grid-cols-4 bg-[#18181B] border border-white/5 p-1 rounded-lg">
        {grades.map((grade) => (
          <button
            key={grade.value}
            onClick={() => setSelectedGrade(grade.value)}
            className={cn(
              "flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              selectedGrade === grade.value
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300",
              selectedGrade === grade.value &&
                grade.value !== "COMMON" &&
                grade.color,
            )}
          >
            {grade.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* General Policy */}
        <Card className="lg:col-span-1 bg-[#18181B] border-white/5 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-400" />
              기본 정책
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
              <div className="space-y-0.5">
                <Label className="text-base">게임 활성화</Label>
                <p className="text-xs text-zinc-500">
                  비활성화 시 점검 중 메시지가 표시됩니다.
                </p>
              </div>
              <Switch
                checked={activeConfig.isActive}
                onCheckedChange={(checked) =>
                  handleConfigChange("isActive", checked)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>입장 재화 (Ticket Type)</Label>
              <Select
                value={activeConfig.ticketType}
                onValueChange={(val) => handleConfigChange("ticketType", val)}
              >
                <SelectTrigger className="bg-black/50 border-white/10 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#18181B] border-white/10 text-white">
                  <SelectItem value="ROULETTE_TICKET">
                    ROULETTE_TICKET
                  </SelectItem>
                  <SelectItem value="GOLD_KEY_TICKET">
                    GOLD_KEY_TICKET
                  </SelectItem>
                  <SelectItem value="DIAMOND_TICKET">DIAMOND_TICKET</SelectItem>
                  <SelectItem value="TRIAL_TICKET">TRIAL_TICKET</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>일일 최대 회전수 (Daily Max)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={activeConfig.maxDailySpins}
                  onChange={(e) =>
                    handleConfigChange(
                      "maxDailySpins",
                      parseInt(e.target.value),
                    )
                  }
                  className="bg-black/50 border-white/10 text-right h-10 font-mono"
                />
                <span className="text-sm text-zinc-500 whitespace-nowrap">
                  회 / 일
                </span>
              </div>
            </div>

            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg">
              <div className="text-xs text-blue-300 space-y-1">
                <p className="font-semibold mb-2 flex items-center gap-1">
                  <Info className="w-3 h-3" /> 등급별 가이드
                </p>
                <p>• COMMON: 일반 룰렛 (1~3회)</p>
                <p>• VIP/WHALE: 골드/다이아 룰렛 (고가치 보상)</p>
                <p>• AT_RISK: 위기 개입용 (당첨 확률 상향 조정 권장)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Slots Configuration */}
        <Card className="lg:col-span-2 bg-[#18181B] border-white/5 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-emerald-400" />
                슬롯 가중치 설정 (6 Slots Fixed)
              </CardTitle>
              <CardDescription>
                가중치(Weight)를 입력하면 확률(%)은 자동 계산됩니다.
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {totalWeight}
              </div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider">
                Total Weight
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="w-[50px] text-center">#</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead className="w-[80px]">Prob %</TableHead>
                  <TableHead className="w-[60px] text-center">Effect</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSegments.map((segment) => {
                  const probability = (
                    (segment.weight / totalWeight) *
                    100
                  ).toFixed(1);
                  return (
                    <TableRow
                      key={segment.slotIndex}
                      className="border-white/5 hover:bg-white/5 group"
                    >
                      <TableCell className="font-mono text-zinc-500 text-center bg-black/20">
                        {segment.slotIndex}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={segment.label}
                          onChange={(e) =>
                            handleSegmentChange(
                              segment.slotIndex,
                              "label",
                              e.target.value,
                            )
                          }
                          className="h-8 bg-transparent border-transparent hover:bg-black/50 hover:border-white/10 focus:bg-black/50 focus:border-indigo-500 transition-all w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={segment.rewardType}
                          onValueChange={(val) =>
                            handleSegmentChange(
                              segment.slotIndex,
                              "rewardType",
                              val,
                            )
                          }
                        >
                          <SelectTrigger className="h-8 bg-black/40 border-white/5 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#18181B] border-white/10 text-white max-h-[260px]">
                            {rewardOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
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
                              segment.slotIndex,
                              "rewardAmount",
                              parseFloat(e.target.value),
                            )
                          }
                          className="h-8 bg-transparent border-transparent hover:bg-black/50 hover:border-white/10 focus:bg-black/50 focus:border-indigo-500 transition-all w-[80px]"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <Input
                            type="number"
                            value={segment.weight}
                            onChange={(e) =>
                              handleSegmentChange(
                                segment.slotIndex,
                                "weight",
                                parseInt(e.target.value),
                              )
                            }
                            className="h-8 bg-black/20 border-white/5 w-[80px] font-bold text-emerald-400 text-center focus:border-emerald-500"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono text-zinc-300">
                          {probability}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={segment.isJackpot}
                          onCheckedChange={(checked) =>
                            handleSegmentChange(
                              segment.slotIndex,
                              "isJackpot",
                              checked,
                            )
                          }
                          className="scale-75 data-[state=checked]:bg-yellow-500"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {totalWeight === 0 && (
              <div className="mt-4 flex items-center justify-center p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 gap-2">
                <TriangleAlert className="w-5 h-5" />
                <span className="font-semibold">
                  경고: 가중치 합이 0입니다. 게임이 정상 동작하지 않습니다.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

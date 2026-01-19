import { useState, useEffect } from "react";
import { useLotteryConfig, useUpdateLotteryConfig } from "../../../hooks/useAdminGameConfig";
import { type AdminLotteryConfigDto, type AdminLotteryPrizeDto } from "../../../api/adminApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Switch } from "../../../components/ui/switch";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { Slider } from "../../../components/ui/slider";
import { Ticket, Save, Info, Settings, Grid2x2, Trophy } from "lucide-react";

export default function LotteryConfigPage() {
  const { data: config, isLoading } = useLotteryConfig();
  const updateMutation = useUpdateLotteryConfig();

  const [localConfig, setLocalConfig] = useState<AdminLotteryConfigDto | null>(null);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleConfigChange = (field: keyof AdminLotteryConfigDto, value: any) => {
    if (localConfig) {
      setLocalConfig({ ...localConfig, [field]: value });
    }
  };

  const handlePrizeChange = (id: number, field: keyof AdminLotteryPrizeDto, value: any) => {
    if (!localConfig) return;
    const newPrizes = localConfig.prizes.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    );
    setLocalConfig({ ...localConfig, prizes: newPrizes });
  };

  const handleSave = () => {
    if (!localConfig) return;
    updateMutation.mutate(localConfig);
  };

  if (isLoading) return <div className="text-center py-20 text-zinc-500 animate-pulse">Loading activeConfig...</div>;
  if (!localConfig) return <div className="text-center py-20 text-zinc-500">Config Load Failed</div>;

  const totalWeight = localConfig.prizes.filter(p => p.isActive).reduce((sum, p) => sum + p.weight, 0) || 1;

  return (
    <div className="space-y-6 text-white p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-indigo-400" />
            복권 설정 (Lottery Config SoT)
          </h1>
          <p className="text-sm text-zinc-400">즉석 복권의 보상, 재고 및 퍼즐 조각 이벤트를 관리합니다.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Global Settings */}
        <Card className="lg:col-span-1 bg-[#18181B] border-white/5 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
               <Settings className="w-5 h-5 text-zinc-400" />
               기본 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
               <div className="space-y-0.5">
                 <Label className="text-base">게임 활성화</Label>
                 <p className="text-xs text-zinc-500">비활성화 시 구매 불가</p>
               </div>
               <Switch checked={localConfig.isActive} onCheckedChange={(v) => handleConfigChange("isActive", v)} />
            </div>

            <div className="space-y-2">
               <Label>설정명 (Name)</Label>
               <Input 
                 value={localConfig.name} 
                 onChange={(e) => handleConfigChange("name", e.target.value)}
                 className="bg-black/50 border-white/10 h-10"
               />
            </div>

            <div className="space-y-2">
               <Label>일일 최대 구매 제한 (Max Daily Plays)</Label>
               <Input 
                 type="number"
                 value={localConfig.maxDailyPlays}
                 onChange={(e) => handleConfigChange("maxDailyPlays", parseInt(e.target.value))}
                 className="bg-black/50 border-white/10 h-10"
               />
               <p className="text-xs text-zinc-500">1명당 하루 최대 구매 가능 수량</p>
            </div>

            {/* Puzzle Event Config */}
            <div className="pt-6 mt-6 border-t border-white/10 space-y-4">
               <div className="flex items-center gap-2 text-purple-400">
                  <Grid2x2 className="w-5 h-5" />
                  <Label className="text-base font-semibold">퍼즐 조각 이벤트</Label>
               </div>
               <div className="space-y-3 p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                  <div className="flex justify-between items-center">
                    <Label>드랍 확률 (0~100%)</Label>
                    <span className="font-mono font-bold text-purple-400">{localConfig.puzzlePieceProbability}%</span>
                  </div>
                  <Slider 
                    value={[localConfig.puzzlePieceProbability]}
                    max={100}
                    step={0.1}
                    onValueChange={(vals) => handleConfigChange("puzzlePieceProbability", vals[0])}
                    className="py-2"
                  />
                  <p className="text-xs text-zinc-400">
                    복권 구매 시 추가적인 퍼즐 조각 획득 확률입니다.
                  </p>
               </div>
            </div>
            
            <div className="pt-6 mt-6 border-t border-white/10">
               <div className="flex items-center gap-2 mb-2">
                 <Info className="w-4 h-4 text-blue-400" />
                 <span className="text-sm font-semibold text-blue-400">Total Active Weight</span>
               </div>
               <div className="text-3xl font-bold font-mono">{totalWeight}</div>
               <p className="text-xs text-zinc-500 mt-1">비활성 항목은 제외됩니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* Prize Table */}
        <Card className="lg:col-span-2 bg-[#18181B] border-white/5 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
               <Trophy className="w-5 h-5 text-yellow-500" />
               당첨 보상 테이블 (Prize Table)
            </CardTitle>
            <CardDescription>가중치 및 재고 설정 (재고 -1 표시는 무제한)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="w-[50px] text-center">Active</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead className="w-[80px]">Prob %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localConfig.prizes.map((prize) => {
                  const probability = prize.isActive 
                     ? ((prize.weight / totalWeight) * 100).toFixed(2) 
                     : "0.00";
                  return (
                    <TableRow key={prize.id} className="border-white/5 hover:bg-white/5 group">
                      <TableCell className="text-center">
                        <Switch 
                          checked={prize.isActive} 
                          onCheckedChange={(v) => handlePrizeChange(prize.id, "isActive", v)}
                          className="scale-75 data-[state=checked]:bg-emerald-500"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={prize.label}
                          onChange={(e) => handlePrizeChange(prize.id, "label", e.target.value)}
                          className={`h-8 bg-transparent border-transparent hover:bg-black/50 hover:border-white/10 w-[120px] transition-all ${!prize.isActive && 'text-zinc-600 line-through'}`}
                        />
                      </TableCell>
                      <TableCell>
                         <Badge variant="outline" className="bg-zinc-800/50 border-zinc-700 text-zinc-300">
                           {prize.rewardType}
                         </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={prize.rewardAmount}
                          onChange={(e) => handlePrizeChange(prize.id, "rewardAmount", parseFloat(e.target.value))}
                          className="h-8 bg-transparent border-transparent hover:bg-black/50 hover:border-white/10 w-[80px] transition-all"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="∞"
                            value={prize.stock ?? ""}
                            onChange={(e) => {
                               const val = e.target.value === "" ? undefined : parseInt(e.target.value);
                               handlePrizeChange(prize.id, "stock", val);
                            }}
                            className={`h-8 bg-black/20 border-white/5 w-[60px] text-center ${prize.stock === 0 ? 'text-red-500 font-bold' : ''}`}
                          />
                          {prize.stock === undefined && (
                             <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-500">∞</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={prize.weight}
                          onChange={(e) => handlePrizeChange(prize.id, "weight", parseInt(e.target.value))}
                          className="h-8 bg-black/20 border-white/5 w-[80px] font-bold text-emerald-400 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-mono ${prize.isActive ? 'text-zinc-300' : 'text-zinc-600'}`}>
                           {probability}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useDiceConfig, useUpdateDiceConfig } from "../../../hooks/useAdminGameConfig";
import { type AdminDiceConfigDto } from "../../../api/adminApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Switch } from "../../../components/ui/switch";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Dice5, Save, TriangleAlert, Settings2 } from "lucide-react";

export default function DiceConfigPage() {
  const { data: config, isLoading } = useDiceConfig();
  const updateMutation = useUpdateDiceConfig();

  const [localConfig, setLocalConfig] = useState<AdminDiceConfigDto | null>(null);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

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

  if (isLoading) return <div className="text-center py-20 text-zinc-500 animate-pulse">Loading config...</div>;
  if (!localConfig) return <div className="text-center py-20 text-zinc-500">Config Load Failed</div>;

  return (
    <div className="space-y-6 text-white p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 flex items-center gap-2">
            <Dice5 className="w-6 h-6 text-indigo-400" />
            주사위 설정 (Dice Config SoT)
          </h1>
          <p className="text-sm text-zinc-400">주사위 게임의 결과별 보상을 관리합니다. (Win/Draw/Lose Reward)</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Settings */}
        <Card className="bg-[#18181B] border-white/5 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-zinc-400" />
              기본 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
              <div className="space-y-0.5">
                <Label className="text-base">게임 활성화</Label>
                <p className="text-xs text-zinc-500">비활성화 시 입장이 차단됩니다.</p>
              </div>
              <Switch checked={localConfig.isActive} onCheckedChange={(c) => handleChange("isActive", c)} />
            </div>
            
            <div className="space-y-2">
               <Label>설정명 (Name)</Label>
               <Input 
                 value={localConfig.name} 
                 onChange={(e) => handleChange("name", e.target.value)}
                 className="bg-black/50 border-white/10 h-10"
               />
            </div>

            <div className="space-y-2">
               <Label>일일 최대 플레이 횟수 (Max Daily Plays)</Label>
               <Input 
                 type="number"
                 value={localConfig.maxDailyPlays} 
                 onChange={(e) => handleChange("maxDailyPlays", parseInt(e.target.value))}
                 className="bg-black/50 border-white/10 h-10"
               />
               <p className="text-xs text-zinc-500">모든 유저에게 공통 적용됩니다.</p>
            </div>
          </CardContent>
        </Card>

        {/* Win/Draw/Lose Rewards */}
        <Card className="bg-[#18181B] border-white/5 shadow-xl">
           <CardHeader>
             <CardTitle className="text-lg flex items-center gap-2">
                <Dice5 className="w-5 h-5 text-emerald-400" />
                결과별 보상 설정
             </CardTitle>
             <CardDescription>승리 시 지급량, 패배 시 차감량(음수) 설정 가능</CardDescription>
           </CardHeader>
           <CardContent className="space-y-6">
             {/* Win */}
             <div className="space-y-2 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg transition-all hover:bg-emerald-500/10">
                <div className="flex justify-between items-center mb-2">
                   <Label className="text-emerald-400 font-bold text-base">승리 (WIN)</Label>
                   <span className="text-xs text-emerald-500/70 uppercase">Get Reward</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <Select value={localConfig.winRewardType} onValueChange={(v) => handleChange("winRewardType", v)}>
                      <SelectTrigger className="bg-black/50 border-white/10 h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POINT">POINT</SelectItem>
                        <SelectItem value="CC_POINT">CC_POINT</SelectItem>
                        <SelectItem value="NONE">NONE</SelectItem>
                      </SelectContent>
                   </Select>
                   <Input 
                      type="number" 
                      value={localConfig.winRewardAmount}
                      onChange={(e) => handleChange("winRewardAmount", parseInt(e.target.value))}
                      className="bg-black/50 border-white/10 text-emerald-400 font-bold h-10 text-right"
                   />
                </div>
             </div>

             {/* Draw */}
             <div className="space-y-2 p-4 bg-zinc-800/30 border border-white/10 rounded-lg transition-all hover:bg-zinc-800/50">
                <div className="flex justify-between items-center mb-2">
                   <Label className="text-zinc-300 font-bold text-base">무승부 (DRAW)</Label>
                   <span className="text-xs text-zinc-500 uppercase">Refund or Small Reward</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <Select value={localConfig.drawRewardType} onValueChange={(v) => handleChange("drawRewardType", v)}>
                      <SelectTrigger className="bg-black/50 border-white/10 h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POINT">POINT</SelectItem>
                        <SelectItem value="CC_POINT">CC_POINT</SelectItem>
                        <SelectItem value="NONE">NONE</SelectItem>
                      </SelectContent>
                   </Select>
                   <Input 
                      type="number" 
                      value={localConfig.drawRewardAmount}
                      onChange={(e) => handleChange("drawRewardAmount", parseInt(e.target.value))}
                      className="bg-black/50 border-white/10 text-zinc-300 h-10 text-right"
                   />
                </div>
             </div>

             {/* Lose */}
             <div className="space-y-2 p-4 bg-red-500/5 border border-red-500/20 rounded-lg transition-all hover:bg-red-500/10">
                <div className="flex justify-between items-center mb-2">
                   <Label className="text-red-400 font-bold text-base">패배 (LOSE)</Label>
                   <span className="text-xs text-red-400/70 flex items-center gap-1">
                     <TriangleAlert className="w-3 h-3" />
                     음수 입력 시 포인트 차감
                   </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <Select value={localConfig.loseRewardType} onValueChange={(v) => handleChange("loseRewardType", v)}>
                      <SelectTrigger className="bg-black/50 border-white/10 h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POINT">POINT</SelectItem>
                        <SelectItem value="CC_POINT">CC_POINT</SelectItem>
                        <SelectItem value="NONE">NONE</SelectItem>
                      </SelectContent>
                   </Select>
                   <Input 
                      type="number" 
                      value={localConfig.loseRewardAmount}
                      onChange={(e) => handleChange("loseRewardAmount", parseInt(e.target.value))}
                      className="bg-black/50 border-white/10 text-red-400 font-bold h-10 text-right"
                   />
                </div>
             </div>

           </CardContent>
        </Card>
      </div>
    </div>
  );
}

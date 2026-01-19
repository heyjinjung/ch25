import { useState } from "react";
import { useAdminMissions, useAdminUpdateMission } from "../../../hooks/useAdminGame";
import { type AdminMissionDto } from "../../../api/adminApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Switch } from "../../../components/ui/switch";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Calendar } from "../../../components/ui/calendar";
import { Ticket, Gift, Coins } from "lucide-react";

// Mock Categories for Tabs
const CATEGORIES = ["DAILY", "WEEKLY", "NEW_USER", "SPECIAL_EVENT"];

export default function MissionManagerPage() {
  const { data: missions = [], isLoading } = useAdminMissions();
  const updateMutation = useAdminUpdateMission();
  
  const [activeTab, setActiveTab] = useState("DAILY");

  // Filter missions by active tab
  const filteredMissions = missions.filter(m => m.category === activeTab);

  const handleUpdate = (id: number, field: keyof AdminMissionDto, value: any) => {
    updateMutation.mutate({ id, data: { [field]: value } });
  };

  const getRewardIcon = (type: string) => {
      switch(type) {
          case 'TICKET': return <Ticket className="w-4 h-4 text-emerald-400" />;
          case 'POINT': return <Coins className="w-4 h-4 text-yellow-400" />;
          case 'BUNDLE': return <Gift className="w-4 h-4 text-purple-400" />;
          default: return null;
      }
  };

  return (
    <div className="space-y-6 text-white p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">미션 관리 (Mission Ops)</h1>
          <p className="text-sm text-zinc-400">일일 미션 및 스트릭 보상을 설정합니다.</p>
        </div>
        <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                Active Season 25
            </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Streak Calendar (Visual only for now) */}
          <div className="space-y-4">
              <Card className="bg-[#18181B] border-white/5">
                <CardHeader>
                    <CardTitle className="text-lg">Streak Schedule</CardTitle>
                    <CardDescription>연속 출석 보상 주기 확인</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Calendar mode="single" className="rounded-md border border-white/5 bg-zinc-900/50 text-white" />
                </CardContent>
              </Card>

              <Card className="bg-[#18181B] border-white/5">
                  <CardHeader>
                      <CardTitle className="text-base">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-zinc-400">
                      <div className="flex justify-between">
                          <span>Active Daily Users</span>
                          <span className="text-white font-bold">1,240</span>
                      </div>
                      <div className="flex justify-between">
                          <span>Mission Completion</span>
                          <span className="text-white font-bold">85.2%</span>
                      </div>
                  </CardContent>
              </Card>
          </div>
          
          {/* Right Column: Mission List */}
          <div className="lg:col-span-2 space-y-4">
               <Tabs defaultValue="DAILY" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-[#18181B] border border-white/5">
                        {CATEGORIES.map(cat => (
                            <TabsTrigger key={cat} value={cat} className="data-[state=active]:bg-zinc-800">
                                {cat}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    
                    <TabsContent value={activeTab} className="space-y-4 mt-4">
                        {isLoading ? (
                            <div className="text-center py-20 text-zinc-500">Loading missions...</div>
                        ) : filteredMissions.length === 0 ? (
                            <div className="text-center py-20 text-zinc-500 border border-dashed border-white/10 rounded-xl">
                                등록된 미션이 없습니다.
                            </div>
                        ) : (
                            filteredMissions.map((mission) => (
                                <Card key={mission.id} className="bg-[#18181B] border-white/5 transition-all hover:border-white/10">
                                    <div className="flex items-center p-4 gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-base text-zinc-200">{mission.title}</h4>
                                                {!mission.isActive && <Badge variant="secondary" className="text-[10px] h-5">Inactive</Badge>}
                                            </div>
                                            <p className="text-xs text-zinc-500">{mission.condition}</p>
                                        </div>

                                        {/* Reward Config */}
                                        <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/5">
                                            <div className="w-[100px]">
                                                <Select 
                                                    defaultValue={mission.rewardType} 
                                                    onValueChange={(val) => handleUpdate(mission.id, 'rewardType', val)}
                                                >
                                                    <SelectTrigger className="h-8 text-xs bg-transparent border-none">
                                                        <div className="flex items-center gap-2">
                                                            {getRewardIcon(mission.rewardType)}
                                                            <SelectValue />
                                                        </div>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="TICKET">Ticket</SelectItem>
                                                        <SelectItem value="POINT">Point</SelectItem>
                                                        <SelectItem value="BUNDLE">Bundle</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Input 
                                                type="number" 
                                                className="h-8 w-20 text-right bg-transparent border-white/10 text-xs"
                                                defaultValue={mission.rewardAmount}
                                                onBlur={(e) => handleUpdate(mission.id, 'rewardAmount', parseInt(e.target.value))}
                                            />
                                        </div>

                                        <Switch 
                                            checked={mission.isActive}
                                            onCheckedChange={(checked) => handleUpdate(mission.id, 'isActive', checked)}
                                        />
                                    </div>
                                </Card>
                            ))
                        )}
                    </TabsContent>
               </Tabs>
          </div>
      </div>
    </div>
  );
}

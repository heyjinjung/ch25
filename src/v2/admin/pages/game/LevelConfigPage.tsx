import { useAdminLevels, useAdminUpdateLevel } from "../../../hooks/useAdminGame";
import { type AdminLevelDto } from "../../../api/adminApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { Trophy, Ticket, Coins } from "lucide-react";

export default function LevelConfigPage() {
  const { data: levels = [], isLoading } = useAdminLevels();
  const updateMutation = useAdminUpdateLevel();

  const handleUpdate = (level: number, field: keyof AdminLevelDto, value: number) => {
    if (isNaN(value)) return;
    updateMutation.mutate({ level, data: { [field]: value } });
  };

  return (
    <div className="space-y-6 text-white p-6 h-full overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">레벨 설정 (Level Config)</h1>
        <p className="text-sm text-zinc-400">경험치 테이블 및 레벨별 혜택을 설정합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="bg-[#18181B] border-white/5 lg:col-span-3">
            <CardHeader>
                <CardTitle className="text-lg">Level Progression Table</CardTitle>
                <CardDescription>레벨별 필요 경험치(XP)와 달성 보상을 정의합니다.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="w-[100px]">Level</TableHead>
                            <TableHead>Required XP</TableHead>
                            <TableHead>Reward (Ticket)</TableHead>
                            <TableHead>Reward (Point)</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-zinc-500">Loading Levels...</TableCell>
                            </TableRow>
                        ) : (
                            levels.map((lvl) => (
                                <TableRow key={lvl.level} className="border-white/5 hover:bg-white/5 transition-colors">
                                    <TableCell className="font-medium text-zinc-300">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="bg-zinc-800 border-zinc-700 w-8 h-8 flex items-center justify-center p-0">
                                                {lvl.level}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="relative max-w-[140px]">
                                            <Trophy className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-500" />
                                            <Input 
                                                type="number" 
                                                className="bg-black/50 border-white/10 pl-9" 
                                                defaultValue={lvl.requiredXp}
                                                onBlur={(e) => handleUpdate(lvl.level, 'requiredXp', parseInt(e.target.value))}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="relative max-w-[140px]">
                                            <Ticket className="absolute left-2.5 top-2.5 w-4 h-4 text-emerald-500" />
                                            <Input 
                                                type="number" 
                                                className="bg-black/50 border-white/10 pl-9 text-emerald-400" 
                                                defaultValue={lvl.rewardTicket}
                                                onBlur={(e) => handleUpdate(lvl.level, 'rewardTicket', parseInt(e.target.value))}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="relative max-w-[140px]">
                                            <Coins className="absolute left-2.5 top-2.5 w-4 h-4 text-yellow-500" />
                                            <Input 
                                                type="number" 
                                                className="bg-black/50 border-white/10 pl-9 text-yellow-400" 
                                                defaultValue={lvl.rewardPoint}
                                                onBlur={(e) => handleUpdate(lvl.level, 'rewardPoint', parseInt(e.target.value))}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className="text-xs text-zinc-600">Auto-saved</span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
          
          <div className="space-y-6">
               <Card className="bg-[#18181B] border-white/5 bg-gradient-to-br from-[#18181B] to-emerald-900/10">
                   <CardHeader>
                       <CardTitle className="text-base text-emerald-400">XP Earn Rate</CardTitle>
                       <CardDescription>입금 10,000원당 XP 적립률</CardDescription>
                   </CardHeader>
                   <CardContent>
                       <div className="text-3xl font-bold text-white mb-2">20 XP</div>
                       <p className="text-xs text-zinc-500">
                           Current Ratio: <span className="text-white">100 KRW = 0.2 XP</span>
                       </p>
                   </CardContent>
               </Card>
               
               <Card className="bg-[#18181B] border-white/5">
                   <CardHeader>
                       <CardTitle className="text-base">Max Level</CardTitle>
                   </CardHeader>
                   <CardContent>
                       <div className="text-3xl font-bold text-white mb-2">20</div>
                       <p className="text-xs text-zinc-500">Configured Cap</p>
                   </CardContent>
               </Card>
          </div>
      </div>
    </div>
  );
}

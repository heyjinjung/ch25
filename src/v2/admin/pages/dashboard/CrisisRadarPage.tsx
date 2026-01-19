
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { 
    Search, 
    Filter, 
    ChevronRight, 
    ShieldAlert,
    Zap,
    MessageSquare,
    PhoneCall
} from "lucide-react";
import { Input } from "../../../components/ui/input";
import { useOpsStatus } from "../../../hooks/useV2Admin";
import { useState } from "react";
import { UserDetailDrawer } from "../users/UserDetailDrawer";

export default function CrisisRadarPage() {
  const { data: status } = useOpsStatus();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const handleUserClick = (userId: number) => {
    setSelectedUserId(userId);
    setIsDrawerOpen(true);
  };

  const riskyUsers = status?.goldenRadar.riskUsers || [];

  return (
    <div className="p-6 space-y-8 bg-[#121214] min-h-screen text-white">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
           <div className="flex items-center gap-2 text-red-500 mb-2">
               <ShieldAlert className="w-4 h-4" />
               <span className="text-xs font-bold uppercase tracking-wider">Golden Hour Radar</span>
           </div>
           <h1 className="text-2xl font-bold tracking-tight">위기 레이더 (Crisis Radar)</h1>
           <p className="text-sm text-zinc-400 mt-1">
             AI가 실시간으로 분석한 이탈 위기 사용자 목록입니다. 즉각적인 개입이 필요할 수 있습니다.
           </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="border-white/10 text-zinc-300 hover:text-white hover:bg-white/5">
                 일괄 개입 (Bulk Action)
            </Button>
            <Button className="bg-red-500 text-white hover:bg-red-600">
                 레이더 감도 설정
            </Button>
        </div>
      </div>

      {/* Main Analysis Cards */}
      <div className="grid gap-6 md:grid-cols-4">
          <Card className="bg-[#18181B] border-red-500/20 bg-red-500/5">
              <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-red-400 uppercase tracking-widest">Urgent (심각)</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold text-red-500">{riskyUsers.filter(u => u.riskLevel === 'HIGH').length}</div>
                  <p className="text-[10px] text-red-400/60 mt-1">Immediate intervention required</p>
              </CardContent>
          </Card>
          <Card className="bg-[#18181B] border-amber-500/20 bg-amber-500/5">
              <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-amber-400 uppercase tracking-widest">Warning (주의)</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold text-amber-500">{riskyUsers.filter(u => u.riskLevel === 'MEDIUM').length}</div>
                  <p className="text-[10px] text-amber-400/60 mt-1">Increasing churn probability</p>
              </CardContent>
          </Card>
          <Card className="bg-[#18181B] border-zinc-500/20">
              <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Avg Churn Score</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold text-white">82%</div>
                  <p className="text-[10px] text-zinc-500 mt-1">Radar detection precision: 94%</p>
              </CardContent>
          </Card>
          <Card className="bg-[#18181B] border-indigo-500/20 bg-indigo-500/5">
              <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Today Interventions</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold text-indigo-400">24</div>
                  <p className="text-[10px] text-indigo-400/60 mt-1">Success rate: 75%</p>
              </CardContent>
          </Card>
      </div>

      {/* User Table / List */}
      <Card className="bg-[#18181B] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">Risk User List</CardTitle>
              <div className="flex gap-2">
                  <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <Input 
                          placeholder="Search users..." 
                          className="bg-black/20 border-white/10 pl-9 h-9 w-[200px] text-sm"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                      />
                  </div>
                  <Button variant="outline" size="sm" className="h-9 border-white/10">
                      <Filter className="w-4 h-4 mr-2" /> Filter
                  </Button>
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="text-[10px] text-zinc-500 uppercase tracking-wider border-y border-white/5 bg-white/5">
                          <tr>
                              <th className="px-6 py-3 font-medium">Username</th>
                              <th className="px-6 py-3 font-medium">Risk Score</th>
                              <th className="px-6 py-3 font-medium">Risk Level</th>
                              <th className="px-6 py-3 font-medium">Detected Reason</th>
                              <th className="px-6 py-3 font-medium text-right">Quick Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {riskyUsers.filter(u => u.nickname.toLowerCase().includes(search.toLowerCase())).map(u => (
                              <tr key={u.userId} className="hover:bg-white/[0.02] group transition-colors">
                                  <td className="px-6 py-4 font-bold text-white cursor-pointer" onClick={() => handleUserClick(u.userId)}>
                                      {u.nickname}
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                          <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                              <div 
                                                className={`h-full ${u.riskLevel === 'HIGH' ? 'bg-red-500' : 'bg-amber-500'}`} 
                                                style={{ width: `${u.churnScore * 100}%` }} 
                                              />
                                          </div>
                                          <span className="text-[10px] font-mono text-zinc-400">{(u.churnScore * 100).toFixed(0)}%</span>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      {u.riskLevel === 'HIGH' ? (
                                          <Badge className="bg-red-500/10 text-red-500 border-none h-5 text-[10px]">CRITICAL</Badge>
                                      ) : (
                                          <Badge className="bg-amber-500/10 text-amber-500 border-none h-5 text-[10px]">WARNING</Badge>
                                      )}
                                  </td>
                                  <td className="px-6 py-4 text-zinc-500 text-xs">
                                      {u.riskReason || "Unusual loss streak detected"}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-1">
                                          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-indigo-400" title="Bailout Gift">
                                              <Zap className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-indigo-400" title="Send Message">
                                              <MessageSquare className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-indigo-400" title="CRM Call">
                                              <PhoneCall className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 group-hover:text-white" onClick={() => handleUserClick(u.userId)}>
                                              <ChevronRight className="w-4 h-4" />
                                          </Button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </CardContent>
      </Card>

      <UserDetailDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        userId={selectedUserId} 
      />
    </div>
  );
}

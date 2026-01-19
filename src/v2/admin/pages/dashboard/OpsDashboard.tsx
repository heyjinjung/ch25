
import { Activity, ShieldAlert, Users, CreditCard, TriangleAlert, Server } from 'lucide-react';
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { BentoGrid } from "../../components/ui/BentoGrid";
import { QuickActionCard } from "../../components/ui/QuickActionCard";
import { PulsatingDot } from "../../components/ui/PulsatingDot";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { useNavigate } from 'react-router-dom';

export default function OpsDashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-8 h-full bg-[#121214] min-h-screen text-[#E4E4E7] font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-white mb-1">운영 대시보드 (Ops Dashboard)</h1>
           <p className="text-sm text-zinc-400">시스템 상태, 리스크 유저, 핵심 운영 지표를 실시간으로 관제합니다.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="border-white/10 text-zinc-300 hover:text-white hover:bg-white/5" onClick={() => navigate('/admin/v2/system/modals')}>
                 모달 제어
            </Button>
            <Button className="bg-[#D2FD9C] text-black hover:bg-[#bbf07c]">
                 긴급 점검 (Maintenance)
            </Button>
        </div>
      </div>

      {/* Top Row: Critical Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <QuickActionCard 
            label="시스템 상태" 
            description="All Services Operational" 
            icon={Server}
            onClick={() => navigate('/admin/v2/system/health')}
          />
          <QuickActionCard 
            label="출금 대기" 
            description="Pending: 12건 (High Risk 1)" 
            icon={CreditCard} 
            onClick={() => navigate('/admin/v2/economy/vault')}
          />
          <QuickActionCard 
            label="골든 레이더" 
            description="Intervention Needed: 3" 
            icon={ShieldAlert}
            className="border-red-500/30 bg-red-500/5 hover:bg-red-500/10" 
          />
          <QuickActionCard 
            label="현재 접속자" 
            description="Active: 1,204명" 
            icon={Users} 
            onClick={() => navigate('/admin/v2/users')}
          />
      </div>

      {/* Main Grid */}
      <BentoGrid className="grid-cols-1 md:grid-cols-3 auto-rows-[24rem]">
        
        {/* Golden Radar (Span 2) */}
        <div className="md:col-span-2 rounded-xl bg-[#18181B] border border-white/5 p-6 flex flex-col">
             <div className="flex justify-between items-start mb-6">
                 <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <TriangleAlert className="w-5 h-5 text-amber-400" />
                        골든 레이더 (Risk & Opportunity)
                    </h3>
                    <p className="text-zinc-500 text-xs">AI가 탐지한 위기/기회 유저 그룹입니다.</p>
                 </div>
                 <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/5 animate-pulse">
                    Live Scanning
                 </Badge>
             </div>
             
             <div className="flex-1 grid grid-cols-2 gap-4">
                 {/* Risk Group */}
                 <Card className="bg-black/20 border-red-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                            <PulsatingDot color="#ef4444" /> Crisis Group (위기)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-red-500/5 border border-red-500/10">
                                <div>
                                    <div className="text-white font-medium">User_{900+i}</div>
                                    <div className="text-xs text-red-300">연패 7회 (Tilt 감지)</div>
                                </div>
                                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-7 text-xs">
                                    개입
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                 </Card>

                 {/* Opportunity Group */}
                 <Card className="bg-black/20 border-emerald-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
                            <PulsatingDot color="#10b981" /> Whales (기회)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                                <div>
                                    <div className="text-white font-medium">User_{100+i}</div>
                                    <div className="text-xs text-emerald-300">잔액 500만+ (Win Streak)</div>
                                </div>
                                <Button size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 h-7 text-xs">
                                    관찰
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                 </Card>
             </div>
        </div>

        {/* Real-time Alerts (Span 1) */}
        <div className="md:col-span-1 rounded-xl bg-[#18181B] border border-white/5 p-6 relative flex flex-col">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                운영 알림
             </h3>
             <div className="space-y-4 overflow-y-auto pr-2">
                 <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
                     <div className="flex justify-between mb-1">
                        <span className="font-bold text-yellow-400">출금 지연</span>
                        <span className="text-xs text-zinc-500">2m ago</span>
                     </div>
                     <p className="text-zinc-300">100만원 이상 고액 출금 요청 3건이 대기 중입니다.</p>
                 </div>
                 <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
                     <div className="flex justify-between mb-1">
                        <span className="font-bold text-blue-400">신규 가입 급증</span>
                        <span className="text-xs text-zinc-500">15m ago</span>
                     </div>
                     <p className="text-zinc-300">최근 1시간 내 신규 가입자가 평소 대비 200% 증가했습니다.</p>
                 </div>
                 <div className="p-3 rounded-lg bg-zinc-800/50 border border-white/5 text-sm">
                     <div className="flex justify-between mb-1">
                        <span className="font-bold text-zinc-400">시스템 백업</span>
                        <span className="text-xs text-zinc-500">1h ago</span>
                     </div>
                     <p className="text-zinc-500">정기 데이터베이스 백업이 완료되었습니다.</p>
                 </div>
             </div>
        </div>

      </BentoGrid>
      
    </div>
  );
}

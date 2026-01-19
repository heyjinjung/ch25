
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { 
    Activity, 
    Database, 
    Zap, 
    Cpu, 
    RefreshCcw, 
    CheckCircle2, 
    AlertCircle,
    Server
} from "lucide-react";
import { useOpsStatus } from "../../../hooks/useV2Admin";
import { Progress } from "../../../components/ui/progress";
import { useEffect, useState } from "react";

export default function HealthPage() {
  const { data: status, isLoading, refetch } = useOpsStatus();
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  useEffect(() => {
    if (status) setLastCheck(new Date());
  }, [status]);

  const getStatusIcon = (s: string) => {
    if (s === "OK") return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    if (s === "DEGRADED") return <AlertCircle className="w-5 h-5 text-amber-500" />;
    return <AlertCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusBadge = (s: string) => {
    if (s === "OK") return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Operational</Badge>;
    if (s === "DEGRADED") return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Degraded</Badge>;
    return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Critical</Badge>;
  };

  if (isLoading || !status) {
      return (
          <div className="p-8 h-full flex items-center justify-center text-zinc-500">
              <Activity className="w-6 h-6 animate-pulse mr-2" />
              Checking System Health...
          </div>
      );
  }

  return (
    <div className="p-6 space-y-8 bg-[#121214] min-h-screen text-white">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
           <div className="flex items-center gap-2 text-indigo-400 mb-2">
               <Server className="w-4 h-4" />
               <span className="text-xs font-bold uppercase tracking-wider">System Infrastructure</span>
           </div>
           <h1 className="text-2xl font-bold tracking-tight">상태 관제 (System Health)</h1>
           <p className="text-sm text-zinc-400 mt-1">
             V2 백엔드 노드 및 데이터 저장소의 실시간 상태를 모니터링합니다.
           </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs text-zinc-500">
            <span>Last checked: {lastCheck.toLocaleTimeString()}</span>
            <Button variant="outline" size="sm" className="h-8 border-white/10 hover:bg-white/5" onClick={() => refetch()}>
                <RefreshCcw className="w-3 h-3 mr-2" /> Refresh
            </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Database Status */}
        <Card className="bg-[#18181B] border-white/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-400" />
                    <CardTitle className="text-base font-bold">PostgreSQL Main</CardTitle>
                </div>
                {getStatusIcon(status.system.db)}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Status</span>
                    {getStatusBadge(status.system.db)}
                </div>
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Connection Pool</span>
                        <span className="text-zinc-300">12/100</span>
                    </div>
                    <Progress value={12} className="h-1 bg-white/5" indicatorClassName="bg-indigo-500" />
                </div>
            </CardContent>
        </Card>

        {/* Redis Status */}
        <Card className="bg-[#18181B] border-white/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <CardTitle className="text-base font-bold">Redis Cache</CardTitle>
                </div>
                {getStatusIcon(status.system.redis)}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Status</span>
                    {getStatusBadge(status.system.redis)}
                </div>
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Memory Usage</span>
                        <span className="text-zinc-300">256MB / 2.0GB</span>
                    </div>
                    <Progress value={12.5} className="h-1 bg-white/5" indicatorClassName="bg-amber-500" />
                </div>
            </CardContent>
        </Card>

        {/* Worker Status */}
        <Card className="bg-[#18181B] border-white/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-blue-400" />
                    <CardTitle className="text-base font-bold">Celery Workers</CardTitle>
                </div>
                {getStatusIcon(status.system.worker)}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Status</span>
                    {getStatusBadge(status.system.worker)}
                </div>
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Active Tasks</span>
                        <span className="text-zinc-300">3 Tasks</span>
                    </div>
                    <Progress value={30} className="h-1 bg-white/5" indicatorClassName="bg-blue-500" />
                </div>
            </CardContent>
        </Card>
      </div>

      <Card className="bg-[#18181B] border-white/5">
          <CardHeader>
              <CardTitle className="text-lg">System Logs (Operational)</CardTitle>
              <CardDescription className="text-zinc-500">최근 1시간 동안의 주요 시스템 이벤트입니다.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="space-y-4">
                  {[
                      { time: '10:05:22', level: 'INFO', msg: 'Database connection optimized.' },
                      { time: '09:42:01', level: 'INFO', msg: 'Golden Radar scan completed (No major risks).' },
                      { time: '09:00:00', level: 'INFO', msg: 'Daily maintenance tasks verified.' }
                  ].map((log, i) => (
                      <div key={i} className="flex gap-4 text-xs font-mono border-b border-white/5 pb-2 last:border-0">
                          <span className="text-zinc-600">{log.time}</span>
                          <span className="text-indigo-400">[{log.level}]</span>
                          <span className="text-zinc-400">{log.msg}</span>
                      </div>
                  ))}
              </div>
          </CardContent>
      </Card>
    </div>
  );
}

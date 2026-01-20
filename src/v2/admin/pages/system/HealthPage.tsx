import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import {
  Activity,
  Database,
  Zap,
  Cpu,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Server,
} from "lucide-react";
import { useOpsStatus } from "../../../hooks/useV2Admin";
import { Progress } from "../../../components/ui/progress";
import { useEffect, useState } from "react";
import { AnimatedList } from "../../components/ui/AnimatedList";
import { PulsatingDot } from "../../components/ui/PulsatingDot";

export default function HealthPage() {
  const { data: status, isLoading, refetch } = useOpsStatus();
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  useEffect(() => {
    if (status) setLastCheck(new Date());
  }, [status]);

  const getStatusIcon = (s: string) => {
    if (s === "OK")
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    if (s === "DEGRADED")
      return <AlertCircle className="w-5 h-5 text-amber-500" />;
    return <AlertCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusBadge = (s: string) => {
    if (s === "OK")
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
          Operational
        </Badge>
      );
    if (s === "DEGRADED")
      return (
        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
          Degraded
        </Badge>
      );
    return (
      <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
        Critical
      </Badge>
    );
  };

  if (isLoading || !status) {
    return (
      <div className="p-8 h-full flex items-center justify-center text-zinc-500">
        <Activity className="w-6 h-6 animate-pulse mr-2" />
        시스템 상태 확인 중...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-[#121214] min-h-screen text-white">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-[#D2FD9C] mb-2">
            <Server className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              인프라 모니터링 (Infrastructure)
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            상태 관제 (System Health)
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            V2 백엔드 노드 및 데이터 저장소의 실시간 상태를 모니터링합니다.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs text-zinc-500">
          <span className="flex items-center gap-2">
            <PulsatingDot color="#D2FD9C" /> 실시간 업데이트 중
          </span>
          <span>마지막 확인: {lastCheck.toLocaleTimeString()}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-white/10 hover:bg-white/5"
            onClick={() => refetch()}
          >
            <RefreshCcw className="w-3 h-3 mr-2" /> 새로고침
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Database Status */}
        <Card className="bg-[#18181B] border-white/5 hover:border-indigo-500/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              <CardTitle className="text-base font-bold">MySQL (db)</CardTitle>
            </div>
            {getStatusIcon(status.system.db)}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">상태 (Status)</span>
              {getStatusBadge(status.system.db)}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">활성 연결 수</span>
                <span className="text-zinc-300">12 / 150</span>
              </div>
              <Progress
                value={8}
                className="h-1 bg-white/5"
                indicatorClassName="bg-indigo-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Redis Status */}
        <Card className="bg-[#18181B] border-white/5 hover:border-amber-500/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <CardTitle className="text-base font-bold">
                Redis (cache)
              </CardTitle>
            </div>
            {getStatusIcon(status.system.redis)}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">상태 (Status)</span>
              {getStatusBadge(status.system.redis)}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">접속 클라이언트</span>
                <span className="text-zinc-300">8 Connected</span>
              </div>
              <Progress
                value={25}
                className="h-1 bg-white/5"
                indicatorClassName="bg-amber-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Worker Status */}
        <Card className="bg-[#18181B] border-white/5 hover:border-blue-500/30 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              <CardTitle className="text-base font-bold">
                Backend (api)
              </CardTitle>
            </div>
            {getStatusIcon(status.system.worker)}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">상태 (Status)</span>
              {getStatusBadge(status.system.worker)}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">가동 시간</span>
                <span className="text-zinc-300">148h 22m</span>
              </div>
              <Progress
                value={100}
                className="h-1 bg-white/5"
                indicatorClassName="bg-blue-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#18181B] border-white/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#D2FD9C]" />
            최근 시스템 이벤트 (Recent Events)
          </CardTitle>
          <CardDescription className="text-zinc-500">
            실시간 인프라 활동 로그입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatedList>
            {[
              {
                time: "10:05:22",
                level: "INFO",
                msg: "Database connection optimized.",
                id: 1,
              },
              {
                time: "09:42:01",
                level: "INFO",
                msg: "Golden Radar scan completed (No major risks).",
                id: 2,
              },
              {
                time: "09:00:00",
                level: "INFO",
                msg: "Daily maintenance tasks verified.",
                id: 3,
              },
              {
                time: "08:30:15",
                level: "WARN",
                msg: "Slight latency spike in Redis cluster detected.",
                id: 4,
              },
            ].map((log) => (
              <div
                key={log.id}
                className="flex gap-4 text-xs font-mono border-b border-white/5 pb-3 last:border-0 hover:bg-white/5 transition-colors p-2 rounded-lg"
              >
                <span className="text-zinc-600 w-[80px]">{log.time}</span>
                <span
                  className={cn(
                    "w-[60px]",
                    log.level === "INFO"
                      ? "text-indigo-400"
                      : "text-amber-400 font-bold",
                  )}
                >
                  [{log.level}]
                </span>
                <span className="text-zinc-400 flex-1">{log.msg}</span>
              </div>
            ))}
          </AnimatedList>
        </CardContent>
      </Card>
    </div>
  );
}

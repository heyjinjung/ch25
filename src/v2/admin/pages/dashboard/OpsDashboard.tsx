import { useNavigate } from "react-router-dom";
import {
  Activity,
  Server,
  ShieldAlert,
  Users,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { BentoGrid } from "../../components/ui/BentoGrid";
import { QuickActionCard } from "../../components/ui/QuickActionCard";
import { PulsatingDot } from "../../components/ui/PulsatingDot";
import { NumberTicker } from "../../components/ui/NumberTicker";
import { useOpsStatus } from "../../../hooks/useV2Admin";
import { useState } from "react";
import { UserDetailDrawer } from "../users/UserDetailDrawer";

export default function OpsDashboard() {
  const navigate = useNavigate();
  const { data: status, isLoading } = useOpsStatus();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleUserClick = (userId: number) => {
    setSelectedUserId(userId);
    setIsDrawerOpen(true);
  };

  if (isLoading || !status) {
    return (
      <div className="p-8 h-screen bg-obsidian-bg text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <PulsatingDot color="#6366f1" />
          <span className="text-obsidian-muted">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  // Derived status colors
  const getStatusColor = (s: string) =>
    s === "OK"
      ? "bg-emerald-500"
      : s === "DEGRADED"
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="space-y-8">
      {/* Quick Actions Row */}
      <div className="flex justify-end gap-2">
        <Button className="bg-[#D2FD9C] text-black hover:bg-[#bbf07c]">
          긴급 점검 모드 (Maintenance)
        </Button>
      </div>

      {/* Top Row: Critical Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <QuickActionCard
          label="시스템 정상 작동 여부"
          description={
            <div className="flex gap-2 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${getStatusColor(status.system.db)}`}
                title="데이터베이스"
              />
              <span
                className={`w-2 h-2 rounded-full ${getStatusColor(status.system.redis)}`}
                title="고속 저장소"
              />
              <span
                className={`w-2 h-2 rounded-full ${getStatusColor(status.system.worker)}`}
                title="자동 처리 엔진"
              />
            </div>
          }
          icon={Server}
        />
        <QuickActionCard
          label="리텐션 케어"
          description={
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-zinc-500">준비 중입니다</span>
            </div>
          }
          icon={Activity}
          className="opacity-50 cursor-not-allowed"
          onClick={() => {}}
        />
        <QuickActionCard
          label="이탈 감지 (레이더)"
          description={
            <div className="flex gap-2">
              <span className="text-red-400">
                위험: {status?.goldenRadar?.churnRisks ?? 0}
              </span>
              <span className="text-zinc-500">/</span>
              <span className="text-emerald-400">
                고액: {status?.goldenRadar?.highRollers ?? 0}
              </span>
            </div>
          }
          icon={ShieldAlert}
          className="border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
          onClick={() => navigate("/admin/dashboard/golden")}
        />
        <QuickActionCard
          label="오늘 활동 유저"
          description={
            <div className="flex items-center gap-1">
              <NumberTicker
                value={status?.metrics?.activeUsers24h ?? 0}
                className="text-lg font-bold"
              />
              <span className="text-xs text-zinc-500">명(24시간 기준)</span>
            </div>
          }
          icon={Users}
          onClick={() => navigate("/admin/users")}
        />
      </div>

      {/* Main Grid */}
      <BentoGrid className="grid-cols-1 md:grid-cols-3 auto-rows-[24rem]">
        {/* HQ Margin Status (Span 1) */}
        <div className="md:col-span-1 rounded-xl bg-obsidian-surface border border-obsidian-border p-6 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-6 z-10">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                본사 입금액 대조 (Margin)
              </h3>
              <p className="text-obsidian-muted text-xs">
                {status?.hqStats?.lastSyncAt 
                  ? `마지막 업데이트: ${new Date(status.hqStats.lastSyncAt).toLocaleString()}`
                  : "아직 데이터 없음"}
              </p>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
              본사 데이터
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 z-10">
            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
              <p className="text-[10px] text-zinc-500 uppercase font-bold">VIP 유저(100만+)</p>
              <p className="text-xl font-bold text-purple-400">{status?.hqStats?.vipCount ?? 0}</p>
            </div>
            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
              <p className="text-[10px] text-zinc-500 uppercase font-bold">큰손 유저(500만+)</p>
              <p className="text-xl font-bold text-blue-400">{status?.hqStats?.whaleCount ?? 0}</p>
            </div>
            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
              <p className="text-[10px] text-zinc-500 uppercase font-bold">떠날 위험군</p>
              <p className="text-xl font-bold text-orange-400">{status?.hqStats?.atRiskCount ?? 0}</p>
            </div>
            <div className="bg-black/20 p-3 rounded-lg border border-white/5">
              <p className="text-[10px] text-zinc-500 uppercase font-bold">잠재 VIP 고객</p>
              <p className="text-xl font-bold text-zinc-400">{status?.hqStats?.prospectiveVipCount ?? 0}</p>
            </div>
          </div>
          
          {/* Background Decor */}
          <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
            <DollarSign size={150} />
          </div>
        </div>

        {/* Golden Radar (Span 2) */}
        <div className="md:col-span-2 rounded-xl bg-obsidian-surface border border-obsidian-border p-6 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                위험군 및 기회 유저
              </h3>
              <p className="text-obsidian-muted text-xs">
                AI가 분석한 즉시 관리가 필요한 유저 그룹입니다.
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-amber-500/30 text-amber-500 bg-amber-500/5 animate-pulse"
            >
              집중 관리 리스트
            </Badge>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-4">
            {/* Risk Group */}
            <Card className="bg-black/20 border-red-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                  <PulsatingDot color="#ef4444" /> 위기 그룹 (곧 떠날 유저)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {status?.goldenRadar?.riskUsers &&
                status.goldenRadar.riskUsers.length > 0 ? (
                  <div className="space-y-2">
                    {status.goldenRadar.riskUsers.map((u) => (
                      <div
                        key={u.userId}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-obsidian-border hover:bg-white/10 cursor-pointer transition-colors"
                        onClick={() => handleUserClick(u.userId)}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">
                            {u.nickname}
                          </span>
                          <span className="text-[10px] text-obsidian-muted">
                            이탈 위험도: {(u.churnScore * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${u.riskLevel === "HIGH" ? "border-red-500/50 text-red-400" : "border-amber-500/50 text-amber-400"}`}
                        >
                          {u.riskLevel === "HIGH" ? "매우 위험" : "주의"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-obsidian-muted text-sm">
                    현재 모니터링 중인 위험 군이 없습니다.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Opportunity Group */}
            <Card className="bg-black/20 border-emerald-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
                  <PulsatingDot color="#10b981" /> 기회 그룹 (고액 유저)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8 text-obsidian-muted text-sm">
                  {status?.goldenRadar?.highRollers > 0
                    ? `${status.goldenRadar.highRollers}명의 큰손 유저가 활동 중입니다.`
                    : "현재 활동 중인 기회 그룹 유저가 없습니다."}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Real-time Alerts (Span 1) */}
        <div className="md:col-span-1 rounded-xl bg-obsidian-surface border border-obsidian-border p-6 relative flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
             알림
          </h3>
          <div className="space-y-4 overflow-y-auto pr-2">
            {/* Mock Alerts for now, can be connected to real logs later */}
            <div className="p-3 rounded-lg bg-zinc-800/50 border border-obsidian-border text-sm">
              <div className="flex justify-between mb-1">
                <span className="font-bold text-zinc-400">데이터베이스 백업</span>
                <span className="text-xs text-zinc-500">1h ago</span>
              </div>
              <p className="text-zinc-500">
                데이터베이스 백업
              </p>
            </div>
          </div>
        </div>
      </BentoGrid>

      <UserDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        userId={selectedUserId}
      />
    </div>
  );
}

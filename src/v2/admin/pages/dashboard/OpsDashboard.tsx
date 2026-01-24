import { useNavigate } from "react-router-dom";
import {
  Activity,
  Server,
  ShieldAlert,
  Users,
  TriangleAlert,
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
      <div className="p-8 h-screen bg-[#121214] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <PulsatingDot color="#6366f1" />
          <span className="text-zinc-400">Loading Dashboard...</span>
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
    <div className="p-6 space-y-8 h-full bg-[#121214] min-h-screen text-[#E4E4E7] font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            ?�영 ?�?�보??(Ops Dashboard)
          </h1>
          <p className="text-sm text-zinc-400">
            ?�스???�태, 리스???��?, ?�심 ?�영 지?��? ?�시간으�?관?�합?�다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-[#D2FD9C] text-black hover:bg-[#bbf07c]">
            긴급 ?��? (Maintenance)
          </Button>
        </div>
      </div>

      {/* Top Row: Critical Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <QuickActionCard
          label="?�스???�태"
          description={
            <div className="flex gap-2 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${getStatusColor(status.system.db)}`}
                title="DB"
              />
              <span
                className={`w-2 h-2 rounded-full ${getStatusColor(status.system.redis)}`}
                title="Redis"
              />
              <span
                className={`w-2 h-2 rounded-full ${getStatusColor(status.system.worker)}`}
                title="Worker"
              />
            </div>
          }
          icon={Server}
        />
        <QuickActionCard
          label="개발�?(Holding)"
          description={
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-zinc-500">리텐???�황 준비중</span>
            </div>
          }
          icon={Activity}
          className="opacity-50 cursor-not-allowed"
          onClick={() => {}}
        />
        <QuickActionCard
          label="골든 레이더"
          description={
            <div className="flex gap-2">
              <span className="text-red-400">
                Risk: {status?.goldenRadar?.churnRisks ?? 0}
              </span>
              <span className="text-zinc-500">/</span>
              <span className="text-emerald-400">
                High: {status?.goldenRadar?.highRollers ?? 0}
              </span>
            </div>
          }
          icon={ShieldAlert}
          className="border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
          onClick={() => navigate("/admin/dashboard/golden")}
        />
        <QuickActionCard
          label="금일 ?�속??(Active)"
          description={
            <div className="flex items-center gap-1">
              <NumberTicker
                value={status?.metrics?.activeUsers24h ?? 0}
                className="text-lg font-bold"
              />
              <span className="text-xs text-zinc-500">�?(24h)</span>
            </div>
          }
          icon={Users}
          onClick={() => navigate("/admin/users")}
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
                골든 ?�이??(Risk & Opportunity)
              </h3>
              <p className="text-zinc-500 text-xs">
                AI가 ?��????�기/기회 ?��? 그룹?�니??
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-amber-500/30 text-amber-500 bg-amber-500/5 animate-pulse"
            >
              ?�시�??�캔 �?
            </Badge>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-4">
            {/* Risk Group */}
            <Card className="bg-black/20 border-red-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                  <PulsatingDot color="#ef4444" /> Crisis Group (?�기)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {status?.goldenRadar?.riskUsers &&
                status.goldenRadar.riskUsers.length > 0 ? (
                  <div className="space-y-2">
                    {status.goldenRadar.riskUsers.map((u) => (
                      <div
                        key={u.userId}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                        onClick={() => handleUserClick(u.userId)}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white">
                            {u.nickname}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            Churn Score: {(u.churnScore * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${u.riskLevel === "HIGH" ? "border-red-500/50 text-red-400" : "border-amber-500/50 text-amber-400"}`}
                        >
                          {u.riskLevel}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-500 text-sm">
                    감�????�험 ?�소 ?�음
                  </div>
                )}
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
                <div className="text-center py-8 text-zinc-500 text-sm">
                  {status?.goldenRadar?.highRollers > 0
                    ? `${status.goldenRadar.highRollers}명의 고액 ?��? ?�성`
                    : "?�성 고액 ?�용???�음"}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Real-time Alerts (Span 1) */}
        <div className="md:col-span-1 rounded-xl bg-[#18181B] border border-white/5 p-6 relative flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            ?�영 ?�림
          </h3>
          <div className="space-y-4 overflow-y-auto pr-2">
            {/* Mock Alerts for now, can be connected to real logs later */}
            <div className="p-3 rounded-lg bg-zinc-800/50 border border-white/5 text-sm">
              <div className="flex justify-between mb-1">
                <span className="font-bold text-zinc-400">?�스??백업</span>
                <span className="text-xs text-zinc-500">1h ago</span>
              </div>
              <p className="text-zinc-500">
                ?�기 ?�이?�베?�스 백업???�료?�었?�니??
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

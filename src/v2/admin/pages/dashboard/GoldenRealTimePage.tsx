import { useMemo, useState } from "react";
import { Activity, Clock, Radio } from "lucide-react";
import { GoldenEventStream } from "../../components/golden/GoldenEventStream";
import { InterventionLogTable } from "../../components/golden/InterventionLogTable";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import { useInterventionLogs, useOpsStatus } from "../../../hooks/useV2Admin";

export default function GoldenRealTimePage() {
  const [activeTab, setActiveTab] = useState("events");
  const [userIdInput, setUserIdInput] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean | null>(null);
  const [eventsPerSecond, setEventsPerSecond] = useState<number | null>(null);

  const { data: interventionLogs, isLoading: isLoadingLogs } =
    useInterventionLogs(selectedUserId);
  const { data: opsStatus } = useOpsStatus();

  const handleLoadLogs = () => {
    if (userIdInput) {
      const uid = parseInt(userIdInput);
      if (!isNaN(uid)) {
        setSelectedUserId(uid);
      }
    }
  };

  const systemStatus = useMemo(() => {
    if (!opsStatus?.system)
      return { label: "확인 불가", tone: "muted" } as const;
    const { db, redis, worker } = opsStatus.system;
    if (db === "OK" && redis === "OK" && worker === "OK") {
      return { label: "시스템 정상 (Normal)", tone: "ok" } as const;
    }
    if ([db, redis, worker].includes("ERROR")) {
      return { label: "시스템 오류 (Error)", tone: "error" } as const;
    }
    return { label: "시스템 저하 (Degraded)", tone: "warn" } as const;
  }, [opsStatus]);

  const wsStatusLabel =
    wsConnected === null
      ? "확인 불가"
      : wsConnected
        ? "연결됨 (Connected)"
        : "끊김 (Disconnected)";
  const wsStatusTone =
    wsConnected === null
      ? "text-obsidian-muted"
      : wsConnected
        ? "text-emerald-500"
        : "text-red-400";
  const eventRateLabel =
    eventsPerSecond === null ? "-" : `${eventsPerSecond}/초`;

  return (
    <div className="p-6 space-y-6 bg-obsidian-bg min-h-screen text-obsidian-text">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <Radio className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">
              실시간 중계방
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            골든 실시간 중계
          </h1>
          <p className="text-sm text-obsidian-muted mt-1">
            지금 막 터진 게임 기록과 운영자 조치 내역을 생중계로 확인합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full border ${systemStatus.tone === "ok" ? "bg-emerald-500/10 border-emerald-500/20" : systemStatus.tone === "warn" ? "bg-amber-500/10 border-amber-500/20" : systemStatus.tone === "error" ? "bg-red-500/10 border-red-500/20" : "bg-white/5 border-obsidian-border"}`}
          >
            <div
              className={`w-2 h-2 rounded-full ${systemStatus.tone === "ok" ? "bg-emerald-500 animate-pulse" : systemStatus.tone === "warn" ? "bg-amber-500" : systemStatus.tone === "error" ? "bg-red-500" : "bg-obsidian-muted"}`}
            />
            <span
              className={`text-xs font-medium ${systemStatus.tone === "ok" ? "text-emerald-500" : systemStatus.tone === "warn" ? "text-amber-500" : systemStatus.tone === "error" ? "text-red-500" : "text-obsidian-muted"}`}
            >
              {systemStatus.label}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Event Stream (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-obsidian-surface border border-obsidian-border">
                <TabsTrigger
                  value="events"
                  className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-500"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  게임 중계
                </TabsTrigger>
                <TabsTrigger
                  value="interventions"
                  className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  특별 관리 기록
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="events" className="mt-0">
              <GoldenEventStream
                onConnectionChange={setWsConnected}
                onEventsPerSecondChange={setEventsPerSecond}
              />
            </TabsContent>

            <TabsContent value="interventions" className="mt-0 space-y-4">
              <div className="bg-obsidian-surface border border-obsidian-border rounded-lg p-4 flex gap-4 items-center">
                <Input
                  type="number"
                  placeholder="유저 ID 입력"
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLoadLogs();
                  }}
                  className="w-48 bg-black/20 border-obsidian-border"
                />
                <Button
                  onClick={handleLoadLogs}
                  variant="outline"
                  className="border-obsidian-border hover:bg-white/5"
                >
                  조회
                </Button>
                {selectedUserId && params_logs_exist(interventionLogs) && (
                  <span className="text-xs text-obsidian-muted">
                    총 {interventionLogs?.length || 0}건의 로그 발견
                  </span>
                )}
              </div>
              <InterventionLogTable
                logs={interventionLogs || []}
                isLoading={isLoadingLogs}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Status & Control */}
        <div className="space-y-6">
          <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">중계 연결 상태</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-obsidian-muted">서버 연결</span>
                <span className={`${wsStatusTone} font-medium`}>
                  {wsStatusLabel}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-obsidian-muted">지연 시간</span>
                <span className="text-white font-medium">-</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-obsidian-muted">데이터 속도</span>
                <span className="text-white font-medium">{eventRateLabel}</span>
              </div>
            </div>
          </div>

          <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">모아보기</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-obsidian-border text-obsidian-muted hover:text-white"
              >
                고액 베팅만
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-obsidian-border text-obsidian-muted hover:text-white"
              >
                당첨 이벤트만
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-obsidian-border text-obsidian-muted hover:text-white"
              >
                특별 조치만
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function params_logs_exist(logs: any[] | undefined): boolean {
  return !!logs && logs.length > 0;
}

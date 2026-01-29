import { useState } from "react";
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
import { useInterventionLogs } from "../../../hooks/useV2Admin";

export default function GoldenRealTimePage() {
  const [activeTab, setActiveTab] = useState("events");
  const [userIdInput, setUserIdInput] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: interventionLogs, isLoading: isLoadingLogs } =
    useInterventionLogs(selectedUserId);

  const handleLoadLogs = () => {
    if (userIdInput) {
      const uid = parseInt(userIdInput);
      if (!isNaN(uid)) {
        setSelectedUserId(uid);
      }
    }
  };

  return (
    <div className="p-6 space-y-6 bg-obsidian-bg min-h-screen text-obsidian-text">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <Radio className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">
              실시간 모니터링 (Real-time Monitoring)
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            골든 라이브(Golden Real-time)
          </h1>
          <p className="text-sm text-obsidian-muted mt-1">
            실시간 게임 이벤트 및 인터벤션 로그를 모니터링합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
                <span className="text-xs font-medium text-emerald-500">시스템 정상 (Normal)</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Event Stream (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-obsidian-surface border border-obsidian-border">
                <TabsTrigger
                  value="events"
                  className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-500"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  게임 스트림
                </TabsTrigger>
                <TabsTrigger
                  value="interventions"
                  className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  인터벤션 로그
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="events" className="mt-0">
              <GoldenEventStream />
            </TabsContent>

            <TabsContent value="interventions" className="mt-0 space-y-4">
              <div className="bg-obsidian-surface border border-obsidian-border rounded-lg p-4 flex gap-4 items-center">
                 <Input 
                    type="number" 
                    placeholder="유저 ID 입력" 
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleLoadLogs();
                    }}
                    className="w-48 bg-black/20 border-obsidian-border"
                 />
                 <Button onClick={handleLoadLogs} variant="outline" className="border-obsidian-border hover:bg-white/5">
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
                <h3 className="text-lg font-bold text-white mb-4">모니터링 상태</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-obsidian-muted">WebSocket 연결</span>
                        <span className="text-emerald-500 font-medium">연결됨 (Connected)</span>
                    </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-obsidian-muted">지연 시간(Latency)</span>
                        <span className="text-white font-medium">24ms</span>
                    </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-obsidian-muted">이벤트 처리율</span>
                        <span className="text-white font-medium">120/초 (sec)</span>
                    </div>
                </div>
            </div>

             <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">빠른 필터</h3>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="text-xs border-obsidian-border text-obsidian-muted hover:text-white">
                        고액 베팅만
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs border-obsidian-border text-obsidian-muted hover:text-white">
                        당첨 이벤트만
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs border-obsidian-border text-obsidian-muted hover:text-white">
                        인터벤션 발동만
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

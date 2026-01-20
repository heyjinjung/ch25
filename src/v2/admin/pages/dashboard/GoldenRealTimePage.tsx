import { useState } from "react";
import { Activity, Clock, Radio } from "lucide-react";
import { GoldenEventStream } from "../../components/golden/GoldenEventStream";
import { InterventionLogTable } from "../../components/golden/InterventionLogTable";
import { useInterventionLogs, useOpsStatus } from "../../../hooks/useV2Admin";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";

export default function GoldenRealTimePage() {
  const [activeTab, setActiveTab] = useState("stream");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userIdInput, setUserIdInput] = useState("");

  const { data: opsStatus } = useOpsStatus();
  const { data: interventionLogs, isLoading: isLoadingLogs } = useInterventionLogs(
    selectedUserId,
    100,
  );

  const handleLoadLogs = () => {
    const userId = parseInt(userIdInput);
    if (!isNaN(userId) && userId > 0) {
      setSelectedUserId(userId);
      setActiveTab("interventions");
    }
  };

  const handleQuickSelect = (userId: number) => {
    setSelectedUserId(userId);
    setUserIdInput(userId.toString());
    setActiveTab("interventions");
  };

  return (
    <div className="p-6 space-y-6 h-full bg-[#121214] min-h-screen text-[#E4E4E7] font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
            <Radio className="w-7 h-7 text-amber-400" />
            Golden 실시간 모니터링
          </h1>
          <p className="text-sm text-zinc-400">
            게임 이벤트 스트림 및 인터벤션 로그를 실시간으로 모니터링합니다.
          </p>
        </div>

        {/* User ID Quick Selector */}
        {opsStatus?.goldenRadar?.riskUsers &&
          opsStatus.goldenRadar.riskUsers.length > 0 && (
            <Card className="bg-[#18181B] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-zinc-400 flex items-center gap-2">
                  <Activity className="w-3 h-3" />
                  위험 유저 빠른 선택
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                {opsStatus.goldenRadar.riskUsers.slice(0, 5).map((user) => (
                  <Button
                    key={user.userId}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSelect(user.userId)}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    {user.nickname}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-[#18181B] border border-white/10">
          <TabsTrigger
            value="stream"
            className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
          >
            <Radio className="w-4 h-4 mr-2" />
            실시간 이벤트 스트림
          </TabsTrigger>
          <TabsTrigger
            value="interventions"
            className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
          >
            <Clock className="w-4 h-4 mr-2" />
            인터벤션 로그
          </TabsTrigger>
        </TabsList>

        {/* Event Stream Tab */}
        <TabsContent value="stream" className="mt-6">
          <GoldenEventStream />
        </TabsContent>

        {/* Intervention Logs Tab */}
        <TabsContent value="interventions" className="mt-6 space-y-4">
          {/* User ID Selector */}
          <Card className="bg-[#18181B] border-white/10">
            <CardHeader>
              <CardTitle className="text-sm text-gray-300">
                인터벤션 로그 조회
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                type="number"
                placeholder="유저 ID 입력"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLoadLogs();
                  }
                }}
                className="bg-black/20 border-white/10 text-white placeholder:text-zinc-500"
              />
              <Button
                onClick={handleLoadLogs}
                className="bg-amber-500 text-black hover:bg-amber-400"
              >
                조회
              </Button>
            </CardContent>
          </Card>

          {/* Intervention Logs */}
          <div className="admin-card-premium p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-100">
                인터벤션 로그
                {selectedUserId && (
                  <span className="ml-2 text-amber-400">
                    (User ID: {selectedUserId})
                  </span>
                )}
              </h3>
              {interventionLogs && interventionLogs.length > 0 && (
                <span className="text-sm text-gray-400">
                  총 {interventionLogs.length}건
                </span>
              )}
            </div>

            <InterventionLogTable
              logs={interventionLogs || []}
              isLoading={isLoadingLogs}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

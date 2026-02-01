import React from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import OpsDashboard from "./OpsDashboard";
import GoldenRealTimePage from "./GoldenRealTimePage";
import CrisisRadarPage from "./CrisisRadarPage";
import { Activity, Radio, AlertTriangle } from "lucide-react";

const ControlCenterPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            통합 관제 센터
          </h1>
          <p className="text-zinc-400 mt-1">
            실시간 서비스 현황 및 유저 위기 징후를 한곳에서 모니터링합니다.
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="bg-obsidian-surface border border-obsidian-border p-1 h-auto flex-wrap sm:flex-nowrap">
          <TabsTrigger
            value="dashboard"
            className="flex items-center gap-2 px-6 py-2.5 data-[state=active]:bg-obsidian-accent/10 data-[state=active]:text-obsidian-accent"
          >
            <Activity size={16} />
            현황판
          </TabsTrigger>
          <TabsTrigger
            value="realtime"
            className="flex items-center gap-2 px-6 py-2.5 data-[state=active]:bg-obsidian-accent/10 data-[state=active]:text-obsidian-accent"
          >
            <Radio size={16} />
            실시간 중계
          </TabsTrigger>
          <TabsTrigger
            value="radar"
            className="flex items-center gap-2 px-6 py-2.5 data-[state=active]:bg-obsidian-accent/10 data-[state=active]:text-obsidian-accent"
          >
            <AlertTriangle size={16} />
            이탈 위험
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none">
            <OpsDashboard />
          </TabsContent>
          <TabsContent value="realtime" className="mt-0 focus-visible:outline-none">
            <GoldenRealTimePage />
          </TabsContent>
          <TabsContent value="radar" className="mt-0 focus-visible:outline-none">
            <CrisisRadarPage />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default ControlCenterPage;

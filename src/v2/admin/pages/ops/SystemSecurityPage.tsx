import React from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import CircuitBreakerPage from "../economy/CircuitBreakerPage";
import LatencySurvivalPage from "../economy/LatencySurvivalPage";
import CSVImportPage from "./CSVImportPage";
import AuditLogPage from "./AuditLogPage";
import { ShieldAlert, Clock, FileUp, Shield } from "lucide-react";

const SystemSecurityPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            시스템 및 보안 설정
          </h1>
          <p className="text-zinc-400 mt-1">
            기초 데이터 반입 및 시스템 보안, 지급 한도 설정을 통합 관리합니다.
          </p>
        </div>
      </div>

      <Tabs defaultValue="emergency" className="w-full">
        <TabsList className="bg-obsidian-surface border border-obsidian-border p-1 h-auto flex-wrap sm:flex-nowrap">
          <TabsTrigger
            value="emergency"
            className="flex items-center gap-2 px-6 py-2.5 data-[state=active]:bg-obsidian-accent/10 data-[state=active]:text-obsidian-accent"
          >
            <ShieldAlert size={16} />
            비상 정지
          </TabsTrigger>
          <TabsTrigger
            value="latency"
            className="flex items-center gap-2 px-6 py-2.5 data-[state=active]:bg-obsidian-accent/10 data-[state=active]:text-obsidian-accent"
          >
            <Clock size={16} />
            지연 승인
          </TabsTrigger>
          <TabsTrigger
            value="csv"
            className="flex items-center gap-2 px-6 py-2.5 data-[state=active]:bg-obsidian-accent/10 data-[state=active]:text-obsidian-accent"
          >
            <FileUp size={16} />
            데이터 반입
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            className="flex items-center gap-2 px-6 py-2.5 data-[state=active]:bg-obsidian-accent/10 data-[state=active]:text-obsidian-accent"
          >
            <Shield size={16} />
            운영 기록
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="emergency" className="mt-0 focus-visible:outline-none">
            <CircuitBreakerPage />
          </TabsContent>
          <TabsContent value="latency" className="mt-0 focus-visible:outline-none">
            <LatencySurvivalPage />
          </TabsContent>
          <TabsContent value="csv" className="mt-0 focus-visible:outline-none">
            <CSVImportPage />
          </TabsContent>
          <TabsContent value="audit" className="mt-0 focus-visible:outline-none">
            <AuditLogPage />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default SystemSecurityPage;

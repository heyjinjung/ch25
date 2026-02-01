import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import MessageSenderPage from "./MessageSenderPage";
import SurveyPage from "./SurveyPage";
// import RetentionAnalyticsPanel from "./RetentionAnalyticsPanel";
// import RevenueAnalyticsPanel from "./RevenueAnalyticsPanel";
// import MarketingPerformancePanel from "./MarketingPerformancePanel";
import {
  MessageSquare,
  ClipboardList,
} from "lucide-react";

export default function MarketingTabPage() {
  const [activeTab, setActiveTab] = useState<string>("messages");

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <div className="mb-6">
          <TabsList className="bg-zinc-900/50 border border-white/10 p-1">
            <TabsTrigger
              value="messages"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              메시지 발송
            </TabsTrigger>
            <TabsTrigger
              value="surveys"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2"
            >
              <ClipboardList className="w-4 h-4" />
              설문 조사
            </TabsTrigger>
            {/* <TabsTrigger
              value="retention"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              리텐션
            </TabsTrigger>
            <TabsTrigger
              value="revenue"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2"
            >
              <DollarSign className="w-4 h-4" />
              매출
            </TabsTrigger>
            <TabsTrigger
              value="marketing-performance"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2"
            >
              <Megaphone className="w-4 h-4" />
              마케팅 성과
            </TabsTrigger> */}
          </TabsList>
        </div>

        <TabsContent value="messages" className="mt-0">
          <MessageSenderPage />
        </TabsContent>

        <TabsContent value="surveys" className="mt-0">
          <SurveyPage />
        </TabsContent>

        {/* <TabsContent value="retention" className="mt-0">
          <RetentionAnalyticsPanel />
        </TabsContent>

        <TabsContent value="revenue" className="mt-0">
          <RevenueAnalyticsPanel />
        </TabsContent>

        <TabsContent value="marketing-performance" className="mt-0">
          <MarketingPerformancePanel />
        </TabsContent> */}
      </Tabs>
    </div>
  );
}

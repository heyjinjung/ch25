import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import ShopManagerPage from "./ShopManagerPage";
import MissionManagerPage from "../game/MissionManagerPage";
import { Store, Target } from "lucide-react";

export default function ShopMissionTabPage() {
  const [activeTab, setActiveTab] = useState<string>("shop");

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <div className="mb-6">
          <TabsList className="bg-zinc-900/50 border border-white/10 p-1">
            <TabsTrigger
              value="shop"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2"
            >
              <Store className="w-4 h-4" />
              상점 관리
            </TabsTrigger>
            <TabsTrigger
              value="mission"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2"
            >
              <Target className="w-4 h-4" />
              미션 관리
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="shop" className="mt-0">
          <ShopManagerPage />
        </TabsContent>

        <TabsContent value="mission" className="mt-0">
          <MissionManagerPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}

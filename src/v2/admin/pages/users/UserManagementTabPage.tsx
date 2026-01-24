import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import UserListPage from "./UserListPage";
import UserSegmentPage from "./UserSegmentPage";
import { Users, Target } from "lucide-react";

export default function UserManagementTabPage() {
  const [activeTab, setActiveTab] = useState<string>("users");

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <div className="mb-6">
          <TabsList className="bg-zinc-900/50 border border-white/10 p-1">
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2"
            >
              <Users className="w-4 h-4" />
              회원관리
            </TabsTrigger>
            <TabsTrigger
              value="segments"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2"
            >
              <Target className="w-4 h-4" />
              세그먼트
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users" className="mt-0">
          <UserListPage />
        </TabsContent>

        <TabsContent value="segments" className="mt-0">
          <UserSegmentPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}

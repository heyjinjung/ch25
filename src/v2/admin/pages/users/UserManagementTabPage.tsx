import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("users");

  const initialUserId = useMemo(() => {
    const raw = searchParams.get("userId");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [searchParams]);

  const initialDrawerTab = useMemo(() => {
    const raw = searchParams.get("tab");
    return raw || "wallet";
  }, [searchParams]);

  useEffect(() => {
    if (initialUserId) {
      setActiveTab("users");
      return;
    }
    const tab = searchParams.get("tab");
    if (tab === "segments") {
      setActiveTab("segments");
    } else if (tab === "users") {
      setActiveTab("users");
    }
  }, [initialUserId, searchParams]);

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
          <UserListPage
            initialUserId={initialUserId}
            initialDrawerTab={initialDrawerTab}
          />
        </TabsContent>

        <TabsContent value="segments" className="mt-0">
          <UserSegmentPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}

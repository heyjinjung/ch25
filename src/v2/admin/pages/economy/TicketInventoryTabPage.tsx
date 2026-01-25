import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import { Ticket, Package } from "lucide-react";
import TicketManagementTab from "./TicketManagementTab";
import InventoryManagementTab from "./InventoryManagementTab";

export default function TicketInventoryTabPage() {
  const [activeTab, setActiveTab] = useState<string>("ticket");

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <div className="mb-6 px-6 pt-6">
          <TabsList className="bg-zinc-900/50 border border-white/10 p-1">
            <TabsTrigger
              value="ticket"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2"
            >
              <Ticket className="w-4 h-4" />
              티켓 관리
            </TabsTrigger>
            <TabsTrigger
              value="inventory"
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2"
            >
              <Package className="w-4 h-4" />
              인벤토리 관리
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="ticket" className="mt-0">
          <TicketManagementTab />
        </TabsContent>

        <TabsContent value="inventory" className="mt-0">
          <InventoryManagementTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

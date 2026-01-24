import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getTicketStats,
  getUserTickets,
  getInventoryStats,
  getUserInventoryList,
} from "../../../api/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { Ticket, Package, Search, RefreshCw } from "lucide-react";
import { Button } from "../../../components/ui/button";

export default function TicketInventoryPage() {
  const [activeTab, setActiveTab] = useState("tickets");
  const [ticketSearch, setTicketSearch] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");

  // Ticket queries
  const { data: ticketStats = [], refetch: refetchTicketStats } = useQuery({
    queryKey: ["ticketStats"],
    queryFn: getTicketStats,
  });

  const { data: userTickets = [], refetch: refetchUserTickets } = useQuery({
    queryKey: ["userTickets", ticketSearch],
    queryFn: () => getUserTickets({ search: ticketSearch || undefined }),
  });

  // Inventory queries
  const { data: inventoryStats = [], refetch: refetchInventoryStats } = useQuery({
    queryKey: ["inventoryStats"],
    queryFn: getInventoryStats,
  });

  const { data: userInventory = [], refetch: refetchUserInventory } = useQuery({
    queryKey: ["userInventory", inventorySearch],
    queryFn: () => getUserInventoryList({ search: inventorySearch || undefined }),
  });

  const handleRefresh = () => {
    if (activeTab === "tickets") {
      refetchTicketStats();
      refetchUserTickets();
    } else {
      refetchInventoryStats();
      refetchUserInventory();
    }
  };

  return (
    <div className="space-y-6 text-white bg-[#09090b] min-h-screen p-6 md:p-8">
      {/* Header */}
      <div className="border-b border-white/5 pb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
              <span>?∏Î≤§?†Î¶¨</span>
              <span className="text-zinc-700">/</span>
              <span className="text-zinc-300">?∞Ïºì & ?ÑÏù¥??Í¥ÄÎ¶?/span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              ?¥Ïö©Í∂?& ?∏Î≤§?†Î¶¨ Í¥ÄÎ¶?
            </h1>
            <p className="text-sm text-zinc-400">
              ?¨Ïö©?êÎ≥Ñ ?∞Ïºì Î∞??∏Î≤§?†Î¶¨ ?ÑÏù¥???ÑÌô©??Ï°∞Ìöå?©Îãà??
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            className="bg-zinc-800 hover:bg-zinc-700 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            ?àÎ°úÍ≥†Ïπ®
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 gap-2 bg-[#18181B] p-2 h-auto w-full max-w-md">
          <TabsTrigger
            value="tickets"
            className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
          >
            <Ticket className="w-4 h-4 mr-2" />
            ?∞Ïºì
          </TabsTrigger>
          <TabsTrigger
            value="inventory"
            className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
          >
            <Package className="w-4 h-4 mr-2" />
            ?∏Î≤§?†Î¶¨
          </TabsTrigger>
        </TabsList>

        {/* Ticket Tab */}
        <TabsContent value="tickets" className="space-y-6 mt-6">
          {/* Global Ticket Stats */}
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-indigo-400" />
              ?ÑÏ≤¥ ?∞Ïºì Ï°∞Ìöå
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {ticketStats.map((stat) => (
                <Card key={stat.ticketType} className="bg-[#18181B] border-white/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">
                      {stat.ticketType}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="text-2xl font-bold text-white">
                      {stat.currentBalance.toLocaleString()}
                    </div>
                    <div className="flex gap-4 text-xs text-zinc-500">
                      <span>Î∞úÍ∏â: {stat.totalIssued.toLocaleString()}</span>
                      <span>?¨Ïö©: {stat.totalUsed.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* User Ticket Data */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Í∞úÎ≥Ñ ?∞Ïºì Ï°∞Ìöå</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
                <Input
                  placeholder="?†Ï? Í≤Ä??(?âÎÑ§?? ?îÎ†àÍ∑∏Îû®)"
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="pl-9 bg-black/50 border-white/10"
                />
              </div>
            </div>

            <div className="rounded-xl bg-[#18181B] border border-white/5 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-zinc-400">?†Ï?</TableHead>
                    <TableHead className="text-zinc-400">Ï¢ÖÎ•ò</TableHead>
                    <TableHead className="text-zinc-400 text-right">?îÏó¨</TableHead>
                    <TableHead className="text-zinc-400 text-right">?¨Ïö©</TableHead>
                    <TableHead className="text-zinc-400">ÎßàÏ?Îß??¨Ïö©</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userTickets.length > 0 ? (
                    userTickets.map((ticket) => (
                      <TableRow
                        key={`${ticket.userId}-${ticket.ticketType}`}
                        className="border-white/5 hover:bg-white/5"
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-white">
                              {ticket.nickname}
                            </span>
                            {ticket.telegramUsername && (
                              <span className="text-xs text-zinc-500">
                                @{ticket.telegramUsername}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                            {ticket.ticketType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-emerald-400">
                          {ticket.currentBalance.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-zinc-400">
                          {ticket.totalUsed.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-sm">
                          {ticket.lastUsedAt
                            ? new Date(ticket.lastUsedAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-zinc-600">
                        ?∞Ïºì ?∞Ïù¥?∞Í? ?ÜÏäµ?àÎã§.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6 mt-6">
          {/* Global Inventory Stats */}
          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-400" />
              ?ÑÏ≤¥ ?∏Î≤§?†Î¶¨ Ï°∞Ìöå
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {inventoryStats.map((stat) => (
                <Card key={stat.itemType} className="bg-[#18181B] border-white/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-400">
                      {stat.itemType}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="text-2xl font-bold text-white">
                      {stat.currentBalance.toLocaleString()}
                    </div>
                    <div className="flex gap-4 text-xs text-zinc-500">
                      <span>Î∞úÍ∏â: {stat.totalIssued.toLocaleString()}</span>
                      <span>?¨Ïö©: {stat.totalUsed.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* User Inventory Data */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Í∞úÎ≥Ñ ?∏Î≤§?†Î¶¨ Ï°∞Ìöå</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
                <Input
                  placeholder="?†Ï? Í≤Ä??(?âÎÑ§?? ?îÎ†àÍ∑∏Îû®)"
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="pl-9 bg-black/50 border-white/10"
                />
              </div>
            </div>

            <div className="rounded-xl bg-[#18181B] border border-white/5 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-zinc-400">?†Ï?</TableHead>
                    <TableHead className="text-zinc-400">Ï¢ÖÎ•ò</TableHead>
                    <TableHead className="text-zinc-400 text-right">?îÏó¨</TableHead>
                    <TableHead className="text-zinc-400 text-right">?¨Ïö©</TableHead>
                    <TableHead className="text-zinc-400">ÎßåÎ£å??/TableHead>
                    <TableHead className="text-zinc-400">ÎßàÏ?Îß??¨Ïö©</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userInventory.length > 0 ? (
                    userInventory.map((item) => (
                      <TableRow
                        key={`${item.userId}-${item.itemType}`}
                        className="border-white/5 hover:bg-white/5"
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-white">
                              {item.nickname}
                            </span>
                            {item.telegramUsername && (
                              <span className="text-xs text-zinc-500">
                                @{item.telegramUsername}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            {item.itemType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-emerald-400">
                          {item.currentQuantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-zinc-400">
                          {item.totalUsed.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-sm">
                          {item.expiresAt
                            ? new Date(item.expiresAt).toLocaleDateString()
                            : "Î¨¥Ï†ú??}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-sm">
                          {item.lastUsedAt
                            ? new Date(item.lastUsedAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-zinc-600">
                        ?∏Î≤§?†Î¶¨ ?∞Ïù¥?∞Í? ?ÜÏäµ?àÎã§.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

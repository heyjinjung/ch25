import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";

export default function TicketInventoryPage() {
  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">이용권 관리 (Ticket Inventory)</h1>
        <p className="text-sm text-zinc-400">사용자별 이용권 보유 현황을 조회하고 수정합니다.</p>
      </div>

       <div className="flex items-center space-x-2">
        <Input placeholder="Search user..." className="max-w-sm bg-black/50 border-white/10" />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[#18181B] border-white/5">
            <CardContent className="p-6">
                <div className="text-2xl font-bold text-white">42</div>
                <p className="text-xs text-zinc-500">Total Premium Tickets</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

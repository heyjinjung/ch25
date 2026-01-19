import { useState } from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { ShineBorder } from "../../components/ui/ShineBorder";
import { Check, X, Bell } from "lucide-react";
import { cn } from "../../../lib/utils";

// Mock Data
const DEPOSITS = [
  { id: 201, userId: 1042, amount: 300000, bankOwner: "김철수", status: "PENDING", requestedAt: "10 min ago", isNew: true },
  { id: 202, userId: 1001, amount: 1000000, bankOwner: "이영희", status: "PENDING", requestedAt: "30 min ago", isNew: false },
  { id: 203, userId: 999, amount: 50000, bankOwner: "박민수", status: "APPROVED", requestedAt: "2 hours ago", isNew: false },
];

export default function CCDepositPage() {
  const [deposits, setDeposits] = useState(DEPOSITS);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleConfirm = (id: number) => {
    // Logic to confirm deposit
    // console.log("Confirmed", id);
    setDeposits(prev => prev.map(d => d.id === id ? { ...d, status: "APPROVED", isNew: false } : d));
  };

  return (
    <div className="space-y-6 h-full p-6 text-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">CC 입금 관리 (Deposit Ops)</h1>
          <p className="text-sm text-zinc-400">외부 CC 입금 내역을 수동으로 확인하고 승인합니다.</p>
        </div>
        <Button variant="outline" className="gap-2">
            <Bell className="w-4 h-4" />
            새로고침
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* List Section */}
        <div className="lg:col-span-3 space-y-4">
             {deposits.map((item) => (
               <div key={item.id} className="relative">
                  {item.isNew && item.status === 'PENDING' ? (
                      <ShineBorder className="p-0.5 bg-[#18181B] rounded-xl" color={["#D2FD9C", "#FFD700"]}>
                          <DepositItem item={item} onSelect={setSelectedId} isSelected={selectedId === item.id} />
                      </ShineBorder>
                  ) : (
                      <div className="p-0.5 border border-white/5 rounded-xl bg-[#18181B]">
                           <DepositItem item={item} onSelect={setSelectedId} isSelected={selectedId === item.id} />
                      </div>
                  )}
               </div>
             ))}
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-1">
            <Card className="bg-[#18181B] border-white/5 sticky top-6">
                <CardHeader>
                    <CardTitle className="text-white text-lg">처리 (Action)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {selectedId ? (
                        <>
                            <div className="p-3 rounded-lg bg-zinc-900 border border-white/5 space-y-2">
                                <div className="text-xs text-zinc-500">Selected ID: #{selectedId}</div>
                                <div className="font-bold text-emerald-400 text-xl">
                                    ₩ {deposits.find(d => d.id === selectedId)?.amount.toLocaleString()}
                                </div>
                                <div className="text-sm text-white">
                                    입금자: {deposits.find(d => d.id === selectedId)?.bankOwner}
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs text-zinc-400">Admin Memo</label>
                                <Textarea placeholder="확인 메모 입력" className="bg-black/50 border-white/10" rows={3} />
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <Button variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10">
                                    <X className="w-4 h-4 mr-1" /> 반려
                                </Button>
                                <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => handleConfirm(selectedId)}
                                >
                                    <Check className="w-4 h-4 mr-1" /> 승인
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-zinc-500 py-10 text-sm">
                            목록에서 항목을<br/>선택해주세요.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

function DepositItem({ item, onSelect, isSelected }: { item: any, onSelect: any, isSelected: boolean }) {
    return (
        <div 
            className={cn(
                "flex items-center justify-between p-4 rounded-[10px] cursor-pointer transition-colors",
                isSelected ? "bg-white/5" : "hover:bg-white/[0.02]"
            )}
            onClick={() => onSelect(item.id)}
        >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-zinc-900 flex items-center justify-center border border-white/5 text-xs font-bold text-zinc-500">
                    CC
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-white">₩ {item.amount.toLocaleString()}</span>
                        {item.isNew && <Badge className="bg-[#D2FD9C] text-black hover:bg-[#D2FD9C]">NEW</Badge>}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                        User #{item.userId} • {item.bankOwner} • {item.requestedAt}
                    </div>
                </div>
            </div>
            <StatusBadge status={item.status} />
        </div>
    )
}

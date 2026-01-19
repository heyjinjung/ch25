import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { ShineBorder } from "../../components/ui/ShineBorder";
import { Check, X, Bell } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useAdminDeposits, useAdminConfirmDeposit } from "../../../hooks/useAdminEconomy";
import type { AdminDepositDto } from "../../../api/adminApi";

// Sub-component for rendering a list item
function DepositItem({ item, onSelect, isSelected }: { item: AdminDepositDto, onSelect: (id: number) => void, isSelected: boolean }) {
    return (
        <div 
            onClick={() => onSelect(item.id)}
            className={cn(
                "p-4 rounded-xl cursor-pointer transition-all hover:bg-white/5 flex justify-between items-center group",
                isSelected ? "bg-white/10 border-l-2 border-[#D2FD9C]" : ""
            )}
        >
            <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-[#D2FD9C]/20 group-hover:text-[#D2FD9C]">
                    ₩
                 </div>
                 <div>
                     <div className="text-white font-medium">₩ {item.amount.toLocaleString()}</div>
                     <div className="text-xs text-zinc-500">ID: {item.userId} | {item.bankOwner}</div>
                 </div>
            </div>
            <div className="text-right">
                <StatusBadge status={item.status} />
                <div className="text-xs text-zinc-600 mt-1">{item.requestedAt}</div>
            </div>
        </div>
    )
}

export default function CCDepositPage() {
  const { data: deposits = [], refetch } = useAdminDeposits();
  const confirmMutation = useAdminConfirmDeposit();
  
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selectedDeposit = deposits.find((d: AdminDepositDto) => d.id === selectedId);

  const handleConfirm = async (id: number) => {
    await confirmMutation.mutateAsync(id);
    setSelectedId(null);
  };

  return (
    <div className="space-y-6 h-full p-6 text-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">CC 입금 관리 (Deposit Ops)</h1>
          <p className="text-sm text-zinc-400">외부 CC 입금 내역을 수동으로 확인하고 승인합니다.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => refetch()}>
            <Bell className="w-4 h-4" />
            새로고침
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* List Section */}
        <div className="lg:col-span-3 space-y-4">
             {deposits.length === 0 && (
                <div className="text-center py-20 text-zinc-500 border border-dashed border-white/10 rounded-xl">
                    대기 중인 입금 요청이 없습니다.
                </div>
             )}
             {deposits.map((item: AdminDepositDto) => (
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
                    {selectedId && selectedDeposit ? (
                        <>
                            <div className="p-3 rounded-lg bg-zinc-900 border border-white/5 space-y-2">
                                <div className="text-xs text-zinc-500">Selected ID: #{selectedId}</div>
                                <div className="font-bold text-emerald-400 text-xl">
                                    ₩ {selectedDeposit.amount.toLocaleString()}
                                </div>
                                <div className="text-sm text-white">
                                    입금자: {selectedDeposit.bankOwner}
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
                                    disabled={confirmMutation.isPending || selectedDeposit.status !== 'PENDING'}
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

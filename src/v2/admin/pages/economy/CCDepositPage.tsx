import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { ShineBorder } from "../../components/ui/ShineBorder";
import { Check, X, Bell } from "lucide-react";
import { useAdminDeposits, useAdminConfirmDeposit } from "../../../hooks/useV2Admin"; // Updated Hook Path
import type { AdminDepositDto } from "../../../api/adminApi";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../../components/ui/table"; // Corrected Import Path for V2

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
    <div className="space-y-6 h-full p-6 text-white min-h-screen">
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
        {/* Table Section */}
        <div className="lg:col-span-3">
             <div className="rounded-xl border border-white/5 bg-[#18181B] overflow-hidden">
             {deposits.length === 0 ? (
                <div className="text-center py-20 text-zinc-500">
                    대기 중인 입금 요청이 없습니다.
                </div>
             ) : (
               <Table>
                 <TableHeader className="bg-white/5">
                   <TableRow className="border-white/5 hover:bg-transparent">
                     <TableHead className="text-zinc-400 w-[80px]">ID</TableHead>
                     <TableHead className="text-zinc-400">Amount</TableHead>
                     <TableHead className="text-zinc-400">Bank Owner</TableHead>
                     <TableHead className="text-zinc-400">Status</TableHead>
                     <TableHead className="text-zinc-400 text-right">Requested At</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {deposits.map((item: AdminDepositDto) => (
                     <TableRow 
                        key={item.id} 
                        className={`border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${selectedId === item.id ? "bg-white/10" : ""}`}
                        onClick={() => setSelectedId(item.id)}
                     >
                       <TableCell className="font-mono text-zinc-500 py-4">#{item.id}</TableCell>
                       <TableCell className="font-bold text-lg text-white py-4">
                            {item.isNew ? (
                                <ShineBorder className="inline-block px-2 py-0.5 rounded text-sm bg-zinc-800" color={["#D2FD9C", "#FFD700"]}>
                                    ₩ {item.amount.toLocaleString()}
                                </ShineBorder>
                            ) : (
                                <span>₩ {item.amount.toLocaleString()}</span>
                            )}
                       </TableCell>
                       <TableCell className="text-zinc-300 py-4">
                            <div className="flex flex-col">
                                <span>{item.bankOwner}</span>
                                <span className="text-xs text-zinc-500">User ID: {item.userId}</span>
                            </div>
                       </TableCell>
                       <TableCell className="py-4"><StatusBadge status={item.status} /></TableCell>
                       <TableCell className="text-right text-zinc-500 font-mono py-4 text-xs">{item.requestedAt}</TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             )}
             </div>
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
                                <Textarea placeholder="확인 메모 입력" className="bg-black/50 border-white/10 text-white" rows={3} />
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <Button variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400">
                                    <X className="w-4 h-4 mr-1" /> 반려
                                </Button>
                                <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => handleConfirm(selectedId)}
                                    // disabled={confirmMutation.isPending || selectedDeposit.status !== 'PENDING'}
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


import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "../../../components/ui/dialog";
import { SlideToApprove } from "../../components/ui/SlideToApprove";
import { ShieldAlert, Key } from "lucide-react";
import { useAdminWithdrawals, useAdminApproveWithdrawal, useAdminRejectWithdrawal } from "../../../hooks/useAdminEconomy";
import { cn } from "../../../lib/utils";
import type { AdminWithdrawalDto } from "../../../api/adminApi";

export default function VaultControlPage() {
  const { data: withdrawals = [] } = useAdminWithdrawals();
  const approveMutation = useAdminApproveWithdrawal();
  const rejectMutation = useAdminRejectWithdrawal();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async (id: number) => {
    await approveMutation.mutateAsync(id);
  };

  const handleRejectClick = (id: number) => {
    setRejectId(id);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (rejectId) {
        await rejectMutation.mutateAsync({ id: rejectId, reason: rejectReason });
        setRejectId(null);
    }
  };

  const pendingWithdrawals = withdrawals.filter((w: AdminWithdrawalDto) => w.status === 'PENDING');

  return (
    <div className="space-y-6 h-full p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">금고 제어 (Vault Control)</h1>
          <p className="text-sm text-zinc-400">출금 요청 승인 및 강제 잔액 조정 작업을 수행합니다.</p>
        </div>
        
        {/* Force Edit Trigger */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    강제 잔액 조정 (Force Edit)
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#18181B] border-white/10 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-red-400 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5" /> 강제 잔액 조정 경고
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        이 작업은 유저의 실제 자산을 강제로 변경하며, 모든 내역이 <strong>Audit Log</strong>에 영구히 기록됩니다. 오입금 처리 등 비상 상황에서만 사용하십시오.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-right text-sm text-zinc-400">User ID</span>
                        <Input id="userId" className="col-span-3 bg-black/50 border-white/10 text-white" placeholder="1001" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                         <span className="text-right text-sm text-zinc-400">Amount</span>
                        <Input id="amount" className="col-span-3 bg-black/50 border-white/10 text-white" placeholder="Amount (KRW)" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                         <span className="text-right text-sm text-zinc-400">Reason</span>
                        <Input id="reason" className="col-span-3 bg-black/50 border-white/10 text-white" placeholder="사유 입력 (필수)" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>취소</Button>
                    <Button className="bg-red-600 hover:bg-red-700 text-white">강제 실행</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="withdrawals" className="space-y-4">
        <TabsList className="bg-[#18181B] border border-white/5">
          <TabsTrigger value="withdrawals">출금 승인 ({pendingWithdrawals.length})</TabsTrigger>
          <TabsTrigger value="history">승인 이력</TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawals" className="space-y-4">
            <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingWithdrawals.length === 0 && (
                        <div className="col-span-full h-40 flex items-center justify-center text-zinc-500 border border-dashed border-white/10 rounded-xl">
                            대기 중인 출금 요청이 없습니다.
                        </div>
                    )}
                    {pendingWithdrawals.map((item: AdminWithdrawalDto) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Card className="bg-[#18181B] border-white/5 overflow-hidden">
                                <CardHeader className="bg-zinc-900/50 border-b border-white/5 pb-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-sm font-medium text-zinc-400">Request #{item.id}</div>
                                            <div className="text-lg font-bold text-white mt-1">₩ {item.amount.toLocaleString()}</div>
                                        </div>
                                        <Badge variant="outline" className={cn(
                                            "bg-black/40",
                                            item.riskLevel === 'HIGH' ? "text-red-400 border-red-500/30" : "text-emerald-400 border-emerald-500/30"
                                        )}>
                                            {item.riskLevel} RISK
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-500">User</span>
                                        <span className="text-zinc-300">{item.nickname} (ID: {item.userId})</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-500">Requested</span>
                                        <span className="text-zinc-300">{item.requestTime}</span>
                                    </div>
                                    
                                    <div className="pt-2 flex flex-col gap-2">
                                        {item.riskLevel === 'HIGH' ? (
                                             <Button variant="outline" className="w-full border-red-500/30 text-red-400 cursor-not-allowed opacity-80" disabled>
                                                <Key className="w-4 h-4 mr-2" />
                                                Locked (Audit Required)
                                             </Button>
                                        ) : (
                                            <SlideToApprove 
                                                onApprove={() => handleApprove(item.id)}
                                            />
                                        )}
                                        <Button 
                                            variant="ghost" 
                                            className="w-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                                            onClick={() => handleRejectClick(item.id)}
                                        >
                                            반려 (Reject)
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </AnimatePresence>
        </TabsContent>
        
        <TabsContent value="history">
             <div className="h-40 flex items-center justify-center text-zinc-500 border border-dashed border-white/10 rounded-xl">
                승인 이력 조회 기능 준비 중...
            </div>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white">
            <DialogHeader>
                <DialogTitle>출금 반려</DialogTitle>
                <DialogDescription className="text-zinc-400">
                    반려 사유를 입력하면 유저에게 알림이 발송됩니다.
                </DialogDescription>
            </DialogHeader>
            <Input 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="예: 부정 플레이 의심, 계좌 정보 불일치 등"
                className="bg-black/50 border-white/10 text-white"
            />
            <DialogFooter>
                <Button variant="ghost" onClick={() => setRejectId(null)}>취소</Button>
                <Button variant="destructive" onClick={confirmReject} disabled={!rejectReason}>반려 확정</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

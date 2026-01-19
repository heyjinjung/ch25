import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "../../../components/ui/dialog";
import { SlideToApprove } from "../../components/ui/SlideToApprove";
import { ShieldAlert, History } from "lucide-react";

// Mock Data
const PENDING_WITHDRAWALS = [
  { id: 101, userId: 1001, nickname: "HighRoller99", amount: 150000, requestTime: "10:30 AM", riskLevel: "LOW" },
  { id: 102, userId: 1005, nickname: "Tester01", amount: 50000, requestTime: "10:45 AM", riskLevel: "LOW" },
  { id: 103, userId: 1042, nickname: "UnknownUser", amount: 5000000, requestTime: "11:00 AM", riskLevel: "HIGH" },
];

export default function VaultControlPage() {
  const [withdrawals, setWithdrawals] = useState(PENDING_WITHDRAWALS);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleApprove = async (id: number) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setWithdrawals(prev => prev.filter(w => w.id !== id));
  };

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
          <TabsTrigger value="withdrawals">출금 승인 ({withdrawals.length})</TabsTrigger>
          <TabsTrigger value="history">승인 이력</TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawals" className="space-y-4">
            <AnimatePresence mode="popLayout">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {withdrawals.length === 0 && (
                        <div className="col-span-full h-40 flex items-center justify-center text-zinc-500 border border-dashed border-white/10 rounded-xl">
                            대기 중인 출금 요청이 없습니다.
                        </div>
                    )}
                    {withdrawals.map((item) => (
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
                                            <CardTitle className="text-base text-white flex items-center gap-2">
                                                {item.nickname}
                                                {item.riskLevel === 'HIGH' && <Badge variant="destructive" className="h-5 px-1 text-[10px]">RISK</Badge>}
                                            </CardTitle>
                                            <CardDescription className="text-xs">U#{item.userId} • {item.requestTime}</CardDescription>
                                        </div>
                                        <div className="text-right">
                                             <div className="text-lg font-bold text-emerald-400">₩ {item.amount.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="flex justify-between text-xs text-zinc-500">
                                        <span>Bank: KB Kookmin</span>
                                        <span>123-***-****89</span>
                                    </div>
                                    
                                    <SlideToApprove 
                                        onApprove={() => handleApprove(item.id)}
                                        text="밀어서 출금 승인"
                                        successText="승인 완료"
                                        className="h-12 text-sm"
                                        disabled={item.riskLevel === 'HIGH'} 
                                    />
                                    {item.riskLevel === 'HIGH' && (
                                        <p className="text-[10px] text-red-500 text-center">
                                            ⚠️ 리스크 유저는 자동 승인이 불가능합니다. 상세 확인 필요.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </AnimatePresence>
        </TabsContent>

        <TabsContent value="history">
            <Card className="bg-[#18181B] border-white/5">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2"><History className="w-5 h-5"/> 최근 처리 내역</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-zinc-500 text-sm">
                        최근 30일간의 입출금 처리 내역이 이곳에 표시됩니다. (Pending Implementation)
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

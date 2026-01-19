import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../../components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { NumberTicker } from "../../components/ui/NumberTicker";
import { Shield, AlertTriangle, Ticket, Edit, CheckCircle2 } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { WalletEditor } from "../../components/users/WalletEditor";
import { useAdminUserDetail } from "../../../hooks/useV2Admin";

interface UserDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
}

export function UserDetailDrawer({ isOpen, onClose, userId }: UserDetailDrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isWalletEditorOpen, setIsWalletEditorOpen] = useState(false);
  const { data: user, isLoading } = useAdminUserDetail(userId);

  // GSAP Animation for Tab Content
  useEffect(() => {
    if (isOpen && contentRef.current && user) {
      gsap.fromTo(contentRef.current, 
        { opacity: 0, y: 10 }, 
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [isOpen, user]);

  if (!userId) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[90%] sm:w-[600px] bg-[#121214] border-l border-white/10 p-0 text-white">
        {isLoading || !user ? (
             <div className="h-full flex items-center justify-center text-zinc-500">
                 Loading User Details...
             </div>
        ) : (
            <>
            <SheetHeader className="px-6 py-4 border-b border-white/5 bg-[#18181B]">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-lg border border-indigo-500/30">
                    {userId % 9}
                </div>
                <div>
                    <SheetTitle className="text-white text-lg font-bold flex items-center gap-2">
                    {user.nickname} (#{userId})
                    {user.vip_level === "VIP" ? (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] h-5">VIP</Badge> 
                    ) : (
                        <Badge variant="secondary" className="bg-zinc-500/10 text-zinc-500 border-zinc-500/20 text-[10px] h-5">COMMON</Badge>
                    )}
                    </SheetTitle>
                    <SheetDescription className="text-zinc-400 text-xs">
                    Joined {new Date(user.created_at).toLocaleDateString()} • Lv.{user.level || 1}
                    </SheetDescription>
                </div>
                </div>
                <div className="flex gap-2">
                    {user.is_active ? (
                         <Button variant="destructive" size="sm" className="h-8 bg-red-900/40 text-red-500 hover:bg-red-900/60 border border-red-900/50">
                            <Shield className="w-3 h-3 mr-1" /> Ban
                        </Button>
                    ) : (
                        <Badge className="bg-red-500 text-white">BANNED</Badge>
                    )}
                </div>
            </div>
            </SheetHeader>

            <Tabs defaultValue="overview" className="h-[calc(100vh-80px)]">
            <TabsList className="w-full justify-start rounded-none bg-[#18181B] border-b border-white/5 px-6 h-12 gap-6">
                <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 px-0 pb-3 pt-2 text-zinc-400">
                    개요 (Overview)
                </TabsTrigger>
                <TabsTrigger value="wallet" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 px-0 pb-3 pt-2 text-zinc-400">
                    지갑 (Wallet)
                </TabsTrigger>
                <TabsTrigger value="intervention" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:bg-transparent data-[state=active]:text-red-400 px-0 pb-3 pt-2 text-zinc-400">
                    개입 (Intervention)
                </TabsTrigger>
                <TabsTrigger value="vault" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 px-0 pb-3 pt-2 text-zinc-400">
                    금고 (Vault)
                </TabsTrigger>
                <TabsTrigger value="logs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:text-indigo-400 px-0 pb-3 pt-2 text-zinc-400">
                    로그 (Logs)
                </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-full bg-[#121214]">
                <div className="p-6 space-y-6" ref={contentRef}>
                    
                <TabsContent value="overview" className="m-0 space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-[#18181B] border-white/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">총 입금 (Total Deposit)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white flex items-baseline gap-1">
                                    ₩ <NumberTicker value={user.total_deposit} />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-[#18181B] border-white/5">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">현재 자산 (Assets)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-emerald-400 flex items-baseline gap-1">
                                    ₩ <NumberTicker value={user.current_assets} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Risk Section */}
                    {user.risk_level === "HIGH" ? (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-red-400 mb-1">Risk Warning ({user.risk_level})</h4>
                                <p className="text-xs text-red-400/80">
                                    {user.risk_reason || "Unusual activity detected."}
                                </p>
                            </div>
                        </div>
                    ) : user.risk_level === "MEDIUM" ? (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-amber-400 mb-1">Moderate Risk</h4>
                                <p className="text-xs text-amber-400/80">Monitor closely.</p>
                            </div>
                        </div>
                    ) : (
                         <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-bold text-emerald-400 mb-1">Good Standing</h4>
                                <p className="text-xs text-emerald-400/80">No risk factors detected.</p>
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="wallet" className="m-0 space-y-4">
                    <div className="flex justify-between items-center bg-[#18181B] p-4 rounded-xl border border-white/5">
                        <div>
                            <div className="text-sm text-zinc-500">현재 티켓 보유량</div>
                            <div className="text-2xl font-mono text-white font-bold flex items-center gap-2">
                                <Ticket className="w-6 h-6 text-indigo-400" />
                                {user.ticket_balance.toLocaleString()} T
                            </div>
                        </div>
                        <Button variant="outline" className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10" onClick={() => setIsWalletEditorOpen(true)}>
                            <Edit className="w-4 h-4 mr-2" />
                            수량 조정
                        </Button>
                    </div>

                    <div className="p-4 rounded-xl bg-[#18181B] border border-white/5 text-center text-zinc-500 py-10">
                        <div>[Ticket Log Table Placeholder]</div>
                        <div className="text-xs mt-2">최근 30일간의 티켓 획득/사용 내역이 표시됩니다.</div>
                    </div>
                </TabsContent>

                <TabsContent value="intervention" className="m-0 space-y-6">
                    <div className="p-6 rounded-xl border border-red-500/10 bg-red-500/5 space-y-4">
                        <div className="flex items-center gap-3">
                            <Shield className="w-6 h-6 text-red-500" />
                            <h3 className="text-lg font-bold text-white">운영 개입 플레이북 (Operational Playbook)</h3>
                        </div>
                        <p className="text-sm text-zinc-400">
                            시스템이 유저의 최근 행동 패턴을 분석하여 제안하는 대응 방안입니다. 
                            우선순위에 따라 신중하게 실행하십시오.
                        </p>
                    </div>

                    {user.playbook ? (
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">추천 액션 (Suggested Actions)</h4>
                            <div className="grid gap-3">
                                {user.playbook.suggestedActions.map(action => (
                                    <Card key={action.actionId} className="bg-[#18181B] border-white/5 hover:border-indigo-500/30 transition-colors">
                                        <CardHeader className="p-4 pb-2">
                                            <div className="flex justify-between items-start">
                                                <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-400">{action.type}</Badge>
                                                <Button size="sm" className="h-7 text-xs bg-indigo-500 text-white hover:bg-indigo-600">실행 (Run)</Button>
                                            </div>
                                            <CardTitle className="text-base font-bold mt-2">{action.label}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="px-4 pb-4 pt-0">
                                            <p className="text-sm text-zinc-500">{action.description}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                            <div>
                                <h4 className="text-white font-medium">추천 개입 없음</h4>
                                <p className="text-sm text-zinc-500 mt-1">유저가 안정적인 상태이거나 특별한 위기 징후가 없습니다.</p>
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="vault" className="m-0">
                    <div className="p-4 rounded-xl bg-[#18181B] border border-white/5 text-center text-zinc-500 py-10">
                        <div className="text-lg font-bold text-white mb-2">Vault Balance</div>
                        <div className="text-2xl text-emerald-400">₩ {user.vault_balance.toLocaleString()}</div>
                    </div>
                </TabsContent>

                <TabsContent value="logs" className="m-0">
                    <div className="p-4 rounded-xl bg-[#18181B] border border-white/5 text-center text-zinc-500 py-10">
                        Game/System Logs Component Here
                    </div>
                </TabsContent>

                </div>
            </ScrollArea>
            </>
        )}
        
        {/* Wallet Editor connects to this user */}
        {user && (
            <WalletEditor 
                isOpen={isWalletEditorOpen} 
                onClose={() => setIsWalletEditorOpen(false)} 
                userId={user.id} 
                currentTickets={user.ticket_balance} 
                onUpdate={async (amt, reason) => {
                    console.log("Update wallet:", amt, reason);
                    // This could be wired up to a mutation later
                    await new Promise(r => setTimeout(r, 1000));
                }} 
            />
        )}
      </SheetContent>
    </Sheet>
  );
}

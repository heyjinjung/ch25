
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../../components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { NumberTicker } from "../../components/ui/NumberTicker";
import { Shield, AlertTriangle, Ticket, Edit } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import gsap from "gsap";
import { WalletEditor } from "../../components/users/WalletEditor";

interface UserDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
}

export function UserDetailDrawer({ isOpen, onClose, userId }: UserDetailDrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isWalletEditorOpen, setIsWalletEditorOpen] = useState(false);

  // GSAP Animation for Tab Content
  useEffect(() => {
    if (isOpen && contentRef.current) {
      gsap.fromTo(contentRef.current, 
        { opacity: 0, y: 10 }, 
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [isOpen]);

  if (!userId) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[90%] sm:w-[600px] bg-[#121214] border-l border-white/10 p-0 text-white">
        <SheetHeader className="px-6 py-4 border-b border-white/5 bg-[#18181B]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-lg border border-indigo-500/30">
                {userId % 9}
              </div>
              <div>
                <SheetTitle className="text-white text-lg font-bold flex items-center gap-2">
                  User #{userId}
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] h-5">VVIP</Badge>
                </SheetTitle>
                <SheetDescription className="text-zinc-400 text-xs">
                  Joined 2024-12-25 • @HighRoller99
                </SheetDescription>
              </div>
            </div>
            <div className="flex gap-2">
                <Button variant="destructive" size="sm" className="h-8 bg-red-900/40 text-red-500 hover:bg-red-900/60 border border-red-900/50">
                    <Shield className="w-3 h-3 mr-1" /> Ban
                </Button>
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
                                ₩ <NumberTicker value={15300000} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-[#18181B] border-white/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-400">현재 자산 (Assets)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-400 flex items-baseline gap-1">
                                ₩ <NumberTicker value={4250000} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Risk Section */}
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-red-400 mb-1">Risk Warning</h4>
                        <p className="text-xs text-red-400/80">
                            Recent betting pattern suggests high-risk behavior. <br/>
                            Last 3 logins were from different IPs.
                        </p>
                    </div>
                </div>
              </TabsContent>

              <TabsContent value="wallet" className="m-0 space-y-4">
                <div className="flex justify-between items-center bg-[#18181B] p-4 rounded-xl border border-white/5">
                    <div>
                        <div className="text-sm text-zinc-500">현재 티켓 보유량</div>
                        <div className="text-2xl font-mono text-white font-bold flex items-center gap-2">
                            <Ticket className="w-6 h-6 text-indigo-400" />
                            1,250 T
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

              <TabsContent value="vault" className="m-0">
                  <div className="p-4 rounded-xl bg-[#18181B] border border-white/5 text-center text-zinc-500 py-10">
                    Vault Ledger Component Here
                </div>
              </TabsContent>

              <TabsContent value="logs" className="m-0">
                   <div className="p-4 rounded-xl bg-[#18181B] border border-white/5 text-center text-zinc-500 py-10">
                    Game/System Logs Component Here
                </div>
              </TabsContent>

            </div>
          </ScrollArea>
        </Tabs>
        
        {userId && (
            <WalletEditor 
                isOpen={isWalletEditorOpen} 
                onClose={() => setIsWalletEditorOpen(false)} 
                userId={userId} 
                currentTickets={1250} 
                onUpdate={async (amt, reason) => {
                    console.log("Update wallet:", amt, reason);
                    await new Promise(r => setTimeout(r, 1000));
                }} 
            />
        )}
      </SheetContent>
    </Sheet>
  );
}

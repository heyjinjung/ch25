
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { AlertTriangle, Coins } from "lucide-react";

interface WalletEditorProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  currentTickets: number;
  onUpdate: (newAmount: number, reason: string) => Promise<void>;
}

export function WalletEditor({ isOpen, onClose, userId, currentTickets, onUpdate }: WalletEditorProps) {
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !reason) return;
    
    setIsLoading(true);
    try {
        await onUpdate(parseInt(amount), reason);
        onClose();
        setAmount("");
        setReason("");
    } catch (e) {
        console.error("Failed to update wallet", e);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#18181B] border-white/10 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-400">
            <Coins className="w-5 h-5" />
            티켓 강제 수정 (Manual Edit)
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            User #{userId}의 티켓 수량을 강제로 변경합니다. <br/>
            <span className="text-red-400 text-xs">주의: 이 작업은 로그에 영구적으로 기록됩니다.</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="bg-black/30 p-3 rounded-lg border border-white/5 flex justify-between items-center">
            <span className="text-sm text-zinc-500">현재 보유량</span>
            <span className="text-lg font-mono font-bold text-white">{currentTickets.toLocaleString()} 개</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">변경할 수량 (최종값)</Label>
            <Input 
                id="amount" 
                type="number" 
                placeholder="예: 50" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-black/50 border-white/10 text-white font-mono"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reason">변경 사유 (필수)</Label>
            <Textarea 
                id="reason" 
                placeholder="예: 보상 미지급 건 처리" 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-black/50 border-white/10 text-white min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>취소</Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSubmit} disabled={!amount || !reason || isLoading}>
            {isLoading ? "처리 중..." : "수정 실행"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

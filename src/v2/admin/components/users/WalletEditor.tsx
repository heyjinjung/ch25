import { useState, useEffect } from "react";
import { getRewardItemsByCategories } from "../../../constants/rewardItems";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Coins } from "lucide-react";

interface WalletEditorProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  currentTickets: number; // Optional reference
  currentVaultBalance: number; // [NEW]
  initialTokenType?: string;
  onUpdate: (
    newAmount: number,
    reason: string,
    tokenType: string,
  ) => Promise<void>;
}

export function WalletEditor({
  isOpen,
  onClose,
  userId,
  currentTickets,
  currentVaultBalance,
  initialTokenType,
  onUpdate,
}: WalletEditorProps) {
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>(
    initialTokenType || "ROULETTE_COIN",
  );
  const [isLoading, setIsLoading] = useState(false);

  const walletTypes = getRewardItemsByCategories([
    "GAME_TICKET",
    "CURRENCY",
    "VAULT",
  ]);

  // Reset or update selected type when modal opens or prop changes
  useEffect(() => {
    if (isOpen && initialTokenType) {
      setSelectedType(initialTokenType);
    }
  }, [isOpen, initialTokenType]);

  const handleSubmit = async () => {
    if (!amount || !reason) return;

    setIsLoading(true);
    try {
      // Pass the selected type and amount directly (Delta)
      await onUpdate(parseInt(amount), reason, selectedType);
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
            자산/재화 강제 수정
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            User #{userId}의 자산을 강제로 변경합니다. <br />
            <span className="text-red-400 text-xs">
              주의: 이 작업은 로그에 영구적으로 기록됩니다.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>대상 재화 (Asset Type)</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-black/60 border-white/10 text-zinc-100">
                <SelectValue placeholder="재화 선택" />
              </SelectTrigger>
              <SelectContent className="bg-[#18181B] border-white/10 text-white">
                {walletTypes.map((item) => {
                  const balance =
                    item.value === "VAULT"
                      ? `${(currentVaultBalance || 0).toLocaleString()} P`
                      : `${(currentTickets || 0).toLocaleString()} T`;
                  return (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                      className="text-zinc-100 focus:bg-zinc-800"
                    >
                      {item.label} (현재: {balance})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedType === "VAULT" ? (
            <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 flex justify-between items-center">
              <span className="text-xs text-emerald-300">
                금고잔액 (참고)
              </span>
              <span className="text-sm font-mono font-bold text-emerald-100">
                ₩ {(currentVaultBalance || 0).toLocaleString()}
              </span>
            </div>
          ) : (
            (selectedType === "ROULETTE_COIN" ||
              selectedType === "ROULETTE_TICKET" ||
              selectedType === "DICE_TICKET" ||
              selectedType === "LOTTERY_TICKET") && (
              <div className="bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20 flex justify-between items-center">
                <span className="text-xs text-indigo-300">
                  현재 보유량 (참고)
                </span>
                <span className="text-sm font-mono font-bold text-indigo-100">
                  {(currentTickets || 0).toLocaleString()} T
                </span>
              </div>
            )
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">변동 수량 (+ 지급, - 차감)</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="예: 50 또는 -50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-black/50 border-white/10 text-white font-mono h-11"
              />
              {amount && !isNaN(parseInt(amount)) && (
                <div className="mt-2 p-2 rounded bg-indigo-500/10 border border-indigo-500/20">
                  <p className="text-[11px] text-indigo-300 flex justify-between">
                    <span>수정 후 예상 잔액:</span>
                    <span className="font-bold font-mono">
                      {selectedType === "VAULT" ? "₩ " : ""}
                      {(
                        (selectedType === "VAULT"
                          ? currentVaultBalance
                          : currentTickets) + parseInt(amount)
                      ).toLocaleString()}
                      {selectedType === "VAULT" ? " P" : " T"}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <p className="text-[10px] text-zinc-500">
              * 양수 입력 시 지급, 음수 입력 시 차감됩니다.
            </p>
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
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            취소
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-6"
            onClick={handleSubmit}
            disabled={!amount || !reason || isLoading}
          >
            {isLoading ? "처리 중..." : "수정 실행 (Force Modification)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

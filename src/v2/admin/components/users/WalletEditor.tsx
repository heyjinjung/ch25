import { useEffect, useMemo, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { type RewardCategory } from "../../../constants/rewardItems";

interface WalletEditorProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  currentTickets: number;
  currentVaultBalance: number;
  initialTokenType?: string;
  allowedCategories?: RewardCategory[];
  onUpdate: (
    newAmount: number,
    reason: string,
    tokenType: string,
  ) => Promise<void>;
}

export default function WalletEditor({
  isOpen,
  onClose,
  userId,
  currentTickets,
  currentVaultBalance,
  initialTokenType,
  allowedCategories,
  onUpdate,
}: WalletEditorProps) {
  const [selectedType, setSelectedType] = useState<string>("ROULETTE_TICKET");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const walletTypes = useMemo(() => {
    const all = [
      { label: "포인트 (Vault)", value: "VAULT", category: "VAULT" as const },
      {
        label: "일반 룰렛 티켓",
        value: "ROULETTE_TICKET",
        category: "GAME_TICKET" as const,
      },
      {
        label: "다이아 티켓",
        value: "DIAMOND_TICKET",
        category: "GAME_TICKET" as const,
      },
      {
        label: "황금 티켓",
        value: "GOLDEN_TICKET",
        category: "GAME_TICKET" as const,
      },
      {
        label: "복권 티켓",
        value: "LOTTERY_TICKET",
        category: "GAME_TICKET" as const,
      },
      {
        label: "주사위 티켓",
        value: "DICE_TICKET",
        category: "GAME_TICKET" as const,
      },
    ];

    if (!allowedCategories || allowedCategories.length === 0) return all;
    return all.filter((item) => allowedCategories.includes(item.category));
  }, [allowedCategories]);

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage("");
      return;
    }

    setAmount("");
    setReason("");
    setErrorMessage("");

    const allowedTypes = new Set(walletTypes.map((item) => item.value));
    const nextType =
      initialTokenType && allowedTypes.has(initialTokenType)
        ? initialTokenType
        : walletTypes[0]?.value || "ROULETTE_TICKET";

    setSelectedType(nextType);
  }, [isOpen, initialTokenType, walletTypes]);

  const handleSubmit = async () => {
    if (!amount || !reason) return;

    const delta = parseInt(amount, 10);
    if (isNaN(delta) || delta === 0) {
      setErrorMessage("유효한 수량을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      await onUpdate(delta, reason, selectedType);
      onClose();
      setAmount("");
      setReason("");
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.message || "업데이트 실패";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>사용자 지갑 관리 (Wallet Admin)</DialogTitle>
          <DialogDescription className="text-zinc-400">
            User #{userId} 자산을 강제로 변경합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {errorMessage}
            </div>
          )}

          <div className="space-y-2">
            <Label>재화 종류</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-black/50 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                {walletTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-2 text-right text-xs text-zinc-500">
              현재 보유량 (참고):{" "}
              <span className="font-mono font-bold text-white">
                {selectedType === "VAULT"
                  ? `${currentVaultBalance.toLocaleString()} P`
                  : `${(currentTickets || 0).toLocaleString()} T`}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">변경 수량 (+ 지급, - 차감)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Ex. 100 or -50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-black/50 border-white/10 font-mono"
            />
            <p className="text-[10px] text-zinc-500">
              * 양수 입력 시 지급, 음수 입력 시 차감됩니다.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">변경 사유 (필수)</Label>
            <Textarea
              id="reason"
              placeholder="Ex. 이벤트 보상 미지급 건 처리"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-black/50 border-white/10 min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="hover:bg-white/5"
          >
            취소
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={handleSubmit}
            disabled={!amount || !reason || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            수정 실행
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

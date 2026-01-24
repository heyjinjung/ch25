import { useState, useEffect } from "react";
import {
  getRewardItemsByCategories,
  type RewardCategory,
} from "../../../constants/rewardItems";
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
  allowedCategories?: RewardCategory[];
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
  allowedCategories,
  onUpdate,
}: WalletEditorProps) {
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>(
    initialTokenType || "ROULETTE_TICKET",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const walletTypes = getRewardItemsByCategories(
    allowedCategories ?? ["GAME_TICKET", "CURRENCY", "VAULT"],
  );

  // Reset or update selected type when modal opens or prop changes
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage("");
      return;
    }
    const allowedTypes = new Set(walletTypes.map((item) => item.value));
    const nextType =
      initialTokenType && allowedTypes.has(initialTokenType)
        ? initialTokenType
        : walletTypes[0]?.value || "ROULETTE_TICKET";
    setSelectedType(nextType);
  }, [isOpen, initialTokenType]);

  const handleSubmit = async () => {
    if (!amount || !reason) return;

    const delta = Number.parseInt(amount, 10);
    if (!Number.isFinite(delta) || delta === 0) return;

    setIsLoading(true);
    setErrorMessage("");
    try {
      // Pass the selected type and amount directly (Delta)
      await onUpdate(delta, reason, selectedType);
      onClose();
      setAmount("");
      setReason("");
    } catch (e) {
      const detail = (e as any)?.response?.data?.detail;
      const nextMessage =
        detail === "INVALID_TOKEN_TYPE"
          ? "ì§€?í•˜ì§€ ?ŠëŠ” ?¬í™” ?€?…ì…?ˆë‹¤."
          : detail === "INVALID_AMOUNT"
            ? "?˜ëŸ‰???¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤."
            : detail === "INSUFFICIENT_TOKEN_BALANCE"
              ? "ë³´ìœ ?‰ì´ ë¶€ì¡±í•©?ˆë‹¤."
              : detail === "INSUFFICIENT_VAULT_BALANCE"
                ? "ê¸ˆê³  ?”ì•¡??ë¶€ì¡±í•©?ˆë‹¤."
                : "?”ì²­???¤íŒ¨?ˆìŠµ?ˆë‹¤. ?…ë ¥ê°’ê³¼ ?”ì•¡???•ì¸?˜ì„¸??";
      setErrorMessage(nextMessage);
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
            ?ì‚°/?¬í™” ê°•ì œ ?˜ì •
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            User #{userId}???ì‚°??ê°•ì œë¡?ë³€ê²½í•©?ˆë‹¤. <br />
            <span className="text-red-400 text-xs">
              ì£¼ì˜: ???‘ì—…?€ ë¡œê·¸???êµ¬?ìœ¼ë¡?ê¸°ë¡?©ë‹ˆ??
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {errorMessage && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {errorMessage}
            </div>
          )}
          <div className="space-y-2">
            <Label>?€???¬í™” (Asset Type)</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-black/60 border-white/10 text-zinc-100">
                <SelectValue placeholder="?¬í™” ? íƒ" />
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
                      {item.label} (?„ì¬: {balance})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedType === "VAULT" ? (
            <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 flex justify-between items-center">
              <span className="text-xs text-emerald-300">ê¸ˆê³ ?”ì•¡ (ì°¸ê³ )</span>
              <span className="text-sm font-mono font-bold text-emerald-100">
                ??{(currentVaultBalance || 0).toLocaleString()}
              </span>
            </div>
          ) : (
            (selectedType === "ROULETTE_COIN" ||
              selectedType === "ROULETTE_TICKET" ||
              selectedType === "DICE_TICKET" ||
              selectedType === "LOTTERY_TICKET") && (
              <div className="bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20 flex justify-between items-center">
                <span className="text-xs text-indigo-300">
                  ?„ì¬ ë³´ìœ ??(ì°¸ê³ )
                </span>
                <span className="text-sm font-mono font-bold text-indigo-100">
                  {(currentTickets || 0).toLocaleString()} T
                </span>
              </div>
            )
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">ë³€???˜ëŸ‰ (+ ì§€ê¸? - ì°¨ê°)</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="?? 50 ?ëŠ” -50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-black/50 border-white/10 text-white font-mono h-11"
              />
              {amount && !isNaN(parseInt(amount)) && (
                <div className="mt-2 p-2 rounded bg-indigo-500/10 border border-indigo-500/20">
                  <p className="text-[11px] text-indigo-300 flex justify-between">
                    <span>?˜ì • ???ˆìƒ ?”ì•¡:</span>
                    <span className="font-bold font-mono">
                      {selectedType === "VAULT" ? "??" : ""}
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
              * ?‘ìˆ˜ ?…ë ¥ ??ì§€ê¸? ?Œìˆ˜ ?…ë ¥ ??ì°¨ê°?©ë‹ˆ??
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">ë³€ê²??¬ìœ  (?„ìˆ˜)</Label>
            <Textarea
              id="reason"
              placeholder="?? ë³´ìƒ ë¯¸ì?ê¸?ê±?ì²˜ë¦¬"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-black/50 border-white/10 text-white min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            ì·¨ì†Œ
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-6"
            onClick={handleSubmit}
            disabled={!amount || !reason || isLoading}
          >
            {isLoading ? "ì²˜ë¦¬ ì¤?.." : "?˜ì • ?¤í–‰ (Force Modification)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

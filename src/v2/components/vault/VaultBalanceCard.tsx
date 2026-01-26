import React from "react";
import { NumberTicker } from "../ui/NumberTicker";

interface VaultBalanceCardProps {
  balance: number;
  /** @deprecated availableBalance is deprecated per SoT policy. Always 0. */
  available?: number;
  reserved?: number;
}

export const VaultBalanceCard: React.FC<VaultBalanceCardProps> = ({
  balance,
}) => {
  // SoT: available is deprecated (always 0), use balance (= vault_locked_balance)
  const displayBalance = balance ?? 0;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative overflow-hidden rounded-3xl bg-gradient-to-br from-black/85 to-slate-900/90 p-8 shadow-2xl backdrop-blur-2xl border border-white/10">
      {/* Glow Effect */}
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-orange-500/20 blur-[100px]" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-red-500/10 blur-[100px]" />

      <span className="text-white/60 text-sm font-medium mb-2 tracking-wider">
        나의 금고 잔액
      </span>
      <div className="flex items-baseline gap-2 mb-8">
        <NumberTicker
          value={displayBalance}
          className="text-5xl font-black text-white bg-clip-text"
        />
        <span className="text-2xl font-bold text-white/80">원</span>
      </div>

      <div className="w-full">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
          <span className="text-white/40 text-xs block mb-1">출금 가능</span>
          <span className="text-white font-bold text-lg">
            {displayBalance.toLocaleString()}원
          </span>
        </div>
      </div>
    </div>
  );
};

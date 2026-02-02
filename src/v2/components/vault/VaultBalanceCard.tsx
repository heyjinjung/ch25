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
  const isNegative = displayBalance < 0;

  return (
    <div className={`flex flex-col items-center justify-center h-full w-full relative overflow-hidden rounded-3xl p-8 shadow-2xl backdrop-blur-2xl border ${
      isNegative
        ? 'bg-gradient-to-br from-red-950/85 to-red-900/90 border-red-500/20'
        : 'bg-gradient-to-br from-black/85 to-slate-900/90 border-white/10'
    }`}>
      {/* Glow Effect */}
      <div className={`absolute -top-24 -right-24 h-64 w-64 rounded-full blur-[100px] ${
        isNegative ? 'bg-red-500/30' : 'bg-orange-500/20'
      }`} />
      <div className={`absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-[100px] ${
        isNegative ? 'bg-red-600/20' : 'bg-red-500/10'
      }`} />

      <span className={`text-sm font-medium mb-2 tracking-wider ${
        isNegative ? 'text-red-300/80' : 'text-white/60'
      }`}>
        나의 금고 잔액
      </span>
      <div className="flex items-baseline gap-2 mb-8">
        <NumberTicker
          value={displayBalance}
          className={`text-5xl font-black bg-clip-text ${
            isNegative ? 'text-red-400' : 'text-white'
          }`}
        />
        <span className={`text-2xl font-bold ${
          isNegative ? 'text-red-400/80' : 'text-white/80'
        }`}>원</span>
      </div>

      <div className="w-full">
        <div className={`rounded-2xl p-4 border text-center ${
          isNegative
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-white/5 border-white/5'
        }`}>
          <span className={`text-xs block mb-1 ${
            isNegative ? 'text-red-300/60' : 'text-white/40'
          }`}>출금 가능</span>
          <span className={`font-bold text-lg ${
            isNegative ? 'text-red-400' : 'text-white'
          }`}>
            {displayBalance.toLocaleString()}원
          </span>
        </div>
      </div>
    </div>
  );
};

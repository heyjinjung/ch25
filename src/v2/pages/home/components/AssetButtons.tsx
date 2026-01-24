// src/v2/pages/home/components/AssetButtons.tsx
// 금고/티켓 자산 버튼
import { Wallet, Ticket } from "lucide-react";

export function AssetButtons() {
  return (
    <div className="flex gap-2">
      {/* 금고 버튼 */}
      <button className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-full transition-all hover:scale-[1.02] bg-[#C41E3A] text-[#F5F5DC] shadow-[0_2px_8px_rgba(196,30,58,0.3)]">
        <Wallet className="w-4 h-4" />
        <span className="font-bold">0원</span>
      </button>

      {/* 티켓 버튼 */}
      <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border transition-all hover:bg-zinc-800 bg-[#18181B] border-[rgba(212,175,55,0.3)] text-[#F5F5DC]">
        <Ticket className="w-4 h-4 text-[#22C55E]" />
        <span>1</span>
        <span className="text-zinc-500">▼</span>
      </button>
    </div>
  );
}

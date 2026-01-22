// src/v2/components/layout/V2AppHeader.tsx
import React from "react";
import { useAuth } from "../../../auth/authStore";
import { useQuery } from "@tanstack/react-query";
import { getV2VaultStatus } from "../../api/v1CompatAdapter";

const V2AppHeader: React.FC = () => {
  const { user } = useAuth();

  const { data: vault } = useQuery({
    queryKey: ["v2-vault-status"],
    queryFn: getV2VaultStatus,
    staleTime: 30_000,
    retry: false,
  });

  const vaultBalance = vault?.vaultBalance ?? 0;
  const ticketCount = vault?.ticketCount ?? 0;

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] h-[128px] bg-black/95 backdrop-blur-lg border-b border-white/10 px-6 flex items-center gap-5 w-full max-w-[390px] mx-auto transition-all">
      <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center gap-3">
          <img src="/v2/assets/01home/icon.svg" className="w-[32px] h-[32px] rounded-full object-contain shrink-0" alt="profile" />
          <div className="flex items-center gap-2 min-w-0">
            <img src="/v2/assets/01home/icon.svg" className="w-[14px] h-[14px] shrink-0 opacity-80" alt="nickname icon" />
            <span className="opacity-60 text-[14px] shrink-0 uppercase font-black tracking-tighter">닉네임:</span>
            <span className="font-bold text-[14px] truncate">{user?.nickname || "사용자"}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full">
          <div className="flex items-center gap-2">
            <img src="/assets/asset_coin_gold.png" className="w-[14px] h-[14px] object-contain" alt="coin" />
            <span className="opacity-60 text-[14px] shrink-0 uppercase font-black tracking-tighter">VALUT:</span>
            <span className="font-bold text-[14px] text-[#FFCC00]">{vaultBalance.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="opacity-60 text-[14px] shrink-0 uppercase font-black tracking-tighter">LEVEL:</span>
            <span className="font-bold text-[14px]">{user?.level ?? 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <img src="/assets/asset_ticket_green.png" className="w-[14px] h-[14px] object-contain" alt="ticket" />
            <span className="opacity-60 text-[14px] shrink-0 uppercase font-black tracking-tighter">TICKET:</span>
            <span className="font-bold text-[14px] text-[#25AD82]">{ticketCount}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default V2AppHeader;

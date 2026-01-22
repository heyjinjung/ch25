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
    <header className="fixed top-0 left-0 right-0 z-[100] h-[64px] bg-black/90 backdrop-blur-md border-b border-white/10 px-4 flex items-center gap-3 w-full max-w-[390px] mx-auto">
      <div className="w-[20px] h-[20px] rounded-[12px] bg-zinc-800 shrink-0" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] leading-tight text-white/90 w-full">
        <div className="flex items-center gap-1 min-w-0">
          <span className="opacity-60 text-[10px] shrink-0">닉네임:</span>
          <span className="font-bold truncate">{user?.nickname || "사용자"}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="opacity-60 text-[10px] shrink-0">VALUT:</span>
          <span className="font-bold">{vaultBalance.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="opacity-60 text-[10px] shrink-0">LEVEL:</span>
          <span className="font-bold">{user?.level ?? 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="opacity-60 text-[10px] shrink-0">TICKET:</span>
          <span className="font-bold">{ticketCount}</span>
        </div>
      </div>
    </header>
  );
};

export default V2AppHeader;

import React from "react";
import { useAuth } from "../../../auth/authStore";
import { useQuery } from "@tanstack/react-query";
import { getV2VaultStatus } from "../../api/v1CompatAdapter";
import clsx from "clsx";

const V2AppHeader: React.FC = () => {
  const { user } = useAuth();

  const { data: vault } = useQuery({
    queryKey: ["v2-vault-status"],
    queryFn: getV2VaultStatus,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const vaultBalance = vault?.vaultBalance ?? 0;
  const ticketCount = vault?.ticketCount ?? 0;
  const segment = (user?.segment || vault?.segment || "common").toLowerCase();

  return (
    <header className={clsx(
      "fixed top-0 left-0 right-0 z-[100] h-[100px] border-b px-4 flex flex-col justify-center w-full max-w-[390px] mx-auto transition-all duration-500",
      "bg-black/95 backdrop-blur-xl border-white/5",
      segment === "vip" && "border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]",
      segment === "whale" && "border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
    )}>
      {/* Animation Effects for VIP/Whale */}
      {segment === "vip" && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/5 to-transparent animate-pulse pointer-events-none" />}
      {segment === "whale" && <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.05),transparent)] animate-pulse pointer-events-none" />}

      <div className="flex flex-col gap-2 w-full relative z-10">
        {/* Top Row: Profile & Segment */}
        <div className="flex items-center justify-between w-full h-10">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img 
                src="/v2/assets/01home/icon.svg" 
                className={clsx(
                  "w-9 h-9 rounded-full object-contain border-2 transition-all",
                  segment === "common" ? "border-zinc-700" :
                  segment === "vip" ? "border-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" :
                  "border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]"
                )} 
                alt="profile" 
              />
              {segment !== "common" && (
                <div className={clsx(
                  "absolute -bottom-1 -right-1 px-1 rounded-sm text-[8px] font-black uppercase tracking-tighter",
                  segment === "vip" ? "bg-yellow-500 text-black" : "bg-cyan-400 text-black"
                )}>
                  {segment}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15.15-.42.2-.63.08l-1.42-.81c-.24-.13-.44-.1-.58.07l-3.37 3.37c-.17.14-.2.34-.07.58l.81 1.42c.12.21.07.48-.08.63l-.4.4c-.15.15-.42.2-.63.08l-1.42-.81c-.24-.13-.44-.1-.58.07L4.54 13.5c-.35.35-.35.9 0 1.25s.9.35 1.25 0l3.78-3.78c.17-.18.42-.23.64-.12l1.42.81c.21.12.48.07.63-.08l.4-.4c.15-.15.1-.42-.02-.63l-.81-1.42c-.11-.22-.06-.47.12-.64l3.78-3.78c.35-.35.35-.9 0-1.25s-.9-.35-1.25 0l-3.78 3.78c-.17.18-.42.23-.64.12l-1.42-.81c-.21-.12-.48-.07-.63.08l-.4.4c-.15.15-.1.42.02.63l.81 1.42c.11.22.06.47-.12.64L7.54 16.5c-.35.35-.35.9 0 1.25s.9.35 1.25 0l3.78-3.78c.17-.18.42-.23.64-.12l1.42.81c.21.12.48.07.63-.08l.4-.4c.15-.15.1-.42-.02-.63l-.81-1.42c-.11-.22-.06-.47.12-.64l3.78-3.78c.35-.35.35-.9 0-1.25s-.9-.35-1.25 0l-3.25 3.25z" />
                </svg>
                <span className="text-[14px] font-black text-white/90 tracking-tight">{user?.telegram_username || user?.nickname || "사용자"}</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-bold -mt-1">LEVEL {user?.level ?? 1}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black text-green-500 uppercase">Online</span>
          </div>
        </div>
        
        {/* Bottom Row: Economy */}
        <div className="flex items-center justify-between gap-3 w-full h-10 px-0.5">
          <div className="flex-1 flex items-center justify-between bg-zinc-900/80 rounded-lg h-9 px-3 border border-white/5 shadow-inner">
            <div className="flex items-center gap-2">
              <img src="/assets/asset_coin_gold.png" className="w-[18px] h-[18px] object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" alt="coin" />
              <span className="text-[11px] font-black text-zinc-500 uppercase tracking-tighter">Gold</span>
            </div>
            <span className="text-[14px] font-black text-yellow-400 drop-shadow-sm font-mono tracking-tight">{vaultBalance.toLocaleString()}</span>
          </div>

          <div className="flex-1 flex items-center justify-between bg-zinc-900/80 rounded-lg h-9 px-3 border border-white/5 shadow-inner">
            <div className="flex items-center gap-2">
              <img src="/assets/asset_ticket_green.png" className="w-[18px] h-[18px] object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" alt="ticket" />
              <span className="text-[11px] font-black text-zinc-500 uppercase tracking-tighter">Ticket</span>
            </div>
            <span className="text-[14px] font-black text-[#25AD82] drop-shadow-sm font-mono tracking-tight">{ticketCount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default V2AppHeader;

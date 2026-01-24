import React from "react";
import { useAuth } from "../../../auth/authStore";
import { useQuery } from "@tanstack/react-query";
import { getV2VaultStatus } from "../../api/v1CompatAdapter";
import { Wallet, Ticket, User } from "lucide-react";

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

  const getSegmentColor = (seg: string) => {
    switch (seg) {
      case "whale":
        return "text-purple-400 border-purple-500/30 bg-purple-500/10";
      case "vip":
        return "text-amber-400 border-amber-500/30 bg-amber-500/10";
      default:
        return "text-zinc-400 border-zinc-500/30 bg-zinc-500/10";
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-xl border-b border-white/5 z-50 flex items-center justify-center px-4">
      <div className="w-full max-w-[391px] flex items-center justify-between gap-3">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border border-white/20 shadow-lg">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white leading-none mb-1">
              {user?.nickname || "Guest User"}
            </span>
            <div
              className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border tracking-tighter w-fit ${getSegmentColor(segment)}`}
            >
              {segment}
            </div>
          </div>
        </div>

        {/* Assets Panel */}
        <div className="flex-1 flex items-center justify-between bg-zinc-900/80 rounded-xl h-10 px-3 border border-white/5 shadow-inner gap-4">
          {/* Vault Balance */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-emerald-400 font-mono leading-none">
                ₩{vaultBalance.toLocaleString()}
              </span>
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tighter">
                Vault
              </span>
            </div>
          </div>

          {/* Ticket Balance */}
          <div className="flex items-center gap-2 pr-1">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20">
              <Ticket className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-indigo-400 font-mono leading-none">
                {ticketCount.toLocaleString()}
              </span>
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tighter">
                Tickets
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default V2AppHeader;

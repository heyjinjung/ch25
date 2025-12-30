import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSeasonPassStatus } from "../../hooks/useSeasonPass";
import { getVaultStatus } from "../../api/vaultApi";
import { getLotteryStatus } from "../../api/lotteryApi";
import { getRouletteStatus } from "../../api/rouletteApi";
import { getDiceStatus } from "../../api/diceApi";
import InboxButton from "../common/InboxButton";
import { useAuth } from "../../auth/authStore";
import LogoutButton from "../auth/LogoutButton";

const AppHeader: React.FC = () => {
    const { user } = useAuth();
    const season = useSeasonPassStatus();
    const vault = useQuery({
        queryKey: ["vault-status"],
        queryFn: getVaultStatus,
        staleTime: 30_000,
    });
    const lottery = useQuery({
        queryKey: ["lottery-status"],
        queryFn: getLotteryStatus,
        staleTime: 30_000,
    });
    const roulette = useQuery({
        queryKey: ["roulette-status"],
        queryFn: () => getRouletteStatus(),
        staleTime: 30_000,
    });
    const dice = useQuery({
        queryKey: ["dice-status"],
        queryFn: getDiceStatus,
        staleTime: 30_000,
    });

    const userLevel = season.data?.current_level ?? 1;
    const vaultBalance = vault.data?.vaultBalance ?? 0;

    // Aggregate all ticket counts (token_balance represents actual ticket ownership)
    const lotteryTickets = lottery.data?.token_balance ?? 0;
    const rouletteTickets = roulette.data?.token_balance ?? 0;
    const diceTickets = dice.data?.token_balance ?? 0;

    const totalTickets = lotteryTickets + rouletteTickets + diceTickets;

    return (
        <div className="flex items-center justify-between px-1 mb-6 gap-2 overflow-hidden">
            <div className="flex items-center gap-2 shrink-0">
                <img src="/assets/logo_cc_v2.png" alt="CC Casino" className="h-10 w-auto object-contain drop-shadow-[0_0_15px_rgba(48,255,117,0.3)]" />
            </div>
            <div className="flex gap-1 md:gap-3 items-center min-w-0">
                {/* User Nickname */}
                <span className="hidden lg:block text-[10px] font-medium text-slate-400 truncate max-w-[60px]">
                    {user?.nickname}
                </span>

                {/* Assets Display */}
                <div className="flex items-center gap-1 md:gap-1.5 rounded-full bg-black/60 border border-white/10 px-1 md:px-2.5 py-1 backdrop-blur-md shrink-0">
                    <img src="/assets/asset_coin_gold.png" alt="Coin" className="w-3.5 h-3.5 md:w-5 md:h-5" />
                    <span className="text-[9px] md:text-xs font-black text-white/90 uppercase tracking-tighter">
                        {vaultBalance.toLocaleString()}
                    </span>
                </div>
                <div className="flex items-center gap-1 md:gap-1.5 rounded-full bg-black/60 border border-white/10 px-1 md:px-2.5 py-1 backdrop-blur-md shrink-0">
                    <img src="/assets/asset_ticket_green.png" alt="Ticket" className="w-3.5 h-3.5 md:w-5 md:h-5" />
                    <span className="text-[9px] md:text-xs font-black text-white/90">{totalTickets}</span>
                </div>
                {/* Level Badge */}
                <div className="px-1 md:px-2 py-0.5 md:py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] md:text-xs font-black text-emerald-400 shrink-0">
                    Lv.{userLevel}
                </div>
                {/* Message Inbox */}
                <InboxButton />

                {/* Logout Button */}
                <LogoutButton className="scale-75 md:scale-90 origin-right ml-0.5" />
            </div>
        </div>
    );
};

export default AppHeader;

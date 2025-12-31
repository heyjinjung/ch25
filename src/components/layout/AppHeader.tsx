import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSeasonPassStatus } from "../../hooks/useSeasonPass";
import { getVaultStatus } from "../../api/vaultApi";
import { getLotteryStatus } from "../../api/lotteryApi";
import { getRouletteStatus } from "../../api/rouletteApi";
import { getDiceStatus } from "../../api/diceApi";
import InboxButton from "../common/InboxButton";
import { useAuth } from "../../auth/authStore";

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
        <div className="flex flex-col gap-2 px-1 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 shrink-0">
                <img src="/assets/logo_cc_v2.png" alt="CC Casino" className="h-9 w-auto object-contain drop-shadow-[0_0_15px_rgba(48,255,117,0.3)] sm:h-10" />
            </div>

            {/* Right Side Group */}
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                {/* Profile Card Container */}
                <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-1 pr-3 shadow-sm backdrop-blur-md">

                    {/* Level Badge (Left) */}
                    <div className="flex flex-col items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-inner text-white shrink-0">
                        <span className="text-[8px] font-medium opacity-80">LV</span>
                        <span className="text-xs font-bold leading-none">{userLevel}</span>
                    </div>

                    {/* User Info & Assets */}
                    <div className="flex flex-col gap-0.5 min-w-[80px]">
                        <div className="text-xs font-bold text-slate-200 truncate max-w-[100px]">
                            {user?.nickname || "Guest"}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Vault Balance */}
                            <div className="flex items-center gap-1">
                                <img src="/assets/asset_coin_gold.png" alt="Coin" className="w-3 h-3" />
                                <span className="text-[10px] font-bold text-slate-300">
                                    {vaultBalance.toLocaleString()}
                                </span>
                            </div>

                            {/* Separator */}
                            <div className="w-px h-2.5 bg-slate-600/50"></div>

                            {/* Tickets */}
                            <div className="flex items-center gap-1">
                                <img src="/assets/asset_ticket_green.png" alt="Ticket" className="w-3 h-3" />
                                <span className="text-[10px] font-bold text-slate-300">
                                    {totalTickets}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inbox Button */}
                <InboxButton />
            </div>
        </div>
    );
};

export default AppHeader;

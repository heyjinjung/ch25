import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authStore";
import { useQuery } from "@tanstack/react-query";
import { getVaultStatus } from "../../api/vaultApi";
import { useSound } from "../../hooks/useSound";
import clsx from "clsx";
import InboxButton from "../common/InboxButton";

const AppHeader: React.FC = () => {
    const { user } = useAuth();
    const { isMuted, toggleMute, playClick } = useSound();

    const { data: vault } = useQuery({
        queryKey: ["vault-status"],
        queryFn: getVaultStatus,
        staleTime: 30_000,
        retry: false,
    });

    const handleSoundToggle = () => {
        playClick();
        toggleMute();
    };

    // Generate initials from username
    const getInitials = (name: string | null | undefined) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const vaultBalance = vault?.vaultBalance ?? 0;
    const ticketCount = 0; // TODO: Add ticket API

    return (
        <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10 shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto gap-4">

                {/* Left: Logo + Profile */}
                <div className="flex items-center gap-3 min-w-0">
                    {/* Logo */}
                    <Link to="/home" className="shrink-0">
                        <img src="/assets/logo_cc_v2.png" alt="Logo" className="w-8 h-8 object-contain" />
                    </Link>

                    {/* Avatar + Username + Level */}
                    <button className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-black text-sm shrink-0 border-2 border-emerald-400/30">
                            {getInitials(user?.nickname || user?.external_id)}
                        </div>

                        {/* Username + Level */}
                        <div className="flex flex-col items-start min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold text-white truncate max-w-[100px]">
                                    {user?.nickname || user?.external_id || "사용자"}
                                </span>
                                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0">
                                    Lv {user?.level ?? 1}
                                </span>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Center: Vault + Tickets */}
                <div className="hidden sm:flex items-center gap-3">
                    {/* Vault */}
                    <Link
                        to="/vault"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-all shadow-sm"
                    >
                        <img src="/assets/asset_coin_gold.webp" alt="Coin" className="w-5 h-5 object-contain" />
                        <span className="text-sm font-black text-white">
                            {vaultBalance.toLocaleString()}원
                        </span>
                    </Link>

                    {/* Tickets */}
                    <Link
                        to="/games"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                    >
                        <img src="/assets/asset_ticket_green.webp" alt="Ticket" className="w-5 h-5 object-contain" />
                        <span className="text-sm font-medium text-white/80">
                            {ticketCount}
                        </span>
                    </Link>
                </div>

                {/* Right: Inbox + Sound */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Inbox */}
                    <InboxButton />

                    {/* Sound Toggle */}
                    <button
                        onClick={handleSoundToggle}
                        aria-label={isMuted ? "사운드 켜기" : "사운드 끄기"}
                        aria-pressed={!isMuted}
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all relative group"
                    >
                        <img
                            src="/assets/icon_megaphone.png"
                            alt="Sound"
                            className={clsx(
                                "w-7 h-7 object-contain transition-all duration-300",
                                isMuted ? "opacity-30 grayscale" : "opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(145,244,2,0.5)]"
                            )}
                        />
                        {isMuted && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-[2px] bg-red-500/60 rotate-45 rounded-full" />
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile: Vault + Tickets (Bottom Row) */}
            <div className="sm:hidden flex items-center gap-2 px-4 pb-3">
                <Link
                    to="/vault"
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 shadow-sm"
                >
                    <img src="/assets/asset_coin_gold.webp" alt="Coin" className="w-5 h-5 object-contain" />
                    <span className="text-sm font-black text-white">
                        {vaultBalance.toLocaleString()}원
                    </span>
                </Link>

                <Link
                    to="/games"
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                >
                    <img src="/assets/asset_ticket_green.webp" alt="Ticket" className="w-5 h-5 object-contain" />
                    <span className="text-sm font-medium text-white/80">
                        {ticketCount}
                    </span>
                </Link>
            </div>
        </header>
    );
};

export default AppHeader;

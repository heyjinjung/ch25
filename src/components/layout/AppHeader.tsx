import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authStore";
import { useQuery } from "@tanstack/react-query";
import { getVaultStatus } from "../../api/vaultApi";
import { useSound } from "../../hooks/useSound";
import clsx from "clsx";
import InboxButton from "../common/InboxButton";
import { ChevronDown } from "lucide-react";

const AppHeader: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { isMuted, toggleMute, playClick, playTabTouch } = useSound();
    const [isTicketMenuOpen, setIsTicketMenuOpen] = useState(false);
    const desktopMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    const { data: vault } = useQuery({
        queryKey: ["vault-status"],
        queryFn: getVaultStatus,
        staleTime: 30_000,
        retry: false,
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isInsideDesktop = !!desktopMenuRef.current?.contains(target);
            const isInsideMobile = !!mobileMenuRef.current?.contains(target);
            if (!isInsideDesktop && !isInsideMobile) setIsTicketMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSoundToggle = () => {
        playClick();
        toggleMute();
    };

    const handleTicketClick = () => {
        playTabTouch();
        setIsTicketMenuOpen(!isTicketMenuOpen);
    };

    const handleMenuNavigation = (to: string, isExternal = false) => {
        playClick();
        setIsTicketMenuOpen(false);
        if (isExternal) {
            window.open(to, "_blank");
        } else {
            navigate(to);
        }
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
    const ticketCount = vault?.ticketCount ?? 0;

    return (
        <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10 shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto gap-4">

                {/* Left: Logo + Profile */}
                <div className="flex items-center gap-3 min-w-0">
                    {/* Logo */}
                    <Link to="/home" className="shrink-0 transition-transform active:scale-95">
                        <img src="/assets/logo_cc_v2.png" alt="Logo" className="w-8 h-8 object-contain" />
                    </Link>

                    {/* Avatar + Username + Level */}
                    <button className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-black text-sm shrink-0 border-2 border-emerald-400/30 shadow-lg shadow-emerald-500/20">
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
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/40 active:scale-95"
                    >
                        <img src="/assets/asset_coin_gold.webp" alt="Coin" className="w-5 h-5 object-contain" />
                        <span className="text-sm font-black text-white">
                            {vaultBalance.toLocaleString()}원
                        </span>
                    </Link>

                    {/* Tickets Button with Menu */}
                    <div className="relative" ref={desktopMenuRef}>
                        <button
                            onClick={handleTicketClick}
                            className={clsx(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all active:scale-95",
                                isTicketMenuOpen
                                    ? "bg-white/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                                    : "bg-white/5 border-white/10 hover:bg-white/10"
                            )}
                        >
                            <img src="/assets/asset_ticket_green.webp" alt="Ticket" className="w-5 h-5 object-contain" />
                            <span className="text-sm font-black text-white/90">
                                {ticketCount}
                            </span>
                            <ChevronDown size={14} className={clsx("text-white/30 transition-transform", isTicketMenuOpen && "rotate-180")} />
                        </button>

                        {/* Dropdown Menu */}
                        {isTicketMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 rounded-xl border border-white/10 bg-black/90 p-1 backdrop-blur-xl shadow-2xl animate-fadeIn">
                                <Link
                                    to="/inventory"
                                    onClick={() => setIsTicketMenuOpen(false)}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold text-white/70 hover:bg-white/5 hover:text-figma-accent transition-all"
                                >
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/5 overflow-hidden p-0.5">
                                        <img src="/assets/icon_inventory_wallet.png" alt="" className="w-full h-full object-contain" />
                                    </div>
                                    인벤토리
                                </Link>
                                <button
                                    onClick={() => handleMenuNavigation("https://ccc-010.com", true)}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold text-white/70 hover:bg-white/5 hover:text-[#FFCC00] transition-all"
                                >
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/5">
                                        <img src="/assets/logo_cc_v2.png" alt="CC" className="w-3.5 h-3.5 object-contain" />
                                    </div>
                                    씨씨이동
                                </button>
                            </div>
                        )}
                    </div>
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
                        className="w-9 h-9 flex items-center justify-center rounded-lg border border-emerald-800 bg-slate-900 transition-colors relative group shadow-lg active:scale-95"
                    >
                        <img
                            src="/assets/icon_megaphone.png"
                            alt="Sound"
                            className={clsx(
                                "w-5 h-5 object-contain transition-all duration-300",
                                isMuted ? "opacity-30 grayscale" : "opacity-100 scale-110"
                            )}
                        />
                        {isMuted && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-5 h-[2px] bg-red-500/60 rotate-45 rounded-full" />
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile: Vault + Tickets (Bottom Row) */}
            <div className="sm:hidden flex items-center gap-2 px-4 pb-3">
                <Link
                    to="/vault"
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 shadow-lg shadow-emerald-900/40 active:scale-95"
                >
                    <img src="/assets/asset_coin_gold.webp" alt="Coin" className="w-5 h-5 object-contain" />
                    <span className="text-sm font-black text-white">
                        {vaultBalance.toLocaleString()}원
                    </span>
                </Link>

                {/* Mobile Ticket Dropdown Container */}
                <div className="flex-1 relative" ref={mobileMenuRef}>
                    <button
                        onClick={handleTicketClick}
                        className={clsx(
                            "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all active:scale-95",
                            isTicketMenuOpen ? "bg-white/10 border-emerald-500/50" : "bg-white/5 border-white/10"
                        )}
                    >
                        <img src="/assets/asset_ticket_green.webp" alt="Ticket" className="w-5 h-5 object-contain" />
                        <span className="text-sm font-black text-white/90">
                            {ticketCount}
                        </span>
                        <ChevronDown size={14} className={clsx("text-white/30 transition-transform", isTicketMenuOpen && "rotate-180")} />
                    </button>

                    {/* Mobile Menu */}
                    {isTicketMenuOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 z-[60] rounded-xl border border-white/10 bg-black/95 p-1 backdrop-blur-2xl shadow-2xl animate-fadeIn">
                            <Link
                                to="/inventory"
                                onClick={() => setIsTicketMenuOpen(false)}
                                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-white/70 active:bg-white/10"
                            >
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/5 overflow-hidden p-0.5">
                                    <img src="/assets/icon_inventory_wallet.png" alt="" className="w-full h-full object-contain" />
                                </div>
                                인벤토리
                            </Link>
                            <button
                                onClick={() => handleMenuNavigation("https://ccc-010.com", true)}
                                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-white/70 active:bg-white/10 border-t border-white/5"
                            >
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/5 overflow-hidden p-0.5">
                                    <img src="/assets/logo_cc_v2.png" alt="CC" className="w-full h-full object-contain" />
                                </div>
                                씨씨이동
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default AppHeader;

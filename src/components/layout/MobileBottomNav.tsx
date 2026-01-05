import React, { memo, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSeasonPassStatus } from "../../hooks/useSeasonPass";
import { useMissionStore } from "../../stores/missionStore";
import clsx from "clsx";

const MobileBottomNav: React.FC = memo(() => {
    const location = useLocation();
    const { data: seasonData } = useSeasonPassStatus();
    const { hasUnclaimed: missionsUnclaimed } = useMissionStore();

    const hasUnclaimedSeason = useMemo(() => {
        if (!seasonData?.levels) return false;
        return seasonData.levels.some((l) => l.is_unlocked && !l.is_claimed);
    }, [seasonData]);

    const globalHasUnclaimed = missionsUnclaimed || hasUnclaimedSeason;

    const currentPath = location.pathname;

    // Helper to determine active state
    const isActive = (path: string) => {
        if (path === "/") {
            return currentPath === "/" || currentPath.startsWith("/landing");
        }
        return currentPath.startsWith(path);
    };

    const navItems = [
        {
            label: "홈",
            to: "/",
            isActive: isActive("/"),
            dataTour: "nav-home",
            icon: (active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" className={clsx("w-6 h-6 mb-1 transition-transform", active ? "scale-110" : "opacity-60")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            )
        },
        {
            label: "게임",
            to: "/games",
            isActive: isActive("/games") || ["/roulette", "/dice", "/lottery"].some(p => currentPath.startsWith(p)),
            dataTour: "nav-games",
            icon: (active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" className={clsx("w-6 h-6 mb-1 transition-transform", active ? "scale-110" : "opacity-60")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            label: "금고",
            to: "/vault",
            isActive: isActive("/vault"),
            dataTour: "nav-vault",
            icon: (active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" className={clsx("w-6 h-6 mb-1 transition-transform", active ? "scale-110" : "opacity-60")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
            )
        },
        {
            label: "이벤트",
            to: "/events",
            isActive: isActive("/events") || isActive("/season-pass") || isActive("/missions"),
            dataTour: "nav-events",
            icon: (active: boolean) => (
                <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className={clsx("w-6 h-6 mb-1 transition-transform", active ? "scale-110 text-amber-400" : "opacity-60")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    {globalHasUnclaimed && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                    )}
                </div>
            )
        }
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-[calc(64px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] z-[9999] bg-black/80 backdrop-blur-xl border-t border-white/5 lg:hidden">
            <div className="flex h-full w-full items-center justify-around px-1 max-w-lg mx-auto">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        to={item.to}
                        data-tour={item.dataTour}
                        className={clsx(
                            "flex flex-1 flex-col items-center justify-center h-full tap-highlight-transparent transition-all active:scale-95",
                            item.isActive ? "text-[var(--figma-accent-green)] drop-shadow-[0_0_8px_rgba(48,255,117,0.5)] font-bold" : "text-white/40 hover:text-white/70"
                        )}
                    >
                        <div className="mb-0.5">{item.icon(item.isActive)}</div>
                        <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
});

MobileBottomNav.displayName = "MobileBottomNav";

export default MobileBottomNav;

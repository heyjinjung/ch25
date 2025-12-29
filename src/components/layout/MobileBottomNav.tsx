import React, { memo, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSeasonPassStatus } from "../../hooks/useSeasonPass";
import clsx from "clsx";

const MobileBottomNav: React.FC = memo(() => {
    const location = useLocation();
    const { data: seasonData } = useSeasonPassStatus();

    const hasUnclaimed = useMemo(() => {
        if (!seasonData?.levels) return false;
        return seasonData.levels.some((l) => l.is_unlocked && !l.is_claimed);
    }, [seasonData]);

    const currentPath = location.pathname;
    const isHome = currentPath === "/";
    const isGames = ["/games", "/roulette", "/dice", "/lottery", "/team-battle", "/vault"].some(p => currentPath.startsWith(p));
    const isSeason = currentPath.startsWith("/season-pass");
    // const isMenu = ... (handled via drawer/modal usually, or link to /admin if admin)

    const navItems = [
        {
            label: "홈",
            to: "/",
            isActive: isHome,
            icon: (active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" className={clsx("w-6 h-6 mb-1 transition-transform", active ? "scale-110" : "opacity-60")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            )
        },
        {
            label: "게임",
            to: "/games", // Updated to link to the new Game Lobby
            isActive: isGames,
            icon: (active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" className={clsx("w-6 h-6 mb-1 transition-transform", active ? "scale-110" : "opacity-60")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            label: "시즌패스",
            to: "/season-pass",
            isActive: isSeason,
            icon: (active: boolean) => (
                <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className={clsx("w-6 h-6 mb-1 transition-transform", active ? "scale-110 text-amber-400" : "opacity-60")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {hasUnclaimed && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                    )}
                </div>
            )
        },
        {
            label: "전체메뉴",
            to: "/menu", // We might need a menu page or open a drawer
            isActive: currentPath === "/menu",
            icon: (active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" className={clsx("w-6 h-6 mb-1 transition-transform", active ? "scale-110" : "opacity-60")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            )
        }
    ];

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[safe-area-inset-bottom] z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        to={item.to}
                        className={clsx(
                            "flex flex-1 flex-col items-center justify-center py-2 tap-highlight-transparent transition-colors",
                            item.isActive ? "text-cc-lime font-bold" : "text-white hover:text-white/80"
                        )}
                    >
                        {item.icon(item.isActive)}
                        <span className="text-[10px] tracking-wide">{item.label}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
});

export default MobileBottomNav;

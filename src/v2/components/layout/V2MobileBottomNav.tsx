// src/components/layout/V2MobileBottomNav.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useSound } from "../../../hooks/useSound";
import clsx from "clsx";

const V2MobileBottomNav: React.FC = () => {
  const { playTabTouch } = useSound();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    return currentPath === path || currentPath.startsWith(path);
  };

  const navItems = [
    {
      label: "홈",
      to: "/home",
      isActive: isActive("/home"),
      icon: (active: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={clsx(
            "w-6 h-6 mb-1 transition-transform",
            active ? "scale-110" : "opacity-60",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={active ? 2.5 : 2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      label: "게임",
      to: "/game",
      isActive: isActive("/game"),
      icon: (active: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={clsx(
            "w-6 h-6 mb-1 transition-transform",
            active ? "scale-110" : "opacity-60",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={active ? 2.5 : 2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={active ? 2.5 : 2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: "금고",
      to: "/vault",
      isActive: isActive("/vault"),
      icon: (active: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={clsx(
            "w-6 h-6 mb-1 transition-transform",
            active ? "scale-110" : "opacity-60",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={active ? 2.5 : 2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
    },
    {
      label: "상점",
      to: "/shop",
      isActive: isActive("/shop"),
      icon: (active: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={clsx(
            "w-6 h-6 mb-1 transition-transform",
            active ? "scale-110" : "opacity-60",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={active ? 2.5 : 2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      ),
    },
    {
      label: "미션",
      to: "/missions",
      isActive: isActive("/missions"),
      icon: (active: boolean) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={clsx(
            "w-6 h-6 mb-1 transition-transform",
            active ? "scale-110" : "opacity-60",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={active ? 2.5 : 2}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] h-[86.87px] bg-black/90 backdrop-blur-md border-t border-white/10 flex justify-around items-center px-4 pb-[env(safe-area-inset-bottom)] w-full max-w-[390px] mx-auto">
      {navItems.map((item, idx) => (
        <Link
          key={idx}
          to={item.to}
          data-testid={`user-nav:${item.to.split("/").pop()}`}
          className="flex flex-col items-center justify-center p-2 transition-all active:scale-95"
          onClick={() => playTabTouch()}
        >
          <div
            className={clsx(item.isActive ? "text-[#25AD82]" : "text-white/40")}
          >
            {item.icon(item.isActive)}
          </div>
          <span
            className={clsx(
              "text-[10px] font-bold mt-0.5 transition-colors",
              item.isActive ? "text-[#25AD82]" : "text-white/40",
            )}
          >
            {item.label}
          </span>
        </Link>
      ))}
    </nav>
  );
};

export default V2MobileBottomNav;

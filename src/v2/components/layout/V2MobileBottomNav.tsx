// src/v2/components/layout/V2MobileBottomNav.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";

const ASSET_PATH = "/v2/assets/01home";

const V2MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { to: "/v2/home", icon: `${ASSET_PATH}/Vector.svg`, active: currentPath === "/v2/home" },
    { to: "/v2/search", icon: `${ASSET_PATH}/Vector-6.svg`, active: currentPath === "/v2/search" },
    { to: "/v2/chat", icon: `${ASSET_PATH}/Vector-7.svg`, active: currentPath === "/v2/chat" },
    { to: "/v2/likes", icon: `${ASSET_PATH}/Vector-8.svg`, active: currentPath === "/v2/likes" },
    { to: "/v2/inventory", icon: `${ASSET_PATH}/Vector-9.svg`, active: currentPath === "/v2/inventory" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] h-[86.87px] bg-black/90 backdrop-blur-md border-t border-white/10 flex justify-around items-center px-4 pb-[env(safe-area-inset-bottom)] w-full max-w-[390px] mx-auto">
      {navItems.map((item, idx) => (
        <Link key={idx} to={item.to} className="p-2 transition-all active:scale-90">
          <img 
            src={item.icon} 
            alt="nav" 
            className={clsx("w-6 h-6 transition-opacity", item.active ? "opacity-100" : "opacity-40")} 
          />
        </Link>
      ))}
    </nav>
  );
};

export default V2MobileBottomNav;

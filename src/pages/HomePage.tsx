import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { useSeasonPassStatus } from "../hooks/useSeasonPass";
import Button from "../components/common/Button";
import { getVaultStatus } from "../api/vaultApi";
import { TelegramLinkBanner } from "../components/telegram/TelegramLinkBanner";

// --- Components ---

interface GameCardProps {
  title: string;
  to: string;
  gradient: string;
  icon: string;
  isWide?: boolean;
  bgImage?: string;
  badge?: string;
}

const GameCard: React.FC<GameCardProps> = ({ title, to, gradient, icon, isWide, bgImage, badge }) => {
  return (
    <Link
      to={to}
      className={clsx(
        "group relative overflow-hidden rounded-3xl border border-white/10 p-5 transition-all hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]",
        !bgImage && gradient,
        isWide ? "col-span-2 aspect-[2/1]" : "col-span-1 aspect-square"
      )}
    >
      {bgImage && (
        <div className="absolute inset-0 z-0">
          <img src={bgImage} alt={title} className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>
      )}

      {!bgImage && (
        <div className="absolute -right-4 -top-4 text-white/10 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
          <span className="text-8xl font-black">{icon}</span>
        </div>
      )}

      <div className="relative z-10 flex h-full flex-col justify-end">
        {badge && (
          <div className="absolute top-0 right-0">
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">{badge}</span>
          </div>
        )}
        <div className="self-end rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold text-white backdrop-blur border border-white/10 shadow-lg">
          PLAY NOW
        </div>
      </div>
    </Link>
  );
};

const CategoryTabs: React.FC<{ active: string; onChange: (id: string) => void }> = ({ active, onChange }) => {
  const tabs = [
    { id: "all", label: "ALL GAMES" },
    { id: "hot", label: "HOT" },
    { id: "new", label: "NEW" },
    { id: "live", label: "LIVE" },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            "whitespace-nowrap rounded-full px-5 py-2 text-xs font-bold transition-all",
            active === tab.id
              ? "bg-figma-primary text-white shadow-lg shadow-emerald-900/20"
              : "bg-white/5 text-slate-400 hover:bg-white/10"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// --- Page ---

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const season = useSeasonPassStatus();
  const [activeTab, setActiveTab] = useState("all");

  // Data (Simplified for layout)
  const vault = useQuery({ queryKey: ["vault-status"], queryFn: getVaultStatus, staleTime: 30_000, retry: false });

  // Vault Banner Logic
  const vaultAmount = vault.data?.vaultBalance ?? 0;
  const showVaultBanner = !!vault.data?.eligible && vaultAmount > 0;
  const formatWon = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;
  const [vaultBannerOpen, setVaultBannerOpen] = useState(false);

  // Dynamic Level Display logic
  const userLevel = season.data?.current_level ?? 1;

  const games = [
    {
      title: "ROULETTE",
      to: "/roulette",
      gradient: "bg-gradient-to-br from-purple-600 to-indigo-600",
      icon: "🎯",
      bgImage: "/assets/games/thumb_roulette.png",
      badge: "HOT"
    },
    {
      title: "DICE",
      to: "/dice",
      gradient: "bg-gradient-to-br from-emerald-500 to-teal-600",
      icon: "🎲",
      bgImage: "/assets/games/thumb_dice.png",
      badge: "2x"
    },
    {
      title: "LOTTERY",
      to: "/lottery",
      gradient: "bg-gradient-to-br from-pink-500 to-rose-600",
      icon: "🎫",
      bgImage: "/assets/games/thumb_lottery.png"
    },
    {
      title: "TEAM BATTLE",
      to: "/team-battle",
      gradient: "bg-gradient-to-br from-blue-600 to-cyan-600",
      icon: "⚔️",
      bgImage: "/assets/games/thumb_team_battle.png",
      badge: "NEW"
    },
    {
      title: "THE VAULT",
      to: "/vault",
      gradient: "bg-gradient-to-br from-amber-500 to-orange-600",
      icon: "🔐",
      isWide: true,
      bgImage: "/assets/games/thumb_my_vault.png"
    },
  ];

  return (
    <section className="space-y-6 pb-4">
      <TelegramLinkBanner />

      {/* Header/Nav (Simple Top Bar) */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-500 flex items-center justify-center font-bold text-white text-xs">
            CC
          </div>
          <span className="text-xl font-black italic tracking-tighter text-white">CASINO</span>
        </div>
        <div className="flex gap-3">
          {/* Assets Display */}
          <div className="flex items-center gap-1.5 rounded-full bg-black/40 border border-white/5 px-3 py-1 backdrop-blur-md">
            <img src="/assets/asset_coin_gold.png" alt="Coin" className="h-5 w-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
            <span className="text-xs font-bold text-white">12,500</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-black/40 border border-white/5 px-3 py-1 backdrop-blur-md">
            <img src="/assets/asset_ticket_green.png" alt="Ticket" className="h-5 w-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
            <span className="text-xs font-bold text-white">5</span>
          </div>
          {/* Level Badge */}
          <div className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-emerald-400">
            Lv.{userLevel}
          </div>
        </div>
      </div>

      {/* Sticky Vault Banner */}
      {showVaultBanner && (
        <div className="sticky top-3 z-40 px-1">
          <div className="rounded-2xl border border-gold-500/30 bg-black/60 backdrop-blur-md p-4 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-50" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">LOCKED VAULT</p>
                <p className="text-xl font-black text-white glow-gold">{formatWon(vaultAmount)}</p>
              </div>
              <Button variant="figma-secondary" onClick={() => setVaultBannerOpen(!vaultBannerOpen)} className="!py-1.5 !px-3 !text-xs">
                {vaultBannerOpen ? "Close" : "Open"}
              </Button>
            </div>
            {vaultBannerOpen && (
              <div className="relative z-10 mt-3 border-t border-white/10 pt-2 text-xs text-slate-300">
                <p>외부 충전 시 해금됩니다.</p>
                <div className="mt-2 flex gap-2">
                  <a href="https://ccc-010.com" target="_blank" rel="noreferrer" className="flex-1 py-2 text-center bg-amber-500/20 rounded border border-amber-500/30 text-amber-200 hover:bg-amber-500/30">1만원</a>
                  <a href="https://ccc-010.com" target="_blank" rel="noreferrer" className="flex-1 py-2 text-center bg-amber-500/20 rounded border border-amber-500/30 text-amber-200 hover:bg-amber-500/30">5만원</a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative mx-1 overflow-hidden rounded-3xl bg-gradient-to-b from-emerald-900 to-black border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-500/20 to-transparent" />
        <div className="relative z-10 p-6">
          <span className="inline-block rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white mb-2 backdrop-blur-sm">
            WELCOME PACKAGE
          </span>
          <h2 className="text-3xl font-black text-white leading-tight">
            GET YOUR <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">BONUS NOW</span>
          </h2>
          <p className="mt-2 text-sm text-slate-300 max-w-[60%]">
            Join the Team Battle and win up to 1,000,000 P prizes.
          </p>
          <div className="mt-4">
            <Button variant="figma-primary" onClick={() => navigate('/team-battle')} className="!px-6 shadow-lg shadow-emerald-500/30">
              GET BONUS
            </Button>
          </div>
        </div>
        <div className="absolute -bottom-4 -right-4 text-9xl opacity-10 rotate-12 select-none">
          ♠
        </div>
      </div>

      {/* Tabs */}
      <div className="px-1">
        <CategoryTabs active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-2 gap-3 px-1">
        {games.map((game) => (
          <GameCard key={game.title} {...game} />
        ))}
      </div>

      <div className="text-center py-6">
        <p className="text-xs text-slate-500 font-medium">© 2024 CC CASINO. All rights reserved.</p>
      </div>
    </section>
  );
};

export default HomePage;

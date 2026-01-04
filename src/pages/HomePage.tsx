import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import Button from "../components/common/Button";
import { getVaultStatus } from "../api/vaultApi";
import { useSound } from "../hooks/useSound";
import { useNewUserWelcome } from "../hooks/useNewUserWelcome";
import NewUserWelcomeModal from "../components/modal/NewUserWelcomeModal";
import { useMissionStore } from "../stores/missionStore";
import { useToast } from "../components/common/ToastProvider";
import AttendanceStreakModal from "../components/modal/AttendanceStreakModal";
import { tryHaptic } from "../utils/haptics";

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
        "group relative overflow-hidden rounded-[24px] border border-white/10 p-4 transition-all",
        !bgImage && gradient,
        isWide ? "col-span-2 aspect-[2/1]" : "col-span-1 aspect-square"
      )}
    >
      {bgImage && (
        <div className="absolute inset-0 z-0">
          <img src={bgImage} alt={title} className="h-full w-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>
      )}

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex justify-between items-start">
          {badge && (
            <span className="absolute top-0 right-0 rounded-bl-xl bg-red-600 px-3 py-1 text-[10px] font-black text-white shadow-sm z-20">{badge}</span>
          )}
          {!bgImage && <span className="text-3xl">{icon}</span>}
        </div>

        <div className="mt-auto">
          {/* Title removed per user request */}
          <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] font-black text-white backdrop-blur border border-white/10">
            지금 플레이
          </div>
        </div>
      </div>
    </Link>
  );
};

const CategoryTabs: React.FC<{ active: string; onChange: (id: string) => void }> = ({ active, onChange }) => {
  const { playTabTouch } = useSound();
  const tabs = [
    { id: "all", label: "전체 게임" },
    { id: "hot", label: "씨씨카지노", link: "https://ccc-010.com" },
    { id: "new", label: "씨씨 공식채널", link: "https://t.me/+IE0NYpuze_k1YWZk" },
  ];
  return (
    <div className="flex justify-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {tabs.map((tab) => (
        tab.link ? (
          <a
            key={tab.id}
            href={tab.link}
            target="_blank"
            rel="noreferrer"
            onClick={() => playTabTouch()}
            className={clsx(
              "whitespace-nowrap rounded-full px-5 py-2 text-xs font-bold transition-all border flex items-center gap-2",
              "bg-white/5 text-slate-400 hover:bg-white/10 border-white/20 hover:border-white/40"
            )}
          >
            {tab.id === 'hot' && <img src="/assets/logo_cc_v2.png" className="w-3.5 h-3.5 object-contain grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100" alt="" />}
            {tab.id === 'new' && <img src="/assets/logo_cc_v2.png" className="w-3.5 h-3.5 object-contain grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100" alt="" />}
            {tab.label}
          </a>
        ) : (
          <button
            key={tab.id}
            onClick={() => {
              playTabTouch();
              onChange(tab.id);
            }}
            className={clsx(
              "whitespace-nowrap rounded-full px-6 py-2.5 text-xs font-black transition-all",
              active === tab.id
                ? "bg-gradient-to-r from-figma-primary to-[#70FF95] text-white shadow-[0_4px_15px_rgba(48,255,117,0.3)] scale-105"
                : "bg-white/5 text-slate-400 hover:bg-white/10"
            )}
          >
            {tab.label}
          </button>
        )
      ))}
    </div>
  );
};

// --- Page ---

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("all");
  const { showModal, closeModal } = useNewUserWelcome();
  const { missions, fetchMissions, streakInfo, streakRules, fetchStreakRules } = useMissionStore();
  const { addToast } = useToast();
  const hasAnnouncedGift = React.useRef(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const hasCheckedStreak = React.useRef(false);

  React.useEffect(() => {
    fetchMissions();
    fetchStreakRules();
  }, [fetchMissions, fetchStreakRules]);

  // Sequential Modal Logic:
  // If showModal (Welcome) is false AND we haven't checked streak this session AND we have streakInfo
  React.useEffect(() => {
    if (!showModal && !hasCheckedStreak.current && streakInfo) {
      // Show streak modal if play_streak > 0 (or simply show it anyway for attendance board)
      // For MVP, we show it once per session after welcome modal is closed.
      const hasSeenStreakThisSession = sessionStorage.getItem("streak_modal_seen");
      if (!hasSeenStreakThisSession) {
        setShowStreakModal(true);
        sessionStorage.setItem("streak_modal_seen", "true");
      }
      hasCheckedStreak.current = true;
    }
  }, [showModal, streakInfo]);

  React.useEffect(() => {
    if (missions.length > 0 && !hasAnnouncedGift.current) {
      const dailyGift = missions.find(m => m.mission.logic_key === "daily_login_gift");
      if (dailyGift && dailyGift.progress.is_completed && !dailyGift.progress.is_claimed) {
        addToast("🎁 오늘의 선물 도착! 미션 탭에서 확인하세요.", "success");
        hasAnnouncedGift.current = true;
      }
    }
  }, [missions, addToast]);

  // Data (Simplified for layout)
  const vault = useQuery({ queryKey: ["vault-status"], queryFn: getVaultStatus, staleTime: 30_000, retry: false });

  // Vault Banner Logic
  const vaultAmount = vault.data?.vaultBalance ?? 0;
  const showVaultBanner = !!vault.data?.eligible && vaultAmount > 0;
  const formatWon = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;
  const [vaultBannerOpen, setVaultBannerOpen] = useState(false);

  // Dynamic Level Display logic

  const games = [
    {
      title: "ROULETTE",
      to: "/roulette",
      gradient: "bg-gradient-to-br from-purple-600 to-indigo-600",
      icon: "🎯",
      bgImage: "/assets/games/thumb_roulette_v2.png",
      badge: "HOT"
    },
    {
      title: "DICE",
      to: "/dice",
      gradient: "bg-gradient-to-br from-emerald-500 to-teal-600",
      icon: "🎲",
      bgImage: "/assets/games/thumb_dice_v2.png",
    },
    {
      title: "LOTTERY",
      to: "/lottery",
      gradient: "bg-gradient-to-br from-pink-500 to-rose-600",
      icon: "🎫",
      bgImage: "/assets/games/thumb_lottery_v2.png"
    },
    {
      title: "TEAM BATTLE",
      to: "/team-battle",
      gradient: "bg-gradient-to-br from-blue-600 to-cyan-600",
      icon: "⚔️",
      bgImage: "/assets/games/thumb_team_battle_v2.png",
      badge: "NEW"
    },
    {
      title: "EVENTS",
      to: "/events",
      gradient: "bg-gradient-to-br from-indigo-500 to-purple-600",
      icon: "🎁",
      bgImage: "/assets/welcome/event_v2.png"
    },
    {
      title: "THE VAULT",
      to: "/vault",
      gradient: "bg-gradient-to-br from-amber-500 to-orange-600",
      icon: "🔐",
      bgImage: "/assets/welcome/my_vault_v2.png"
    },
  ];

  return (
    <section className="space-y-6 pb-4">


      {/* Sticky Vault Banner */}
      {showVaultBanner && (
        <div className="sticky top-3 z-40 px-1">
          <div className="rounded-2xl border border-gold-500/30 bg-black/60 backdrop-blur-md p-4 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-50" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">잠긴 금고</p>
                <p className="text-xl font-black text-white glow-gold">{formatWon(vaultAmount)}</p>
              </div>
              <Button variant="figma-secondary" onClick={() => setVaultBannerOpen(!vaultBannerOpen)} className="!py-1.5 !px-3 !text-xs">
                {vaultBannerOpen ? "닫기" : "열기"}
              </Button>
            </div>
            {vaultBannerOpen && (
              <div className="relative z-10 mt-3 border-t border-white/10 pt-2 text-xs text-slate-300">

                <div className="mt-2 flex gap-2">
                  <a href="https://ccc-010.com" target="_blank" rel="noreferrer" className="flex-1 py-2 text-center bg-amber-500/20 rounded border border-amber-500/30 text-amber-200 hover:bg-amber-500/30"><img src="/assets/logo_cc_v2.png" alt="CC" className="inline-block w-4 h-4 mr-2 align-text-bottom" />1만원</a>
                  <a href="https://ccc-010.com" target="_blank" rel="noreferrer" className="flex-1 py-2 text-center bg-amber-500/20 rounded border border-amber-500/30 text-amber-200 hover:bg-amber-500/30"><img src="/assets/logo_cc_v2.png" alt="CC" className="inline-block w-4 h-4 mr-2 align-text-bottom" />5만원</a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative mx-1 overflow-hidden rounded-3xl border border-white/10 shadow-2xl aspect-[8/3]">
        <img src="/assets/hero_event_banner.png" className="absolute inset-0 w-full h-full object-cover" alt="Banner" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

        {/* Contact Manager Button - Bottom Right Alignment */}
        <div className="absolute bottom-5 right-5 z-20 flex flex-col items-end gap-2">
          {streakInfo && streakInfo.streak_days > 0 && (
            <div
              onClick={() => { tryHaptic(10); setShowStreakModal(true); }}
              className="flex items-center gap-2 rounded-full px-4 py-1.5 bg-black/60 border border-amber-500/30 backdrop-blur-md shadow-lg animate-bounce-subtle cursor-pointer transition-transform active:scale-95"
            >
              <span className="text-xs font-black text-amber-400">🔥 {streakInfo.streak_days}일 연속</span>
            </div>
          )}
          <a
            href="https://t.me/jm956"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg px-6 py-2 text-base font-bold transition focus:outline-none bg-figma-primary text-white shadow-[0_4px_12px_rgba(0,0,0,0.3)] shadow-emerald-500/40 hover:brightness-110 active:scale-95 tracking-wide"
          >
            <img
              src="/assets/icon_telegram_button.png"
              className="w-5 h-5 object-contain"
              alt=""
            />
            실장문의
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-1">
        <CategoryTabs active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Games Grid - 3 rows x 2 columns */}
      <div className="grid grid-cols-2 gap-3 px-1">
        {games.map((game) => (
          <GameCard key={game.title} {...game} />
        ))}
      </div>

      {/* Guide Banner - Premium floating style */}
      <Link
        to="/guide"
        className="group mx-1 relative flex items-center gap-4 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-800/90 border border-white/10 p-4 backdrop-blur-xl shadow-xl overflow-hidden transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/10 active:scale-[0.98]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
          <img src="/assets/icon_help.png" className="w-8 h-8 object-contain" alt="" />
        </div>
        <div className="relative z-10 flex-1 min-w-0">
          <h4 className="text-white font-black text-sm tracking-tight">이용 가이드</h4>
          <p className="text-white/50 text-xs mt-0.5 truncate">서비스 이용방법을 확인해보세요</p>
        </div>
        <div className="relative z-10 shrink-0">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-all">
            <svg className="w-4 h-4 text-white/50 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>

      {/* New User Welcome Modal */}
      {showModal && <NewUserWelcomeModal onClose={closeModal} />}

      {/* Attendance Streak Modal */}
      {showStreakModal && streakInfo && streakRules && (
        <AttendanceStreakModal
          onClose={() => setShowStreakModal(false)}
          currentStreak={streakInfo.streak_days}
          rules={streakRules}
        />
      )}

    </section>
  );
};

export default HomePage;

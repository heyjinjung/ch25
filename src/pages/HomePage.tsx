import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import Button from "../components/common/Button";
import { getVaultStatus } from "../api/vaultApi";
import { useSound } from "../hooks/useSound";
import { useNewUserWelcome } from "../hooks/useNewUserWelcome";
import { useModalVisibility } from "../hooks/useModalVisibility";
import NewUserWelcomeModal from "../components/modal/NewUserWelcomeModal";
import StarterMissionsModal from "../components/modal/StarterMissionsModal";
import { useMissionStore } from "../stores/missionStore";
import { useToast } from "../components/common/ToastProvider";
import { useAuth } from "../auth/authStore";
import { Zap } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

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

const TiltCard: React.FC<GameCardProps> = ({
  title,
  to,
  gradient,
  icon,
  isWide,
  bgImage,
  badge,
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 500, damping: 30 });
  const mouseY = useSpring(y, { stiffness: 500, damping: 30 });

  // Increased Tilt 7deg -> 12deg for prominent 3D
  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["12deg", "-12deg"]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-12deg", "12deg"]);
  const brightness = useTransform(mouseY, [-0.5, 0.5], [1.1, 0.9]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXVal = e.clientX - rect.left;
    const mouseYVal = e.clientY - rect.top;
    const xPct = mouseXVal / width - 0.5;
    const yPct = mouseYVal / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <Link
      to={to}
      className={clsx(
        isWide ? "col-span-2 aspect-[2/1]" : "col-span-1 aspect-square",
        "perspective-1000 group",
      )}
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          filter: `brightness(${brightness})`,
        }}
        className={clsx(
          "relative h-full w-full rounded-[24px] border border-white/10 transition-all duration-300",
          // Hover Neon Glow
          "shadow-lg hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:border-white/30",
          !bgImage && gradient, // Fallback gradient if no image
        )}
      >
        {/* Background Layer (Clipped) */}
        <div
          className="absolute inset-0 overflow-hidden rounded-[24px]"
          style={{ transform: "translateZ(0px)" }}
        >
          {/* Inner Glow */}
          <div className="absolute inset-0 z-10 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 mix-blend-overlay" />

          {bgImage && (
            <div className="absolute inset-0 z-0">
              <motion.img
                src={bgImage}
                alt={title}
                className="h-full w-full object-cover opacity-90"
                transition={{ duration: 0.5 }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </div>
          )}
        </div>

        {/* Floating Content (Visible Depth) */}
        <div
          className="relative z-20 flex h-full flex-col justify-between p-4"
          style={{ transform: "translateZ(30px)" }}
        >
          <div className="flex justify-between items-start">
            {badge && (
              <motion.span
                className="absolute top-0 right-0 rounded-bl-xl bg-red-600 px-3 py-1 text-[10px] font-black text-white shadow-lg"
                style={{ transform: "translateZ(20px)" }} // Pop badge
              >
                {badge}
              </motion.span>
            )}
            {!bgImage && (
              <span
                className="text-4xl drop-shadow-md"
                style={{ transform: "translateZ(10px)" }}
              >
                {icon}
              </span>
            )}
          </div>

          <div className="mt-auto">
            {/* '지금 플레이' 배지 제거 per request */}
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

const CategoryTabs: React.FC<{
  active: string;
  onChange: (id: string) => void;
}> = ({ active, onChange }) => {
  const { playTabTouch } = useSound();
  const tabs = [
    { id: "hot", label: "씨씨카지노", link: "https://ccc-010.com" },
    {
      id: "new",
      label: "씨씨 공식채널",
      link: "https://t.me/+IE0NYpuze_k1YWZk",
    },
  ];
  return (
    <div className="flex justify-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {tabs.map((tab) =>
        tab.link ? (
          <a
            key={tab.id}
            href={tab.link}
            target="_blank"
            rel="noreferrer"
            onClick={() => playTabTouch()}
            className={clsx(
              "group whitespace-nowrap rounded-full px-5 py-2 text-xs font-bold transition-all border flex items-center gap-2",
              "bg-white/5 text-slate-400 border-white/20",
              "hover:bg-gradient-to-r hover:from-figma-primary hover:to-[#70FF95] hover:text-white hover:shadow-[0_4px_15px_rgba(48,255,117,0.3)] hover:scale-105 hover:border-transparent",
            )}
          >
            {tab.id === "hot" && (
              <img
                src="/assets/logo_cc_v2.png"
                className="w-3.5 h-3.5 object-contain grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100"
                alt=""
              />
            )}
            {tab.id === "new" && (
              <img
                src="/assets/logo_cc_v2.png"
                className="w-3.5 h-3.5 object-contain grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100"
                alt=""
              />
            )}
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
                : "bg-white/5 text-slate-400 hover:bg-white/10",
            )}
          >
            {tab.label}
          </button>
        ),
      )}
    </div>
  );
};

// --- Page ---

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("all");
  const {
    showWelcomeModal,
    showStarterModal,
    closeWelcomeModal,
    closeStarterModal,
    closeAllModals,
  } = useNewUserWelcome();
  const { new_user_welcome_enabled, starter_missions_enabled } =
    useModalVisibility();
  const { missions, fetchMissions, streakInfo } = useMissionStore();
  const { addToast } = useToast();
  const hasAnnouncedGift = React.useRef(false);

  React.useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  React.useEffect(() => {
    if (missions.length > 0 && !hasAnnouncedGift.current) {
      const dailyGift = missions.find(
        (m) => m.mission.logic_key === "daily_login_gift",
      );
      if (
        dailyGift &&
        dailyGift.progress.is_completed &&
        !dailyGift.progress.is_claimed
      ) {
        addToast("🎁 오늘의 선물 도착! 미션 탭에서 확인하세요.", "success");
        hasAnnouncedGift.current = true;
      }
    }
  }, [missions, addToast]);

  // Data (Simplified for layout)
  const vault = useQuery({
    queryKey: ["vault-status"],
    queryFn: getVaultStatus,
    staleTime: 30_000,
    retry: false,
  });

  // Vault Banner Logic
  const vaultAmount = vault.data?.vaultBalance ?? 0;
  const showVaultBanner = !!vault.data?.eligible && vaultAmount > 0;
  const formatWon = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;
  const [vaultBannerOpen, setVaultBannerOpen] = useState(false);
  const { user } = useAuth();

  // Almost VIP Logic
  // Show only if level 9 AND NOT already in VIP segment
  const isAlmostVip = user?.level === 9 && user?.segment !== "VIP";
  // Dynamic Level Display logic

  const games = [
    {
      title: "ROULETTE",
      to: "/roulette",
      gradient: "bg-gradient-to-br from-purple-600 to-indigo-600",
      icon: "🎯",
      bgImage: "/assets/games/thumb_roulette_v2.png",
      badge: "HOT",
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
      bgImage: "/assets/games/thumb_lottery_v2.png",
    },
    {
      title: "TEAM BATTLE",
      to: "/team-battle",
      gradient: "bg-gradient-to-br from-blue-600 to-cyan-600",
      icon: "⚔️",
      bgImage: "/assets/games/thumb_team_battle_v2.png",
      badge: "NEW",
    },
    {
      title: "EVENTS",
      to: "/events",
      gradient: "bg-gradient-to-br from-indigo-500 to-purple-600",
      icon: "🎁",
      bgImage: "/assets/welcome/event_v2.png",
    },
    {
      title: "CC코드금고",
      to: "/vault",
      gradient: "bg-gradient-to-br from-amber-500 to-orange-600",
      icon: "🔐",
      bgImage: "/assets/welcome/my_vault_v2.png",
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
                <p className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                  잠긴 금고
                </p>
                <p className="text-xl font-black text-white glow-gold">
                  {formatWon(vaultAmount)}
                </p>
              </div>
              <Button
                variant="figma-secondary"
                onClick={() => setVaultBannerOpen(!vaultBannerOpen)}
                className="!py-1.5 !px-3 !text-xs"
              >
                {vaultBannerOpen ? "닫기" : "열기"}
              </Button>
            </div>
            {vaultBannerOpen && (
              <div className="relative z-10 mt-3 border-t border-white/10 pt-2 text-xs text-slate-300">
                <div className="mt-2 flex gap-2">
                  <a
                    href="https://ccc-010.com"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex-1 py-2 text-center bg-amber-500/20 rounded border border-amber-500/30 text-amber-200 hover:bg-amber-500/30"
                  >
                    <img
                      src="/assets/logo_cc_v2.png"
                      alt="CC"
                      className="inline-block w-4 h-4 mr-2 align-text-bottom"
                    />
                    1만원
                  </a>
                  <a
                    href="https://ccc-010.com"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex-1 py-2 text-center bg-amber-500/20 rounded border border-amber-500/30 text-amber-200 hover:bg-amber-500/30"
                  >
                    <img
                      src="/assets/logo_cc_v2.png"
                      alt="CC"
                      className="inline-block w-4 h-4 mr-2 align-text-bottom"
                    />
                    5만원
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Almost VIP Banner */}
      {isAlmostVip && (
        <div className="mx-1 mt-2 mb-4 p-4 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 animate-pulse">
                <img
                  src="/images/crown2.png"
                  alt="VIP"
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">
                    ALMOST VIP
                  </span>
                </div>
                <p className="text-sm font-bold text-white">
                  <span className="text-amber-400">한 판만 더 하면</span> VIP
                  달성!
                </p>
              </div>
            </div>

            <Link
              to="/roulette"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Zap size={16} className="fill-current text-amber-500" />
            </Link>
          </div>
          {/* Progress Bar Simulation */}
          <div className="mt-3 h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
            <div className="h-full w-[90%] bg-gradient-to-r from-amber-600 to-yellow-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
          </div>
        </div>
      )}

      {/* Hero Section */}
      <motion.div
        className="relative mx-1 overflow-hidden rounded-3xl border border-white/10 shadow-2xl aspect-[8/3] group"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.img
          src="/assets/hero_event_banner_20260116.png"
          className="absolute inset-0 w-full h-full object-cover object-left-top"
          alt="Banner"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
        {/* Shimmer Overlay */}

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

        {/* Contact Manager Button - Bottom Right Alignment */}
        <div className="absolute bottom-5 right-4 z-20 flex flex-col items-end gap-2">
          {streakInfo && streakInfo.streak_days > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-2 rounded-full px-4 py-1.5 bg-black/60 border border-amber-500/30 backdrop-blur-md shadow-lg cursor-default"
            >
              <span className="text-xs font-black text-amber-400">
                🔥 {streakInfo.streak_days}일 연속
              </span>
            </motion.div>
          )}
          <motion.a
            href="https://t.me/jm956"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-lg px-6 py-2 text-base font-bold transition focus:outline-none bg-figma-primary text-white shadow-[0_4px_12px_rgba(0,0,0,0.3)] shadow-emerald-500/40 hover:brightness-110 active:scale-95 tracking-wide overflow-hidden relative"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Button Shine */}
            <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 -translate-x-[200%] animate-shine" />
            <img
              src="/assets/icon_telegram_button.png"
              className="w-5 h-5 object-contain"
              alt=""
            />
            실장문의
          </motion.a>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="px-1">
        <CategoryTabs active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Games Grid - 3 rows x 2 columns */}
      <div className="grid grid-cols-2 gap-3 px-1">
        {games.map((game) => (
          <TiltCard key={game.title} {...game} />
        ))}
      </div>

      {/* Guide Banner - Premium floating style */}
      <Link
        to="/guide"
        className="group mx-1 relative flex items-center gap-4 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-800/90 border border-white/10 p-4 backdrop-blur-xl shadow-xl overflow-hidden transition-all hover:border-emerald-500/30 hover:shadow-emerald-500/10 active:scale-[0.98]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
          <img
            src="/assets/icon_help.png"
            className="w-8 h-8 object-contain"
            alt=""
          />
        </div>
        <div className="relative z-10 flex-1 min-w-0">
          <h4 className="text-white font-black text-sm tracking-tight">
            이용 가이드
          </h4>
          <p className="text-white/50 text-xs mt-0.5 truncate">
            서비스 이용방법을 확인해보세요
          </p>
        </div>
        <div className="relative z-10 shrink-0">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-all">
            <svg
              className="w-4 h-4 text-white/50 group-hover:text-emerald-400 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </Link>

      {/* New User Welcome Modal */}
      {new_user_welcome_enabled && showWelcomeModal && (
        <NewUserWelcomeModal
          onClose={closeAllModals}
          onClaimSuccess={closeWelcomeModal}
        />
      )}

      {/* Starter Missions Modal */}
      {starter_missions_enabled && showStarterModal && (
        <StarterMissionsModal onClose={closeStarterModal} />
      )}

      {/* Attendance Streak Modal */}
    </section>
  );
};

export default HomePage;

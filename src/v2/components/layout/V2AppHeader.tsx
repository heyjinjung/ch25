// src/v2/components/layout/V2AppHeader.tsx
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/authStore";
import { useQuery } from "@tanstack/react-query";
import { getV2VaultStatus } from "../../api/v1CompatAdapter";
import { useSound } from "../../../hooks/useSound";
import clsx from "clsx";
import InboxButton from "../../../components/common/InboxButton";
import { ChevronDown } from "lucide-react";
import GoldenHourTimer from "../../../components/layout/GoldenHourTimer";
import GoldenHourPopup from "../../../components/events/GoldenHourPopup";
import { useModalVisibility } from "../../hooks/useModalVisibility";
import { V2StreakModalContainer } from "../mission";
import { useV2Missions } from "../../hooks/useV2Mission";
import VipPromotionModal from "../../../components/modal/VipPromotionModal";
import VipEligibilityModal from "../../../components/modal/VipEligibilityModal";
import { AnimatePresence } from "framer-motion";

const V2AppHeader: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { isMuted, toggleMute, playClick, playTabTouch } = useSound();
  const [isTicketMenuOpen, setIsTicketMenuOpen] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [isGoldenHourModalOpen, setIsGoldenHourModalOpen] = useState(false);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [isVipEligibilityModalOpen, setIsVipEligibilityModalOpen] =
    useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);

  const { attendance_streak_enabled } = useModalVisibility();
  const { data: missionsData } = useV2Missions();
  const streakInfo = missionsData?.streak_info;

  const { data: vault } = useQuery({
    queryKey: ["v2-vault-status"],
    queryFn: getV2VaultStatus,
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

  const isGoldenHourActive = vault?.is_golden_hour_active ?? false;
  const ghMultiplier = vault?.golden_hour_multiplier ?? 2.0;
  const ghRemainingSeconds = vault?.golden_hour_remaining_seconds ?? 0;

  useEffect(() => {
    if (isGoldenHourActive) {
      const hasSeen = sessionStorage.getItem("v2_gh_popup_seen");
      if (!hasSeen) {
        setIsGoldenHourModalOpen(true);
        sessionStorage.setItem("v2_gh_popup_seen", "true");
      }
    }
  }, [isGoldenHourActive]);

  // Admin Forced Modal Logic + Auto-show for claimable rewards
  const showModalOverride = vault?.showModalOverride;
  useEffect(() => {
    if (!attendance_streak_enabled) return;

    const hasClaimable = (streakInfo?.claimable_rewards?.length ?? 0) > 0;
    const claimableDay = streakInfo?.claimable_rewards?.[0];

    if (showModalOverride === "STREAK_ATTENDANCE") {
      const key = `forced_modal_${showModalOverride}`;
      if (!sessionStorage.getItem(key)) {
        setIsStreakModalOpen(true);
        sessionStorage.setItem(key, "true");
      }
    } else if (hasClaimable && claimableDay) {
      const key = `v2_streak_claim_shown_${claimableDay}`;
      if (!sessionStorage.getItem(key)) {
        setIsStreakModalOpen(true);
        sessionStorage.setItem(key, "true");
      }
    }
  }, [
    showModalOverride,
    streakInfo?.claimable_rewards,
    attendance_streak_enabled,
  ]);

  const handleVipModalClose = () => {
    if (user?.id) {
      localStorage.setItem(`v2_vip_promotion_seen_${user.id}`, "true");
    }
    setIsVipModalOpen(false);
  };

  const handleVipEligibilityModalClose = () => {
    if (user?.id) {
      const currentCount = parseInt(
        localStorage.getItem(`v2_vip_eligibility_count_${user.id}`) || "0",
      );
      localStorage.setItem(
        `v2_vip_eligibility_count_${user.id}`,
        String(currentCount + 1),
      );
      localStorage.setItem(
        `v2_vip_eligibility_last_${user.id}`,
        new Date().toISOString(),
      );
    }
    setIsVipEligibilityModalOpen(false);
  };

  useEffect(() => {
    if (user?.segment === "VIP") {
      const key = `v2_vip_promotion_seen_${user.id}`;
      if (!localStorage.getItem(key)) {
        setIsVipModalOpen(true);
      }
    } else if (user) {
      const showCount = parseInt(
        localStorage.getItem(`v2_vip_eligibility_count_${user.id}`) || "0",
      );
      const lastShown = localStorage.getItem(
        `v2_vip_eligibility_last_${user.id}`,
      );
      const MAX_SHOWS = 5;
      const INTERVAL_DAYS = 3;

      if (showCount < MAX_SHOWS) {
        if (!lastShown) {
          setIsVipEligibilityModalOpen(true);
        } else {
          const lastDate = new Date(lastShown);
          const now = new Date();
          const daysSince = Math.floor(
            (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (daysSince >= INTERVAL_DAYS) {
            setIsVipEligibilityModalOpen(true);
          }
        }
      }
    }
  }, [user?.segment, user?.id]);

  useEffect(() => {
    if (vault?.segment && vault.segment !== user?.segment) {
      updateUser({ segment: vault.segment });
    }
  }, [vault?.segment, user?.segment, updateUser]);

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
    <>
      <header className="z-50 bg-black/90 backdrop-blur-md border-b border-white/10 shadow-lg shrink-0">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto gap-4">
          {/* Left: Logo + Profile */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/home"
              className="shrink-0 transition-transform active:scale-95"
            >
              <img
                src="/assets/logo_cc_v2.png"
                alt="Logo"
                className="w-8 h-8 object-contain"
              />
            </Link>
            <button className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
              {(() => {
                const isVipTier = user?.segment === "VIP";
                return (
                  <>
                    <div
                      className={clsx(
                        "w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 border-2 transition-all duration-500",
                        isVipTier
                          ? "bg-gradient-to-br from-yellow-400 to-orange-500 border-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.5)] ring-2 ring-yellow-400/50 animate-pulse"
                          : "bg-gradient-to-br from-emerald-500 to-cyan-500 border-emerald-400/30 shadow-lg shadow-emerald-500/20",
                      )}
                    >
                      {getInitials(user?.nickname || user?.external_id)}
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white truncate max-w-[80px] sm:max-w-[100px]">
                          {user?.nickname || user?.external_id || "사용자"}
                        </span>
                        <span
                          className={clsx(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 transition-colors flex items-center gap-0.5",
                            isVipTier
                              ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
                              : "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
                          )}
                        >
                          {isVipTier && (
                            <img
                              src="/images/crown2.png"
                              alt="VIP"
                              className="w-3 h-3 object-contain mb-0.5"
                            />
                          )}
                          <span className="leading-none">
                            Lv {user?.level ?? 1}
                          </span>
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </button>
          </div>

          {/* Center: Vault + Tickets */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              to="/v2/vault"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all active:scale-95 bg-white/5 border-white/10 hover:bg-white/10"
            >
              <img
                src="/assets/asset_coin_gold.png"
                alt="Coin"
                className="w-5 h-5 object-contain"
              />
              <span className="text-sm font-black text-white">
                {vaultBalance.toLocaleString()}원
              </span>
            </Link>
            <div className="relative" ref={desktopMenuRef}>
              <button
                onClick={handleTicketClick}
                className={clsx(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all active:scale-95",
                  isTicketMenuOpen
                    ? "bg-white/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                    : "bg-white/5 border-white/10 hover:bg-white/10",
                )}
              >
                <img
                  src="/assets/asset_ticket_green.png"
                  alt="Ticket"
                  className="w-5 h-5 object-contain"
                />
                <span className="text-sm font-black text-white/90">
                  {ticketCount}
                </span>
                <ChevronDown
                  size={14}
                  className={clsx(
                    "text-white/30 transition-transform",
                    isTicketMenuOpen && "rotate-180",
                  )}
                />
              </button>
              {isTicketMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 rounded-xl border border-white/10 bg-black/90 p-1 backdrop-blur-xl shadow-2xl animate-fadeIn">
                  <Link
                    to="/v2/shop"
                    onClick={() => setIsTicketMenuOpen(false)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold text-white/70 hover:bg-white/5 hover:text-emerald-400 transition-all"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/5 overflow-hidden p-0.5">
                      <img
                        src="/assets/icon_inventory_wallet.png"
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    </div>
                    교환소
                  </Link>
                  <Link
                    to="/v2/inventory"
                    onClick={() => setIsTicketMenuOpen(false)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold text-white/70 hover:bg-white/5 hover:text-emerald-400 transition-all"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/5 overflow-hidden p-0.5">
                      <span className="text-sm">🎒</span>
                    </div>
                    인벤토리
                  </Link>
                  <button
                    onClick={() =>
                      handleMenuNavigation("https://ccc-010.com", true)
                    }
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-bold text-white/70 hover:bg-white/5 hover:text-[#FFCC00] transition-all"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/5">
                      <img
                        src="/assets/logo_cc_v2.png"
                        alt="CC"
                        className="w-3.5 h-3.5 object-contain"
                      />
                    </div>
                    씨씨이동
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Inbox + Sound */}
          <div className="flex items-center gap-2 shrink-0">
            <GoldenHourTimer
              remainingSeconds={ghRemainingSeconds}
              multiplier={ghMultiplier}
            />
            <InboxButton />
            <button
              onClick={handleSoundToggle}
              aria-label={isMuted ? "사운드 켜기" : "사운드 끄기"}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-emerald-800 bg-slate-900 transition-colors relative group shadow-lg active:scale-95"
            >
              <img
                src="/assets/icon_megaphone.png"
                alt="Sound"
                className={clsx(
                  "w-5 h-5 object-contain transition-all duration-300",
                  isMuted ? "opacity-30 grayscale" : "opacity-100 scale-110",
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

        {/* Mobile: Vault + Tickets */}
        <div className="sm:hidden flex items-center gap-2 px-4 pb-3">
          <Link
            to="/v2/vault"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all active:scale-95 bg-white/5 border-white/10"
          >
            <img
              src="/assets/asset_coin_gold.png"
              alt="Coin"
              className="w-5 h-5 object-contain"
            />
            <span className="text-sm font-black text-white">
              {vaultBalance.toLocaleString()}원
            </span>
          </Link>
          <div className="flex-1 relative" ref={mobileMenuRef}>
            <button
              onClick={handleTicketClick}
              className={clsx(
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all active:scale-95",
                isTicketMenuOpen
                  ? "bg-white/10 border-emerald-500/50"
                  : "bg-white/5 border-white/10",
              )}
            >
              <img
                src="/assets/asset_ticket_green.png"
                alt="Ticket"
                className="w-5 h-5 object-contain"
              />
              <span className="text-sm font-black text-white/90">
                {ticketCount}
              </span>
              <ChevronDown
                size={14}
                className={clsx(
                  "text-white/30 transition-transform",
                  isTicketMenuOpen && "rotate-180",
                )}
              />
            </button>
            {isTicketMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 z-[60] rounded-xl border border-white/10 bg-black/95 p-1 backdrop-blur-2xl shadow-2xl animate-fadeIn">
                <Link
                  to="/v2/shop"
                  onClick={() => setIsTicketMenuOpen(false)}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-white/70 active:bg-white/10"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/5 overflow-hidden p-0.5">
                    <img
                      src="/assets/icon_inventory_wallet.png"
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  </div>
                  교환소
                </Link>
                <Link
                  to="/v2/inventory"
                  onClick={() => setIsTicketMenuOpen(false)}
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-white/70 active:bg-white/10 border-t border-white/5"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/5 overflow-hidden p-0.5">
                    <span className="text-sm">🎒</span>
                  </div>
                  인벤토리
                </Link>
                <button
                  onClick={() =>
                    handleMenuNavigation("https://ccc-010.com", true)
                  }
                  className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-white/70 active:bg-white/10 border-t border-white/5"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/5 overflow-hidden p-0.5">
                    <img
                      src="/assets/logo_cc_v2.png"
                      alt="CC"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  씨씨이동
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      {isGoldenHourModalOpen && isGoldenHourActive && (
        <GoldenHourPopup
          onClose={() => setIsGoldenHourModalOpen(false)}
          multiplier={ghMultiplier}
        />
      )}
      {attendance_streak_enabled && isStreakModalOpen && streakInfo && (
        <V2StreakModalContainer
          open={isStreakModalOpen}
          onClose={() => setIsStreakModalOpen(false)}
          currentStreak={streakInfo.current_streak ?? 0}
          claimableDay={streakInfo.claimable_rewards?.[0] ?? null}
        />
      )}
      <AnimatePresence>
        {isVipModalOpen && (
          <VipPromotionModal key="vip-promo" onClose={handleVipModalClose} />
        )}
        {isVipEligibilityModalOpen && (
          <VipEligibilityModal
            key="vip-eligibility"
            onClose={handleVipEligibilityModalClose}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default V2AppHeader;

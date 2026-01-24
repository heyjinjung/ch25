import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  Crown,
  Flame,
  Gift,
  Hourglass,
  Inbox,
  ShieldCheck,
  Sparkles,
  Ticket,
  Vault,
  Wallet,
} from "lucide-react";
import clsx from "clsx";
import { useHaptic } from "../hooks/useHaptic";
import { useMissionStore } from "../stores/missionStore";
import { getVaultStatus } from "../api/vaultApi";
import { getUiConfig } from "../api/uiConfigApi";
import { useLotteryStatus } from "../hooks/useLottery";
import { useToast } from "../components/common/ToastProvider";
import { requestTrialGrant } from "../api/trialGrantApi";
import { useAuth } from "../auth/authStore";
import AttendanceStreakModal from "../components/modal/AttendanceStreakModal";
import VipPromotionModal from "../components/modal/VipPromotionModal";
import VipEligibilityModal from "../components/modal/VipEligibilityModal";
import GoldenHourPopup from "../components/events/GoldenHourPopup";
import NewUserWelcomeModal from "../components/modal/NewUserWelcomeModal";
import StarterMissionsModal from "../components/modal/StarterMissionsModal";
import InboxModal from "../components/common/InboxModal";
import VaultModal from "../components/vault/VaultModal";

import WithdrawalConditionsModal from "../components/modal/WithdrawalConditionsModal";
import WithdrawalProgressModal from "../components/modal/WithdrawalProgressModal";
import LotteryCollectionModal from "../components/lottery/LotteryCollectionModal";
import LimitedOfferModal from "../components/modal/LimitedOfferModal";
import SeasonPassPromoModal from "../components/modal/SeasonPassPromoModal";
import TicketZeroRetentionModal from "../components/modal/TicketZeroRetentionModal";
import {
  DEFAULT_EVENT_MODALS_CONFIG,
  mergeEventModalsConfig,
  ModalKey,
  EventModalCardConfig,
  EventModalSectionConfig,
} from "../config/eventModalsConfig";
type EventCard = EventModalCardConfig & {
  meta?: string;
  icon: React.ReactNode;
  accent: string;
};

const CONFIG_KEY = "event_modals_hub";

const EventModalsPage: React.FC = () => {
  const navigate = useNavigate();
  const { impact } = useHaptic();
  const { addToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeModal, setActiveModal] = useState<ModalKey | null>(null);
  const [isRequestingTrial, setIsRequestingTrial] = useState(false);

  const {
    streakInfo,
    streakRules,
    fetchMissions,
    fetchStreakRules,
    claimStreakReward,
  } = useMissionStore();

  useEffect(() => {
    fetchMissions();
    fetchStreakRules();
  }, [fetchMissions, fetchStreakRules]);

  const { data: vault } = useQuery({
    queryKey: ["vault-status"],
    queryFn: getVaultStatus,
    staleTime: 30_000,
    retry: false,
  });

  const { data: eventConfig } = useQuery({
    queryKey: ["ui-config", CONFIG_KEY],
    queryFn: () => getUiConfig(CONFIG_KEY),
  });

  const { data: lotteryStatus } = useLotteryStatus();

  const currentStreak = streakInfo?.streak_days ?? 0;
  const claimableDay = streakInfo?.claimable_day ?? null;
  const rulesList = Array.isArray(streakRules) ? streakRules : [];
  const vaultBalance = vault?.vaultBalance ?? 0;
  const goldenHourMultiplier = vault?.golden_hour_multiplier ?? 2;

  const lotteryCollection = useMemo(
    () => ({
      C1: lotteryStatus?.collectionProgress?.C1 ?? 0,
      C2: lotteryStatus?.collectionProgress?.C2 ?? 0,
      J: lotteryStatus?.collectionProgress?.J ?? 0,
      M: lotteryStatus?.collectionProgress?.M ?? 0,
    }),
    [lotteryStatus]
  );

  const closeModal = () => setActiveModal(null);

  const openModal = (key: ModalKey) => {
    impact("medium");
    setActiveModal(key);
  };

  const handleStreakClaim = async () => {
    const success = await claimStreakReward();
    if (success) {
      addToast("보상???�득?�습?�다!", "success");
      await queryClient.invalidateQueries({ queryKey: ["streak-rules"] });
      await fetchMissions();
      return true;
    }
    addToast("보상 ?�득 ?�패", "error");
    return false;
  };

  const handleRequestTrial = async () => {
    if (isRequestingTrial) return;
    setIsRequestingTrial(true);
    try {
      const res = await requestTrialGrant({ token_type: "ROULETTE_COIN" });
      if (res.result === "OK" && res.granted > 0) {
        addToast(`체험 ?�켓 ${res.granted}�?지급되?�습?�다.`, "success");
        queryClient.invalidateQueries({ queryKey: ["vault-status"] });
        closeModal();
      } else {
        addToast("?�재??체험 ?�켓??받을 ???�습?�다.", "error");
      }
    } catch (error: any) {
      const message = error?.response?.data?.detail || "?�청 처리 �??�류가 발생?�습?�다.";
      addToast(message, "error");
    } finally {
      setIsRequestingTrial(false);
    }
  };

  const resolvedConfig = useMemo(
    () => mergeEventModalsConfig(eventConfig?.value ?? DEFAULT_EVENT_MODALS_CONFIG),
    [eventConfig]
  );

  const badgeOverrides: Partial<Record<ModalKey, string>> = {
    streak: claimableDay ? "보상 가?? : "진행 �?,
    "golden-hour": vault?.is_golden_hour_active ? "LIVE" : "?�내",
  };

  const metaOverrides: Partial<Record<ModalKey, string>> = {
    streak: `?�재 ${currentStreak}???�속 · ?�음 Day ${Math.min(currentStreak + 1, 7)}`,
    "golden-hour": `?�립 배율 ${goldenHourMultiplier}x`,
    "vip-promo": user?.segment === "VIP" ? "VIP ?�용" : "VIP ?�내",
    "vip-eligibility": "?�격 조건 ?�인",
    "vault-info": "금고 ?�보",
    "withdrawal-conditions": "조건 체크",
    "withdrawal-progress": "진행 ?�태",
    "ticket-zero": "리커버리 ?�로??,
    "lottery-collection": `C1 ${lotteryCollection.C1} · C2 ${lotteryCollection.C2} · J ${lotteryCollection.J} · M ${lotteryCollection.M}`,
    "limited-offer": "?�???�일",
    "season-pass": "?�리미엄 ?�택",
    inbox: "?�신??,
  };

  const cardDecor: Record<ModalKey, { icon: React.ReactNode; accent: string }> = {
    streak: { icon: <Flame size={20} className="text-amber-300" />, accent: "from-amber-500/20 via-transparent to-transparent" },
    "golden-hour": { icon: <Hourglass size={20} className="text-amber-200" />, accent: "from-yellow-400/20 via-transparent to-transparent" },
    "vip-promo": { icon: <Crown size={20} className="text-amber-300" />, accent: "from-amber-500/20 via-transparent to-transparent" },
    "vip-eligibility": { icon: <ShieldCheck size={20} className="text-orange-300" />, accent: "from-orange-500/20 via-transparent to-transparent" },
    "new-user": { icon: <Sparkles size={20} className="text-emerald-300" />, accent: "from-emerald-500/20 via-transparent to-transparent" },
    "starter-missions": { icon: <Gift size={20} className="text-teal-300" />, accent: "from-teal-500/20 via-transparent to-transparent" },
    "vault-info": { icon: <Vault size={20} className="text-emerald-300" />, accent: "from-emerald-500/20 via-transparent to-transparent" },
    "withdrawal-conditions": { icon: <Wallet size={20} className="text-lime-300" />, accent: "from-lime-500/20 via-transparent to-transparent" },
    "withdrawal-progress": { icon: <Banknote size={20} className="text-emerald-200" />, accent: "from-emerald-400/20 via-transparent to-transparent" },
    "ticket-zero": { icon: <Ticket size={20} className="text-amber-300" />, accent: "from-ambergo-500/20 via-transparent to-transparent" }, "lottery-collection": { icon: <Gift size={20} className="text-yellow-300" />, accent: "from-yellow-500/20 via-transparent to-transparent" },
    "limited-offer": { icon: <Sparkles size={20} className="text-indigo-300" />, accent: "from-indigo-500/20 via-transparent to-transparent" }, "season-pass": { icon: <Crown size={20} className="text-amber-300" />, accent: "from-amber-500/20 via-transparent to-transparent" },
    inbox: { icon: <Inbox size={20} className="text-emerald-300" />, accent: "from-emerald-500/20 via-transparent to-transparent" },
  };

  const orderedSections = useMemo<EventModalSectionConfig[]>(() => {
    return [...resolvedConfig.sections]
      .filter((section) => section.enabled !== false)
      .sort((a, b) => a.order - b.order);
  }, [resolvedConfig.sections]);

  const sectionIds = useMemo(() => new Set(orderedSections.map((section) => section.id)), [orderedSections]);
  const fallbackSectionId = orderedSections[0]?.id;

  const orderedCards = useMemo<EventCard[]>(() => {
    return [...resolvedConfig.cards]
      .filter((card) => card.enabled !== false)
      .map((card) => ({
        ...card,
        sectionId: sectionIds.has(card.sectionId) && card.sectionId ? card.sectionId : fallbackSectionId || card.sectionId,
        icon: cardDecor[card.key].icon,
        accent: cardDecor[card.key].accent,
        badge: card.badge && card.badge.trim() ? card.badge : badgeOverrides[card.key],
        meta: metaOverrides[card.key],
      }))
      .sort((a, b) => a.order - b.order);
  }, [resolvedConfig.cards, sectionIds, fallbackSectionId, cardDecor, badgeOverrides, metaOverrides]);

  const sections = orderedSections
    .map((section) => ({
      ...section,
      items: orderedCards.filter((card) => card.sectionId === section.id),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="sticky top-0 z-20 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/50 hover:text-white transition-colors"
            aria-label="?�로가�?
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/30">EVENTS</span>
            <h1 className="text-lg font-black text-white">{resolvedConfig.title}</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-4" data-tour="event-modal-list">
        <div className="space-y-6">
          {sections.map((section, sectionIndex) => (
            <motion.section
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.1 }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white">{section.title}</h3>
                  <p className="text-[11px] text-white/40 mt-0.5">{section.subtitle}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent overflow-hidden backdrop-blur-sm">
                {section.items.map((card, cardIndex) => (
                  <motion.button
                    key={card.key}
                    type="button"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: sectionIndex * 0.1 + cardIndex * 0.05 }}
                    whileHover={{
                      scale: 1.01,
                      x: 4,
                      backgroundColor: "rgba(255,255,255,0.04)"
                    }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      impact("heavy");
                      openModal(card.key);
                    }}
                    className={clsx(
                      "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all relative group",
                      cardIndex < section.items.length - 1 && "border-b border-white/5"
                    )}
                  >
                    {/* Hover gradient effect */}
                    <div
                      className={clsx(
                        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                        "bg-gradient-to-r",
                        card.accent
                      )}
                    />

                    {/* Icon with glow */}
                    <div className="relative z-10 flex-shrink-0">
                      <div className="w-11 h-11 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center relative overflow-hidden group-hover:border-emerald-500/30 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        {card.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-white truncate">{card.title}</p>
                        {card.badge && (
                          <motion.span
                            animate={
                              card.badge === "LIVE"
                                ? { scale: [1, 1.1, 1] }
                                : card.badge === "NEW"
                                  ? { y: [0, -2, 0] }
                                  : {}
                            }
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className={clsx(
                              "inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                              card.badge === "LIVE"
                                ? "bg-red-500/20 border border-red-500/40 text-red-300"
                                : "bg-white/10 border border-white/20 text-white/60"
                            )}
                          >
                            {card.badge}
                          </motion.span>
                        )}
                      </div>
                      {card.meta && (
                        <p className="text-[11px] text-white/50 mt-0.5 truncate">{card.meta}</p>
                      )}
                    </div>

                    {/* Arrow indicator */}
                    <motion.div
                      className="relative z-10 flex-shrink-0"
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </motion.div>
                  </motion.button>
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      </div>

      {activeModal === "streak" && (
        <AttendanceStreakModal
          onClose={closeModal}
          onClaim={handleStreakClaim}
          currentStreak={currentStreak}
          claimableDay={claimableDay}
          rules={rulesList}
        />
      )}

      {activeModal === "golden-hour" && (
        <GoldenHourPopup onClose={closeModal} multiplier={goldenHourMultiplier} />
      )}

      {activeModal === "vip-promo" && <VipPromotionModal onClose={closeModal} />}
      {activeModal === "vip-eligibility" && <VipEligibilityModal onClose={closeModal} />}

      {activeModal === "new-user" && (
        <NewUserWelcomeModal onClose={closeModal} onClaimSuccess={closeModal} />
      )}

      {activeModal === "starter-missions" && <StarterMissionsModal onClose={closeModal} />}

      {activeModal === "inbox" && <InboxModal onClose={closeModal} />}

      <VaultModal open={activeModal === "vault-info"} onClose={closeModal} />


      {activeModal === "withdrawal-conditions" && (
        <WithdrawalConditionsModal
          onClose={closeModal}
          vaultBalance={vault?.vaultAmountAvailable ?? vaultBalance}
          dailyPlayCount={vault?.dailyPlayCount ?? 0}
          dailyPlayTarget={vault?.dailyPlayTarget ?? 30}
          dailyVaultSpent={vault?.dailyVaultSpent ?? 0}
          dailyVaultSpentTarget={vault?.dailyVaultSpentTarget ?? 10000}
          dailyDepositConfirmed={vault?.dailyDepositConfirmed ?? false}
        />
      )}

      {activeModal === "withdrawal-progress" && (
        <WithdrawalProgressModal
          onClose={closeModal}
          vaultBalance={vault?.vaultAmountAvailable ?? vaultBalance}
          dailyPlayCount={vault?.dailyPlayCount ?? 0}
          dailyPlayTarget={vault?.dailyPlayTarget ?? 30}
          dailyVaultSpent={vault?.dailyVaultSpent ?? 0}
          dailyVaultSpentTarget={vault?.dailyVaultSpentTarget ?? 10000}
          dailyDepositConfirmed={vault?.dailyDepositConfirmed ?? false}
          withdrawalCount={vault?.withdrawalCount ?? 0}
        />
      )}

      <LotteryCollectionModal
        open={activeModal === "lottery-collection"}
        onClose={closeModal}
        collection={lotteryCollection}
      />

      {activeModal === "limited-offer" && <LimitedOfferModal onClose={closeModal} />}
      {activeModal === "season-pass" && <SeasonPassPromoModal onClose={closeModal} />}

      {activeModal === "ticket-zero" && (
        <TicketZeroRetentionModal
          vaultBalance={vaultBalance}
          trialEnabled
          isRequestingTrial={isRequestingTrial}
          onClose={closeModal}
          onGoVault={() => {
            closeModal();
            navigate("/vault");
          }}
          onRequestTrial={handleRequestTrial}
        />
      )}
    </div>
  );
};

export default EventModalsPage;

import React, { useEffect, useMemo, useState } from "react";
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
      addToast("보상을 획득했습니다!", "success");
      await queryClient.invalidateQueries({ queryKey: ["streak-rules"] });
      await fetchMissions();
      return true;
    }
    addToast("보상 획득 실패", "error");
    return false;
  };

  const handleRequestTrial = async () => {
    if (isRequestingTrial) return;
    setIsRequestingTrial(true);
    try {
      const res = await requestTrialGrant({ token_type: "ROULETTE_COIN" });
      if (res.result === "OK" && res.granted > 0) {
        addToast(`체험 티켓 ${res.granted}개 지급되었습니다.`, "success");
        queryClient.invalidateQueries({ queryKey: ["vault-status"] });
        closeModal();
      } else {
        addToast("현재는 체험 티켓을 받을 수 없습니다.", "error");
      }
    } catch (error: any) {
      const message = error?.response?.data?.detail || "요청 처리 중 오류가 발생했습니다.";
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
    streak: claimableDay ? "보상 가능" : "진행 중",
    "golden-hour": vault?.is_golden_hour_active ? "LIVE" : "안내",
  };

  const metaOverrides: Partial<Record<ModalKey, string>> = {
    streak: `현재 ${currentStreak}일 연속 · 다음 Day ${Math.min(currentStreak + 1, 7)}`,
    "golden-hour": `적립 배율 ${goldenHourMultiplier}x`,
    "vip-promo": user?.segment === "VIP" ? "VIP 전용" : "VIP 안내",
    "vip-eligibility": "자격 조건 확인",
    "vault-info": "금고 정보",
    "withdrawal-conditions": "조건 체크",
    "withdrawal-progress": "진행 상태",
    "ticket-zero": "리커버리 플로우",
    "lottery-collection": `C1 ${lotteryCollection.C1} · C2 ${lotteryCollection.C2} · J ${lotteryCollection.J} · M ${lotteryCollection.M}`,
    "limited-offer": "타임 세일",
    "season-pass": "프리미엄 혜택",
    inbox: "수신함",
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
            aria-label="뒤로가기"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/30">EVENTS</span>
            <h1 className="text-lg font-black text-white">{resolvedConfig.title}</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">{section.title}</h3>
                  <p className="text-xs text-white/40">{section.subtitle}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {section.items.map((card) => (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() => openModal(card.key)}
                    className={clsx(
                      "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left transition-all",
                      "hover:-translate-y-0.5 hover:border-emerald-500/40 hover:bg-white/[0.04]"
                    )}
                  >
                    <div
                      className={clsx(
                        "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                        "bg-gradient-to-br",
                        card.accent
                      )}
                    />
                    <div className="relative z-10 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                          {card.icon}
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">{card.title}</p>
                          {card.badge && (
                            <span className="mt-1 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black text-white/50 uppercase tracking-widest">
                              {card.badge}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-300">열기</span>
                    </div>
                    <p className="relative z-10 mt-3 text-sm text-white/55 leading-relaxed">{card.description}</p>
                    {card.meta && (
                      <div className="relative z-10 mt-3 flex items-center gap-2 text-[11px] font-bold text-white/40">
                        {card.meta}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
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

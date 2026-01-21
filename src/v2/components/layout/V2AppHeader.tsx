// src/v2/components/layout/V2AppHeader.tsx
import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../../auth/authStore";
import { useQuery } from "@tanstack/react-query";
import { getVaultStatus } from "../../../api/vaultApi";

import GoldenHourPopup from "../../../components/events/GoldenHourPopup";
import VipPromotionModal from "../../../components/modal/VipPromotionModal";
import VipEligibilityModal from "../../../components/modal/VipEligibilityModal";
import { AnimatePresence } from "framer-motion";
import { useModalVisibility } from "../../hooks/useModalVisibility";
import { V2StreakModalContainer } from "../mission";
import { useV2Missions } from "../../hooks/useV2Mission";

const V2AppHeader: React.FC = () => {
  const { user } = useAuth();
  const [, setIsTicketMenuOpen] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [isGoldenHourModalOpen, setIsGoldenHourModalOpen] = useState(false);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [isVipEligibilityModalOpen, setIsVipEligibilityModalOpen] =
    useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);

  // V2 API 사용
  const { data: missionsData } = useV2Missions();
  const streakInfo = missionsData?.streak_info;

  // 모달 가시성 제어 (어드민)
  const { attendance_streak_enabled } = useModalVisibility();

  const { data: vault } = useQuery<any>({
    queryKey: ["vault-status"],
    queryFn: getVaultStatus,
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

  useEffect(() => {
    if (isGoldenHourActive) {
      const hasSeen = sessionStorage.getItem("gh_popup_seen");
      if (!hasSeen) {
        setIsGoldenHourModalOpen(true);
        sessionStorage.setItem("gh_popup_seen", "true");
      }
    }
  }, [isGoldenHourActive]);

  // V2: Admin Forced Modal Logic + Auto-show for claimable rewards
  const showModalOverride = vault?.showModalOverride;
  useEffect(() => {
    if (!attendance_streak_enabled) return; // 어드민에서 OFF 시 무시

    const hasClaimable = (streakInfo?.claimable_rewards?.length ?? 0) > 0;
    const claimableDay = streakInfo?.claimable_rewards?.[0];

    // 어드민 강제 노출
    if (showModalOverride === "STREAK_ATTENDANCE") {
      const key = `forced_modal_${showModalOverride}`;
      if (!sessionStorage.getItem(key)) {
        setIsStreakModalOpen(true);
        sessionStorage.setItem(key, "true");
      }
    }
    // 자동 노출 (클레임 가능한 보상이 있을 때)
    else if (hasClaimable && claimableDay) {
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
      sessionStorage.setItem(`vip_promo_seen_${user.id}`, "true");
    }
    setIsVipModalOpen(false);
  };

  const handleVipEligibilityModalClose = () => {
    if (user?.id) {
      sessionStorage.setItem(`vip_eligibility_seen_${user.id}`, "true");
    }
    setIsVipEligibilityModalOpen(false);
  };

  // ... (나머지 헤더 UI 로직은 기존 AppHeader와 동일)

  return (
    <>
      {/* 기존 헤더 UI 생략 (AppHeader와 동일) */}

      {/* Golden Hour Popup */}
      {isGoldenHourModalOpen && isGoldenHourActive && (
        <GoldenHourPopup
          onClose={() => setIsGoldenHourModalOpen(false)}
          multiplier={ghMultiplier}
        />
      )}

      {/* V2 Attendance Streak Modal (어드민 제어 적용) */}
      {attendance_streak_enabled && isStreakModalOpen && streakInfo && (
        <V2StreakModalContainer
          open={isStreakModalOpen}
          onClose={() => setIsStreakModalOpen(false)}
          currentStreak={streakInfo.current_streak ?? 0}
          claimableDay={streakInfo.claimable_rewards?.[0] ?? null}
        />
      )}

      {/* VIP Modals */}
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

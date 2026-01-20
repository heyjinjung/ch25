// src/v2/components/mission/V2StreakModalContainer.tsx
import React from "react";
import {
  useV2StreakRules,
  useV2ClaimStreakReward,
} from "../../hooks/useV2Mission";
import V2StreakModal from "./V2StreakModal";

interface V2StreakModalContainerProps {
  open: boolean;
  onClose: () => void;
  currentStreak: number;
  claimableDay?: number | null;
}

/**
 * V2 Streak Modal Container
 * - V2 API/Hooks와 연결
 * - 스트릭 규칙 자동 조회
 * - 클레임 로직 처리
 */
const V2StreakModalContainer: React.FC<V2StreakModalContainerProps> = ({
  open,
  onClose,
  currentStreak,
  claimableDay,
}) => {
  const { data: rules = [] } = useV2StreakRules();
  const claimMutation = useV2ClaimStreakReward();

  const handleClaim = async (): Promise<boolean> => {
    try {
      await claimMutation.mutateAsync();
      return true;
    } catch (error) {
      console.error("[V2StreakModalContainer] Claim failed:", error);
      return false;
    }
  };

  return (
    <V2StreakModal
      open={open}
      onClose={onClose}
      onClaim={handleClaim}
      currentStreak={currentStreak}
      claimableDay={claimableDay}
      rules={rules}
    />
  );
};

export default V2StreakModalContainer;

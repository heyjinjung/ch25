// src/components/mission/V2StreakModal.tsx
import React from "react";
import V2AttendanceStreakModal from "./V2AttendanceStreakModal";
import type { V2StreakRule } from "../../api/missionApi";

// V2 Wrapper for Streak Modal
interface V2StreakModalProps {
  open: boolean;
  onClose: () => void;
  onClaim?: () => Promise<boolean>;
  currentStreak: number;
  claimableDay?: number | null;
  rules: V2StreakRule[];
}

const V2StreakModal: React.FC<V2StreakModalProps> = ({ open, ...props }) => {
  if (!open) return null;

  return <V2AttendanceStreakModal {...props} />;
};

export default V2StreakModal;

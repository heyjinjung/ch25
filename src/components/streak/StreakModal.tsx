// src/components/streak/StreakModal.tsx
import React from 'react';
import AttendanceStreakModal from '../modal/AttendanceStreakModal';
import { StreakRule } from '../../api/streakApi';

// Wrapper to adapt API types to UI component props
interface StreakModalProps {
    open: boolean;
    onClose: () => void;
    onClaim?: () => Promise<boolean>;
    currentStreak: number;
    claimableDay?: number | null;
    rules: StreakRule[];
}

const StreakModal: React.FC<StreakModalProps> = ({ open, ...props }) => {
    if (!open) return null;
    
    // Cast rules to any to bypass local interface mismatch (identical structure)
    return <AttendanceStreakModal {...props} rules={props.rules as any} />;
};

export default StreakModal;

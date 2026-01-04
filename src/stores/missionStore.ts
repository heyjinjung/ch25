import { create } from 'zustand';
import apiClient from '../api/apiClient';
import type { StreakInfo } from '../types/streak';

const generateIdempotencyKey = (missionId: number) => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    const rand = Math.random().toString(16).slice(2);
    return `mission-${missionId}-${Date.now()}-${rand}`;
};

export interface Mission {
    id: number;
    title: string;
    description?: string;
    category: 'DAILY' | 'WEEKLY' | 'NEW_USER' | 'SPECIAL';
    target_value: number;
    reward_type: string;
    reward_amount: number;
    xp_reward: number;
    logic_key: string;
    action_type?: string;
    start_time?: string | null;
    end_time?: string | null;
    auto_claim?: boolean;
    requires_approval?: boolean;
    is_active?: boolean;
}

export interface MissionProgress {
    current_value: number;
    is_completed: boolean;
    is_claimed: boolean;
}

export interface MissionData {
    mission: Mission;
    progress: MissionProgress;
}

interface MissionState {
    missions: MissionData[];
    isLoading: boolean;
    error: string | null;
    hasUnclaimed: boolean;
    streakInfo: StreakInfo | null;
    fetchMissions: () => Promise<void>;
    setStreakInfo: (streakInfo: StreakInfo | null) => void;
    claimReward: (missionId: number) => Promise<{ success: boolean; reward_type?: string; amount?: number; message?: string }>;
}

export const useMissionStore = create<MissionState>((set: any, get: any) => ({
    missions: [],
    isLoading: false,
    error: null,
    hasUnclaimed: false,
    streakInfo: null,

    setStreakInfo: (streakInfo) => {
        set({ streakInfo });
    },

    fetchMissions: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await apiClient.get('/api/mission/');
            const raw = response.data;
            const data: MissionData[] = Array.isArray(raw) ? raw : (raw?.missions ?? []);
            const streakInfo: StreakInfo | null = Array.isArray(raw) ? null : (raw?.streak_info ?? null);

            // Check for any completed but unclaimed missions
            const hasUnclaimed = data.some((item: MissionData) => item.progress.is_completed && !item.progress.is_claimed);

            set({ missions: data, streakInfo, isLoading: false, hasUnclaimed });
        } catch (err: any) {
            console.error("[MissionStore] Fetch failed", err);
            set({ error: err.message, isLoading: false });
        }
    },

    claimReward: async (missionId: number) => {
        try {
            const response = await apiClient.post(`/api/mission/${missionId}/claim`, {}, {
                headers: {
                    "X-Idempotency-Key": generateIdempotencyKey(missionId)
                }
            });
            const { success, reward_type, amount } = response.data;

            if (success) {
                // Update local state to reflect claim
                const currentMissions = get().missions.map((item: MissionData) => {
                    if (item.mission.id === missionId) {
                        return {
                            ...item,
                            progress: { ...item.progress, is_claimed: true }
                        };
                    }
                    return item;
                });

                const hasUnclaimed = currentMissions.some((item: MissionData) => item.progress.is_completed && !item.progress.is_claimed);
                set({ missions: currentMissions, hasUnclaimed });

                return { success: true, reward_type, amount };
            }
            return { success: false, message: "Claim failed" };

        } catch (err: any) {
            console.error("[MissionStore] Claim failed", err);
            return { success: false, message: err.message || "Network Error" };
        }
    }
}));

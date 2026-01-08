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
    streakRules: any[] | null;
    isStreakModalOpen: boolean;
    fetchMissions: () => Promise<void>;
    fetchStreakRules: () => Promise<void>;
    setStreakInfo: (streakInfo: StreakInfo | null) => void;
    setStreakModalOpen: (isOpen: boolean) => void;
    claimReward: (missionId: number) => Promise<{ success: boolean; reward_type?: string; amount?: number; message?: string }>;
    claimStreakReward: () => Promise<boolean>;
}

const mergeStreakInfo = (current: StreakInfo | null, incoming: StreakInfo | null): StreakInfo | null => {
    if (!incoming) return current;

    // Preserve existing claimable_day when backend omits it
    const claimable_day = incoming.claimable_day ?? current?.claimable_day ?? null;
    return { ...incoming, claimable_day };
};

export const useMissionStore = create<MissionState>((set: any, get: any) => ({
    missions: [],
    isLoading: false,
    error: null,
    hasUnclaimed: false,
    streakInfo: null,
    streakRules: null,
    isStreakModalOpen: false,

    setStreakInfo: (streakInfo) => {
        set({ streakInfo: mergeStreakInfo(get().streakInfo, streakInfo) });
    },

    setStreakModalOpen: (isOpen) => {
        set({ isStreakModalOpen: isOpen });
    },

    fetchStreakRules: async () => {
        try {
            const response = await apiClient.get('/api/mission/streak/rules');
            if (Array.isArray(response.data)) {
                set({ streakRules: response.data });
            }
        } catch (err) {
            console.error("[MissionStore] Fetch streak rules failed", err);
        }
    },

    fetchMissions: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await apiClient.get('/api/mission/');
            const raw = response.data;
            const data: MissionData[] = Array.isArray(raw) ? raw : (raw?.missions ?? []);

            // [Defensive] Preserve existing streakInfo if API returns distinct format or missing info
            // This prevents modal flicker/closing if mission reload happens without streak data.
            let newStreakInfo: StreakInfo | null = Array.isArray(raw) ? null : (raw?.streak_info ?? null);
            if (!newStreakInfo && get().streakInfo) {
                newStreakInfo = get().streakInfo;
            }
            newStreakInfo = mergeStreakInfo(get().streakInfo, newStreakInfo);

            // Check for any completed but unclaimed missions
            const hasUnclaimed = data.some((item: MissionData) => item.progress.is_completed && !item.progress.is_claimed);

            set({ missions: data, streakInfo: newStreakInfo, isLoading: false, hasUnclaimed });
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

            let message = err.message || "Network Error";

            // Extract specific backend error message
            if (err.response?.data?.detail) {
                message = err.response.data.detail;
            }

            // Handle "Already claimed" gracefully
            if (message === "Already claimed") {
                // Update local state to reflect it's actually claimed
                const currentMissions = get().missions.map((item: MissionData) => {
                    if (item.mission.id === missionId) {
                        return {
                            ...item,
                            progress: { ...item.progress, is_claimed: true }
                        };
                    }
                    return item;
                });
                set({ missions: currentMissions });
                return { success: true, message: "이미 수령한 보상입니다." };
            }

            return { success: false, message: message };
        }
    },

    claimStreakReward: async () => {
        try {
            const response = await apiClient.post('/api/mission/streak/claim');
            if (response.data.success && response.data.streak_info) {
                // Update streakInfo (preserve claimable_day if missing)
                set({ streakInfo: mergeStreakInfo(get().streakInfo, response.data.streak_info) });
                return true;
            }
            return false;
        } catch (err: any) {
            console.error("[MissionStore] Streak Claim failed", err);
            return false;
        }
    }
}));

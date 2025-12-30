import { create } from 'zustand';
import axios from 'axios';
import { getApiBaseUrl } from '../api/apiConfig';

export interface Mission {
    id: number;
    title: string;
    description?: string;
    category: 'DAILY' | 'WEEKLY' | 'SPECIAL';
    target_value: number;
    reward_type: string;
    reward_amount: number;
    xp_reward: number;
    logic_key: string;
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
    fetchMissions: () => Promise<void>;
    claimReward: (missionId: number) => Promise<boolean>;
}

export const useMissionStore = create<MissionState>((set, get) => ({
    missions: [],
    isLoading: false,
    error: null,
    hasUnclaimed: false,

    fetchMissions: async () => {
        set({ isLoading: true, error: null });
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error("No auth token");

            const response = await axios.get(`${getApiBaseUrl()}/api/mission/`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data: MissionData[] = response.data;

            // Check for any completed but unclaimed missions
            const hasUnclaimed = data.some(item => item.progress.is_completed && !item.progress.is_claimed);

            set({ missions: data, isLoading: false, hasUnclaimed });
        } catch (err: any) {
            console.error("[MissionStore] Fetch failed", err);
            set({ error: err.message, isLoading: false });
        }
    },

    claimReward: async (missionId: number) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${getApiBaseUrl()}/api/mission/${missionId}/claim`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update local state to reflect claim
            const currentMissions = get().missions.map(item => {
                if (item.mission.id === missionId) {
                    return {
                        ...item,
                        progress: { ...item.progress, is_claimed: true }
                    };
                }
                return item;
            });

            const hasUnclaimed = currentMissions.some(item => item.progress.is_completed && !item.progress.is_claimed);
            set({ missions: currentMissions, hasUnclaimed });

            return true;
        } catch (err) {
            console.error("[MissionStore] Claim failed", err);
            return false;
        }
    }
}));

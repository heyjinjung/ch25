// src/api/viralApi.ts
import apiClient from './apiClient';

export interface ViralActionPayload {
    action_type: string;
    mission_id?: number;
    metadata?: Record<string, any>;
}

export const recordViralAction = async (payload: ViralActionPayload) => {
    const response = await apiClient.post('/api/viral/action', payload);
    return response.data;
};

// CloudStorage Helpers
export const getCloudItem = (key: string): Promise<string | null> => {
    return new Promise((resolve) => {
        if (!window.Telegram?.WebApp?.CloudStorage) {
            resolve(null);
            return;
        }
        window.Telegram.WebApp.CloudStorage.getItem(key, (err: any, value: string) => {
            if (err) {
                console.error(`[CloudStorage] Error getting ${key}:`, err);
                resolve(null);
            } else {
                resolve(value || null);
            }
        });
    });
};

export const setCloudItem = (key: string, value: string): Promise<boolean> => {
    return new Promise((resolve) => {
        if (!window.Telegram?.WebApp?.CloudStorage) {
            resolve(false);
            return;
        }
        window.Telegram.WebApp.CloudStorage.setItem(key, value, (err: any, success: boolean) => {
            if (err) {
                console.error(`[CloudStorage] Error setting ${key}:`, err);
                resolve(false);
            } else {
                resolve(success);
            }
        });
    });
};

export const verifyChannelSubscription = async (missionId: number, channelUsername?: string) => {
    const response = await apiClient.post('/api/viral/verify/channel', {
        mission_id: missionId,
        channel_username: channelUsername,
    });
    return response.data;
};

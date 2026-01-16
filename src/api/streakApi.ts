// src/api/streakApi.ts
import apiClient from './apiClient';

export interface StreakReward {
    kind: "WALLET" | "INVENTORY";
    token_type?: string;
    item_type?: string;
    amount: number;
}

export interface StreakRule {
    day: number;
    enabled: boolean;
    grants: StreakReward[];
}

export const fetchStreakRules = async (): Promise<StreakRule[]> => {
    const { data } = await apiClient.get<StreakRule[]>('/mission/streak/rules');
    return data;
};

export const claimStreakReward = async (): Promise<{ success: boolean; message?: string }> => {
    const { data } = await apiClient.post('/mission/streak/claim');
    return data;
};


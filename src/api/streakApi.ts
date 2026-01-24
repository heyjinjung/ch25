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
    const { data } = await apiClient.get('/api/mission/streak/rules');
    if (Array.isArray(data)) return data as StreakRule[];
    const maybeRules = (data as { rules?: StreakRule[] } | null | undefined)?.rules;
    return Array.isArray(maybeRules) ? maybeRules : [];
};

export const claimStreakReward = async (): Promise<{ success: boolean; message?: string }> => {
    const { data } = await apiClient.post('/api/mission/streak/claim');
    return data;
};


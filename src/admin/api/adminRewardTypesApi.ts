// src/admin/api/adminRewardTypesApi.ts
import { adminApi } from "./httpClient";

export interface RewardTypeDefinition {
    key: string;
    display_name: string;
    icon: string;
    color: string;
    category: string;
    description: string;
}

export interface RewardTypesListResponse {
    reward_types: RewardTypeDefinition[];
}

export const fetchRewardTypes = async (): Promise<RewardTypeDefinition[]> => {
    const response = await adminApi.get<RewardTypesListResponse>("/admin/api/reward-types");
    return response.data.reward_types;
};

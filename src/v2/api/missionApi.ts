// src/v2/api/missionApi.ts
import userApi from "../../api/httpClient";

// ============================================================================
// Mission API
// ============================================================================

export interface MissionDto {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly reward_type: string;
  readonly reward_amount: number;
  readonly progress: number;
  readonly target: number;
  readonly is_completed: boolean;
  readonly is_claimed: boolean;
}

export interface StreakRuleDto {
  readonly day: number;
  readonly reward_type: string;
  readonly reward_amount: number;
}

export interface StreakInfoDto {
  readonly current_streak: number;
  readonly today_completed: boolean;
  readonly last_completed_date: string | null;
  readonly claimable_rewards: number[];
}

export interface MissionListResponse {
  readonly missions: MissionDto[];
  readonly streak_info: StreakInfoDto;
}

export interface ClaimMissionResponse {
  readonly success: boolean;
  readonly reward_type: string;
  readonly reward_amount: number;
  readonly message?: string;
}

export interface ClaimStreakResponse {
  readonly success: boolean;
  readonly rewards: Array<{
    reward_type: string;
    reward_amount: number;
  }>;
  readonly new_streak: number;
}

export const getV2Missions = async (): Promise<MissionListResponse> => {
  try {
    const response = await userApi.get<MissionListResponse>("/api/v2/mission/");
    return response.data;
  } catch (error) {
    console.error("[missionApi] Failed to fetch V2 missions", error);
    throw error;
  }
};

export const claimV2Mission = async (missionId: string): Promise<ClaimMissionResponse> => {
  try {
    const response = await userApi.post<ClaimMissionResponse>(`/api/v2/mission/${missionId}/claim`);
    return response.data;
  } catch (error) {
    console.error("[missionApi] Failed to claim V2 mission", error);
    throw error;
  }
};

export const claimV2DailyGift = async (): Promise<ClaimMissionResponse> => {
  try {
    const response = await userApi.post<ClaimMissionResponse>("/api/v2/mission/daily-gift");
    return response.data;
  } catch (error) {
    console.error("[missionApi] Failed to claim V2 daily gift", error);
    throw error;
  }
};

export const getV2StreakRules = async (): Promise<{ rules: StreakRuleDto[] }> => {
  try {
    const response = await userApi.get<{ rules: StreakRuleDto[] }>("/api/v2/mission/streak/rules");
    return response.data;
  } catch (error) {
    console.error("[missionApi] Failed to fetch V2 streak rules", error);
    throw error;
  }
};

export const claimV2StreakReward = async (): Promise<ClaimStreakResponse> => {
  try {
    const response = await userApi.post<ClaimStreakResponse>("/api/v2/mission/streak/claim");
    return response.data;
  } catch (error) {
    console.error("[missionApi] Failed to claim V2 streak reward", error);
    throw error;
  }
};

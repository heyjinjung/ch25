// src/v2/api/missionApi.ts
import { v2Client } from "./client";

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
  readonly amount: number;
}

export interface ClaimStreakResponse {
  readonly success: boolean;
  readonly streak_info: StreakInfoDto;
  readonly grants: Array<{
    kind: string;
    token_type?: string;
    item_type?: string;
    amount: number;
  }>;
}

export const getV2Missions = async (): Promise<MissionListResponse> => {
  try {
    const response =
      await v2Client.get<MissionListResponse>("/api/v2/mission/");
    return response.data;
  } catch (error) {
    console.error("[missionApi] Failed to fetch V2 missions", error);
    throw error;
  }
};

export const claimV2Mission = async (
  missionId: string,
): Promise<ClaimMissionResponse> => {
  try {
    const response = await v2Client.post<ClaimMissionResponse>(
      `/api/v2/mission/${missionId}/claim`,
    );
    return response.data;
  } catch (error) {
    console.error("[missionApi] Failed to claim V2 mission", error);
    throw error;
  }
};

export const claimV2DailyGift = async (): Promise<ClaimMissionResponse> => {
  try {
    const response = await v2Client.post<ClaimMissionResponse>(
      "/api/v2/mission/daily-gift",
    );
    return response.data;
  } catch (error) {
    console.error("[missionApi] Failed to claim V2 daily gift", error);
    throw error;
  }
};

// V2 Streak Rule Schema (matches backend response)
export interface V2StreakRule {
  readonly day: number;
  readonly enabled: boolean;
  readonly grants: Array<{
    readonly kind: "WALLET" | "INVENTORY";
    readonly token_type?: string;
    readonly item_type?: string;
    readonly amount: number;
  }>;
}

export const getV2StreakRules = async (): Promise<V2StreakRule[]> => {
  try {
    const response = await v2Client.get<V2StreakRule[]>(
      "/api/v2/mission/streak/rules",
    );
    return response.data;
  } catch (error) {
    console.error("[missionApi] Failed to fetch V2 streak rules", error);
    throw error;
  }
};

export const claimV2StreakReward = async (): Promise<ClaimStreakResponse> => {
  try {
    const response = await v2Client.post<ClaimStreakResponse>(
      "/api/v2/mission/streak/claim",
    );
    return response.data;
  } catch (error) {
    console.error("[missionApi] Failed to claim V2 streak reward", error);
    throw error;
  }
};

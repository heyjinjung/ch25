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

interface BackendMissionSchema {
  readonly id: number;
  readonly title: string;
  readonly description?: string | null;
  readonly category: string;
  readonly logic_key: string;
  readonly action_type?: string | null;
  readonly target_value: number;
  readonly reward_type: string;
  readonly reward_amount: number;
  readonly xp_reward?: number;
  readonly requires_approval?: boolean;
  readonly start_time?: string | null;
  readonly end_time?: string | null;
  readonly auto_claim?: boolean;
  readonly is_active?: boolean;
}

interface BackendMissionProgressSchema {
  readonly current_value: number;
  readonly is_completed: boolean;
  readonly is_claimed: boolean;
  readonly approval_status?: string;
}

interface BackendMissionWithProgress {
  readonly mission: BackendMissionSchema;
  readonly progress: BackendMissionProgressSchema;
}

interface BackendStreakInfoSchema {
  readonly streak_days: number;
  readonly current_multiplier: number;
  readonly is_hot: boolean;
  readonly is_legend: boolean;
  readonly next_milestone: number;
  readonly claimable_day: number | null;
}

interface BackendMissionListResponse {
  readonly missions: BackendMissionWithProgress[];
  readonly streak_info: BackendStreakInfoSchema;
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

const mapBackendMission = (item: BackendMissionWithProgress): MissionDto => ({
  id: String(item.mission.id),
  title: item.mission.title,
  description: item.mission.description ?? "",
  reward_type: item.mission.reward_type,
  reward_amount: item.mission.reward_amount,
  progress: item.progress.current_value,
  target: item.mission.target_value,
  is_completed: item.progress.is_completed,
  is_claimed: item.progress.is_claimed,
});

const mapBackendStreakInfo = (
  info: BackendStreakInfoSchema,
): StreakInfoDto => ({
  current_streak: info.streak_days,
  today_completed: false,
  last_completed_date: null,
  claimable_rewards: info.claimable_day ? [info.claimable_day] : [],
});

export const getV2Missions = async (): Promise<MissionListResponse> => {
  try {
    const response =
      await v2Client.get<BackendMissionListResponse>("/api/v2/mission/");
    const missions = response.data.missions.map(mapBackendMission);
    const streak_info = mapBackendStreakInfo(response.data.streak_info);
    return { missions, streak_info };
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
      null,
      {
        headers: {
          "X-Idempotency-Key": crypto.randomUUID(),
        },
      },
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

// src/api/missionApi.ts
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
  readonly action_type?: string;
  readonly metadata?: Record<string, unknown>;
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
  // NOTE: Backend schema has drifted over time.
  // - older: streak_days
  // - current: current_streak (serialized as current_streak)
  readonly streak_days?: number;
  readonly current_streak?: number;
  readonly current_multiplier?: number;
  readonly is_hot?: boolean;
  readonly is_legend?: boolean;
  readonly next_milestone?: number;
  readonly claimable_day?: number | null;
  readonly claimable_rewards?: number[];
}

interface BackendMissionListResponse {
  readonly missions: BackendMissionWithProgress[];
  // V2 schema uses serialization_alias="streak" for streak_info
  readonly streak_info?: BackendStreakInfoSchema;
  readonly streak?: BackendStreakInfoSchema;
  readonly new_user_deadline?: string | null;
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
  readonly new_user_deadline?: string;
}

export interface SeasonPassLevelDto {
  readonly level: number;
  readonly required_xp: number;
  readonly reward_type: string;
  readonly reward_amount: number;
  readonly auto_claim: boolean;
  readonly is_unlocked: boolean;
  readonly is_claimed: boolean;
  readonly reward_label: string;
}

export interface SeasonPassStatusResponse {
  readonly season: {
    readonly id: number;
    readonly season_name: string;
    readonly start_date: string;
    readonly end_date: string;
    readonly max_level: number;
    readonly base_xp_per_stamp: number;
  };
  readonly progress: {
    readonly current_level: number;
    readonly current_xp: number;
    readonly total_stamps: number;
    readonly last_stamp_date: string | null;
    readonly next_level_xp: number;
  };
  readonly levels: SeasonPassLevelDto[];
  readonly today: {
    readonly date: string;
    readonly stamped: boolean;
  };
}

export interface LevelXPRowDto {
  readonly level: number;
  readonly required_xp: number;
  readonly reward_type: string;
  readonly reward_amount: number;
  readonly auto_grant: boolean;
  readonly reward_label: string;
  readonly is_unlocked: boolean;
  readonly is_claimed: boolean;
}

export interface LevelXPStatusResponse {
  readonly current_level: number;
  readonly current_xp: number;
  readonly next_level: number | null;
  readonly next_required_xp: number | null;
  readonly xp_to_next: number | null;
  readonly levels: LevelXPRowDto[];
  readonly rewards: any[];
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
  action_type: item.mission.action_type ?? undefined,
  metadata: (item.mission as any).metadata ?? undefined,
});

const mapBackendStreakInfo = (
  info: BackendStreakInfoSchema | null | undefined,
): StreakInfoDto => {
  const currentStreak = info?.current_streak ?? info?.streak_days ?? 0;
  const claimableDay = info?.claimable_day ?? null;
  const claimableRewards =
    info?.claimable_rewards && info.claimable_rewards.length > 0
      ? info.claimable_rewards
      : claimableDay
        ? [claimableDay]
        : [];

  return {
    current_streak: currentStreak,
    today_completed: false,
    last_completed_date: null,
    claimable_rewards: claimableRewards,
  };
};

export const getV2Missions = async (
  category?: string,
): Promise<MissionListResponse> => {
  try {
    const url = category
      ? `/api/v2/mission/?category=${category}`
      : "/api/v2/mission/";
    const response = await v2Client.get<BackendMissionListResponse>(url);
    const missions = response.data.missions.map(mapBackendMission);
    const streak_info = mapBackendStreakInfo(
      response.data.streak_info ?? response.data.streak,
    );
    return {
      missions,
      streak_info,
      new_user_deadline: response.data.new_user_deadline ?? undefined,
    };
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

// ============================================================================
// Season Pass API
// ============================================================================

export const getV2SeasonPassStatus =
  async (): Promise<SeasonPassStatusResponse> => {
    try {
      const response = await v2Client.get<SeasonPassStatusResponse>(
        "/api/season-pass/status",
      );
      return response.data;
    } catch (error) {
      console.error(
        "[missionApi] Failed to fetch V2 season pass status",
        error,
      );
      throw error;
    }
  };

export const claimV2SeasonPassReward = async (
  level: number,
): Promise<ClaimMissionResponse> => {
  try {
    const response = await v2Client.post<ClaimMissionResponse>(
      "/api/season-pass/claim",
      { level },
    );
    return response.data;
  } catch (error) {
    console.error("[missionApi] Failed to claim V2 season pass reward", error);
    throw error;
  }
};

export const getV2LevelXPStatus = async (): Promise<LevelXPStatusResponse> => {
  try {
    const response = await v2Client.get<LevelXPStatusResponse>(
      "/api/level-xp/status",
    );
    return response.data;
  } catch (error) {
    console.error("[missionApi] Failed to fetch V2 Level XP status", error);
    throw error;
  }
};

import userApi from "./httpClient";

export interface LevelXpRewardLog {
  readonly level: number;
  readonly reward_type: string;
  readonly reward_payload?: Record<string, unknown> | null;
  readonly auto_granted: boolean;
  readonly granted_at: string;
  readonly granted_by?: number | null;
}

export interface LevelXpStatusResponse {
  readonly current_level: number;
  readonly current_xp: number;
  readonly next_level?: number | null;
  readonly next_required_xp?: number | null;
  readonly xp_to_next?: number | null;
  readonly rewards: LevelXpRewardLog[];
}

export const getLevelXpStatus = async (): Promise<LevelXpStatusResponse> => {
  const { data } = await userApi.get<LevelXpStatusResponse>("/api/level-xp/status");
  return data;
};

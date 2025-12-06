// src/api/seasonPassApi.ts
import userApi from "./httpClient";

export interface SeasonPassLevelDto {
  readonly level: number;
  readonly required_xp: number;
  readonly reward_label: string;
  readonly is_claimed: boolean;
  readonly is_unlocked: boolean;
}

export interface SeasonPassStatusResponse {
  readonly current_level: number;
  readonly current_xp: number;
  readonly next_level_xp: number;
  readonly max_level: number;
  readonly levels: SeasonPassLevelDto[];
}

export interface ClaimSeasonRewardResponse {
  readonly level: number;
  readonly reward_label: string;
  readonly message?: string;
}

export const getSeasonPassStatus = async (): Promise<SeasonPassStatusResponse> => {
  const response = await userApi.get<SeasonPassStatusResponse>("/season-pass/status");
  return response.data;
};

export const claimSeasonReward = async (level: number): Promise<ClaimSeasonRewardResponse> => {
  const response = await userApi.post<ClaimSeasonRewardResponse>("/season-pass/claim", { level });
  return response.data;
};

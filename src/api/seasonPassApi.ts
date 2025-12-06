// src/api/seasonPassApi.ts
import axios from "axios";
import userApi from "./httpClient";
import { claimFallbackSeasonReward, getFallbackSeasonPassStatus } from "./fallbackData";

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
  try {
    const response = await userApi.get<SeasonPassStatusResponse>("/season-pass/status");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn("[seasonPassApi] Falling back to demo data", error.message);
      return getFallbackSeasonPassStatus();
    }
    throw error;
  }
};

export const claimSeasonReward = async (level: number): Promise<ClaimSeasonRewardResponse> => {
  try {
    const response = await userApi.post<ClaimSeasonRewardResponse>("/season-pass/claim", { level });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn("[seasonPassApi] Falling back to demo claim", error.message);
      return claimFallbackSeasonReward(level);
    }
    throw error;
  }
};

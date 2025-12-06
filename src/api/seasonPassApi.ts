// src/api/seasonPassApi.ts
import axios from "axios";
import userApi from "./httpClient";
import { claimFallbackSeasonReward, getFallbackSeasonPassStatus } from "./fallbackData";
import { isDemoFallbackEnabled } from "../config/featureFlags";

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
      if (isDemoFallbackEnabled) {
        console.warn("[seasonPassApi] Falling back to demo data", error.message);
        return getFallbackSeasonPassStatus();
      }
      throw error;
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
      if (isDemoFallbackEnabled) {
        console.warn("[seasonPassApi] Falling back to demo claim", error.message);
        return claimFallbackSeasonReward(level);
      }
      throw error;
    }
    throw error;
  }
};

export interface AddStampResponse {
  readonly added_stamp: number;
  readonly xp_added: number;
  readonly current_xp: number;
  readonly current_level: number;
  readonly leveled_up: boolean;
  readonly rewards?: { level: number; label: string }[];
  readonly message?: string;
}

export const addSeasonPassStamp = async (
  sourceFeatureType: string,
  xpBonus: number = 0
): Promise<AddStampResponse> => {
  try {
    const response = await userApi.post<AddStampResponse>("/season-pass/stamp", {
      source_feature_type: sourceFeatureType,
      xp_bonus: xpBonus,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (isDemoFallbackEnabled) {
        console.warn("[seasonPassApi] Falling back to demo stamp", error.message);
        return {
          added_stamp: 1,
          xp_added: 50,
          current_xp: 100,
          current_level: 2,
          leveled_up: false,
          message: "Demo stamp added",
        };
      }
      throw error;
    }
    throw error;
  }
};

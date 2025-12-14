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
  readonly auto_claim?: boolean;
}

export interface SeasonPassStatusResponse {
  readonly current_level: number;
  readonly current_xp: number;
  readonly next_level_xp: number;
  readonly max_level: number;
  readonly base_xp_per_stamp?: number;
  readonly levels: SeasonPassLevelDto[];
  readonly today?: { stamped: boolean };
}

export interface InternalWinStatusResponse {
  readonly total_wins: number;
  readonly threshold: number;
  readonly remaining: number;
}

export interface ClaimSeasonRewardResponse {
  readonly level: number;
  readonly reward_label: string;
  readonly message?: string;
}

export const getSeasonPassStatus = async (): Promise<SeasonPassStatusResponse> => {
  try {
    const response = await userApi.get("/api/season-pass/status");
    const raw = response.data as any;
    const currentXp = raw?.progress?.current_xp ?? 0;
    const nextLevelXp = raw?.progress?.next_level_xp ?? currentXp;
    const levels = (raw?.levels ?? []).map((lvl: any) => ({
      level: lvl.level,
      required_xp: lvl.required_xp,
      reward_label: lvl.reward_label ?? `${lvl.reward_type ?? ""} ${lvl.reward_amount ?? ""}`.trim(),
      is_claimed: lvl.is_claimed ?? false,
      is_unlocked: lvl.is_unlocked ?? currentXp >= (lvl.required_xp ?? 0),
      auto_claim: lvl?.auto_claim === true || lvl?.auto_claim === 1,
    })) as SeasonPassLevelDto[];
    return {
      current_level: raw?.progress?.current_level ?? 0,
      current_xp: currentXp,
      next_level_xp: nextLevelXp,
      max_level: raw?.season?.max_level ?? (levels.length > 0 ? Math.max(...levels.map((l) => l.level)) : 0),
      base_xp_per_stamp: raw?.season?.base_xp_per_stamp,
      levels,
      today: raw?.today,
    };
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

export const getInternalWinStatus = async (): Promise<InternalWinStatusResponse> => {
  const { data } = await userApi.get<InternalWinStatusResponse>("/api/season-pass/internal-wins");
  return data;
};

export const claimSeasonReward = async (level: number): Promise<ClaimSeasonRewardResponse> => {
  try {
    const response = await userApi.post<ClaimSeasonRewardResponse>("/api/season-pass/claim", { level });
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
    const response = await userApi.post<AddStampResponse>("/api/season-pass/stamp", {
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

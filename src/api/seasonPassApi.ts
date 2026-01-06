// src/api/seasonPassApi.ts
import axios from "axios";
import userApi from "./httpClient";
import { claimFallbackSeasonReward, getFallbackSeasonPassStatus } from "./fallbackData";
import { isDemoFallbackEnabled } from "../config/featureFlags";

export interface SeasonPassLevelDto {
  readonly level: number;
  readonly required_xp: number;
  readonly reward_label: string;
  readonly reward_type?: string;
  readonly reward_amount?: number;
  readonly is_claimed: boolean;
  readonly is_unlocked: boolean;
  readonly auto_claim?: boolean;
}

export interface SeasonPassSeasonMeta {
  readonly id: number;
  readonly season_name: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly max_level: number;
  readonly base_xp_per_stamp: number;
}

export interface SeasonPassStatusResponse {
  readonly current_level: number;
  readonly current_xp: number;
  readonly next_level_xp: number;
  readonly total_stamps?: number;
  readonly last_stamp_date?: string | null;
  readonly max_level: number;
  readonly base_xp_per_stamp?: number;
  readonly levels: SeasonPassLevelDto[];
  readonly today?: { stamped: boolean; date?: string };
  readonly season?: SeasonPassSeasonMeta;
}

const formatRewardLabel = (rewardType?: string, rewardAmount?: number, rewardLabel?: string) => {
  const type = String(rewardType ?? "").toUpperCase();
  const amount = rewardAmount ?? null;
  if (rewardLabel) return rewardLabel;
  if (!type) return "보상";

  const formattedAmount = typeof amount === "number" && !Number.isNaN(amount) ? amount.toLocaleString() : null;
  if (type === "POINT" || type === "CC_POINT") return `금고 ${formattedAmount ?? ""}`.trim();
  if (type === "GAME_XP" || type === "XP") return `시즌 XP ${formattedAmount ?? ""}`.trim();
  if (type === "DIAMOND") return `다이아 ${formattedAmount ?? ""}`.trim();
  if (type.includes("TICKET")) return `티켓 ${formattedAmount ?? ""}`.trim();
  if (type.includes("GIFTICON")) return `기프티콘 ${formattedAmount ?? ""}`.trim();
  return `${type}${formattedAmount ? ` ${formattedAmount}` : ""}`.trim();
};

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
    const nextLevelXpRaw = raw?.progress?.next_level_xp ?? currentXp;
    const levels = (raw?.levels ?? []).map((lvl: any) => ({
      level: lvl.level,
      required_xp: lvl.required_xp ?? 0,
      reward_type: lvl.reward_type,
      reward_amount: lvl.reward_amount ?? lvl.reward_value,
      reward_label: formatRewardLabel(lvl.reward_type, lvl.reward_amount ?? lvl.reward_value, lvl.reward_label),
      is_claimed: lvl.is_claimed ?? false,
      is_unlocked: lvl.is_unlocked ?? currentXp >= (lvl.required_xp ?? 0),
      auto_claim: lvl?.auto_claim === true || lvl?.auto_claim === 1,
    })) as SeasonPassLevelDto[];
    const sortedLevels = [...levels].sort((a, b) => a.required_xp - b.required_xp);
    const nextRequired = sortedLevels.find((l) => l.required_xp > currentXp)?.required_xp ?? sortedLevels.at(-1)?.required_xp ?? nextLevelXpRaw;
    const safeNextLevelXp = Math.max(nextLevelXpRaw || 0, nextRequired || 0, currentXp || 0, 1);
    return {
      current_level: raw?.progress?.current_level ?? 0,
      current_xp: currentXp,
      next_level_xp: safeNextLevelXp,
      total_stamps: raw?.progress?.total_stamps,
      last_stamp_date: raw?.progress?.last_stamp_date ?? null,
      max_level: raw?.season?.max_level ?? (levels.length > 0 ? Math.max(...levels.map((l) => l.level)) : 0),
      base_xp_per_stamp: raw?.season?.base_xp_per_stamp,
      levels,
      today: raw?.today,
      season: raw?.season
        ? {
            id: raw.season.id,
            season_name: raw.season.season_name,
            start_date: raw.season.start_date,
            end_date: raw.season.end_date,
            max_level: raw.season.max_level,
            base_xp_per_stamp: raw.season.base_xp_per_stamp,
          }
        : undefined,
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

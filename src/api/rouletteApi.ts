// src/api/rouletteApi.ts
import axios from "axios";
import { GameTokenType } from "../types/gameTokens";
import { isDemoFallbackEnabled } from "../config/featureFlags";
import { getFallbackRouletteStatus, playFallbackRoulette } from "./fallbackData";
import userApi from "./httpClient";

interface BackendRouletteSegmentDto {
  readonly id: number;
  readonly label: string;
  readonly reward_type: string;
  readonly reward_amount: number;
  readonly slot_index?: number;
  readonly weight?: number;
  readonly is_jackpot?: boolean;
}

interface BackendRouletteStatusResponse {
  readonly config_id: number;
  readonly name: string;
  readonly max_daily_spins: number;
  readonly today_spins: number;
  readonly remaining_spins: number;
  readonly token_type: GameTokenType;
  readonly token_balance: number;
  readonly segments: BackendRouletteSegmentDto[];
  readonly feature_type: string;
}

export interface RouletteSegmentDto {
  readonly label: string;
  readonly weight?: number;
  readonly isJackpot?: boolean;
  readonly reward_type?: string;
  readonly reward_amount?: number;
  readonly slot_index?: number;
}

export interface RouletteStatusResponse {
  readonly feature_type: string;
  readonly remaining_spins: number;
  readonly segments: RouletteSegmentDto[];
  readonly token_type: GameTokenType;
  readonly token_balance: number;
}

interface BackendRoulettePlayResponse {
  readonly result: string;
  readonly segment: BackendRouletteSegmentDto;
  readonly season_pass?: Record<string, unknown> | null;
}

export interface RoulettePlayResponse {
  readonly selected_index: number;
  readonly segment: RouletteSegmentDto;
  readonly remaining_spins: number;
  readonly reward_type?: string;
  readonly reward_value?: number | string;
  readonly message?: string;
}

export const getRouletteStatus = async (): Promise<RouletteStatusResponse> => {
  try {
    const response = await userApi.get<BackendRouletteStatusResponse>("/api/roulette/status");
    const data = response.data;
    const segments = data.segments
      .map((segment, index) => ({
        label: segment.label,
        weight: segment.weight ?? 1,
        isJackpot: segment.is_jackpot,
        reward_type: segment.reward_type,
        reward_amount: segment.reward_amount,
        slot_index: segment.slot_index ?? index,
      }))
      .sort((a, b) => (a.slot_index ?? 0) - (b.slot_index ?? 0));

    return {
      feature_type: data.feature_type,
      remaining_spins: data.remaining_spins,
      token_type: data.token_type,
      token_balance: data.token_balance,
      segments,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (isDemoFallbackEnabled) {
        console.warn("[rouletteApi] Falling back to demo data", error.message);
        return getFallbackRouletteStatus();
      }
      throw error;
    }
    throw error;
  }
};

export const playRoulette = async (): Promise<RoulettePlayResponse> => {
  try {
    const response = await userApi.post<BackendRoulettePlayResponse>("/api/roulette/play");
    const data = response.data;
    const mappedSegment: RouletteSegmentDto = {
      label: data.segment.label,
      weight: data.segment.weight ?? 1,
      isJackpot: data.segment.is_jackpot,
      reward_type: data.segment.reward_type,
      reward_amount: data.segment.reward_amount,
      slot_index: data.segment.slot_index,
    };
    const selectedIndex = mappedSegment.slot_index ?? 0;

    return {
      selected_index: selectedIndex,
      segment: mappedSegment,
      remaining_spins: 0,
      reward_type: mappedSegment.reward_type,
      reward_value: mappedSegment.reward_amount,
      message: data.result !== "OK" ? data.result : undefined,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (isDemoFallbackEnabled) {
        console.warn("[rouletteApi] Falling back to demo play", error.message);
        return playFallbackRoulette();
      }
      throw error;
    }
    throw error;
  }
};

// src/api/rouletteApi.ts
import axios from "axios";
import userApi from "./httpClient";
import { getFallbackRouletteStatus, playFallbackRoulette } from "./fallbackData";

export interface RouletteSegmentDto {
  readonly label: string;
}

export interface RouletteStatusResponse {
  readonly feature_type: string;
  readonly remaining_spins: number;
  readonly segments: RouletteSegmentDto[];
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
    const response = await userApi.get<RouletteStatusResponse>("/roulette/status");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn("[rouletteApi] Falling back to demo data", error.message);
      return getFallbackRouletteStatus();
    }
    throw error;
  }
};

export const playRoulette = async (): Promise<RoulettePlayResponse> => {
  try {
    const response = await userApi.post<RoulettePlayResponse>("/roulette/play");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn("[rouletteApi] Falling back to demo play", error.message);
      return playFallbackRoulette();
    }
    throw error;
  }
};

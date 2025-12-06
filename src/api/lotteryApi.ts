// src/api/lotteryApi.ts
import axios from "axios";
import userApi from "./httpClient";
import { getFallbackLotteryStatus, playFallbackLottery } from "./fallbackData";

export interface LotteryPrizeDto {
  readonly id: number;
  readonly label: string;
  readonly reward_type: string;
  readonly reward_value: number | string;
  readonly stock?: number | null;
  readonly is_active?: boolean;
}

export interface LotteryStatusResponse {
  readonly feature_type: string;
  readonly remaining_plays: number;
  readonly prizes: LotteryPrizeDto[];
}

export interface LotteryPlayResponse {
  readonly prize: LotteryPrizeDto;
  readonly remaining_plays: number;
  readonly message?: string;
}

export const getLotteryStatus = async (): Promise<LotteryStatusResponse> => {
  try {
    const response = await userApi.get<LotteryStatusResponse>("/lottery/status");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn("[lotteryApi] Falling back to demo data", error.message);
      return getFallbackLotteryStatus();
    }
    throw error;
  }
};

export const playLottery = async (): Promise<LotteryPlayResponse> => {
  try {
    const response = await userApi.post<LotteryPlayResponse>("/lottery/play");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn("[lotteryApi] Falling back to demo play", error.message);
      return playFallbackLottery();
    }
    throw error;
  }
};

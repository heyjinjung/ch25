// src/api/lotteryApi.ts
import axios from "axios";
import { GameTokenType } from "../types/gameTokens";
import { isDemoFallbackEnabled } from "../config/featureFlags";
import { getFallbackLotteryStatus, playFallbackLottery } from "./fallbackData";
import userApi from "./httpClient";

interface BackendLotteryPrizeDto {
  readonly id: number;
  readonly label: string;
  readonly reward_type: string;
  readonly reward_amount: number | string;
  readonly stock?: number | null;
  readonly is_active?: boolean;
}

interface BackendLotteryStatusResponse {
  readonly config_id: number;
  readonly name: string;
  readonly max_daily_tickets: number;
  readonly today_tickets: number;
  readonly remaining_tickets: number;
  readonly token_type: GameTokenType;
  readonly token_balance: number;
  readonly prize_preview: BackendLotteryPrizeDto[];
  readonly feature_type: string;
}

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
  readonly token_type: GameTokenType;
  readonly token_balance: number;
}

export interface LotteryPlayResponse {
  readonly prize: LotteryPrizeDto;
  readonly remaining_plays: number;
  readonly message?: string;
}

export const getLotteryStatus = async (): Promise<LotteryStatusResponse> => {
  try {
    const response = await userApi.get<BackendLotteryStatusResponse>("/api/lottery/status");
    const data = response.data;
    return {
      feature_type: data.feature_type,
      remaining_plays: data.remaining_tickets,
      token_type: data.token_type,
      token_balance: data.token_balance,
      prizes: data.prize_preview.map((prize) => ({
        id: prize.id,
        label: prize.label,
        reward_type: prize.reward_type,
        reward_value: prize.reward_amount,
        stock: prize.stock ?? null,
        is_active: prize.is_active ?? true,
      })),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (isDemoFallbackEnabled) {
        console.warn("[lotteryApi] Falling back to demo data", error.message);
        return getFallbackLotteryStatus();
      }
      throw error;
    }
    throw error;
  }
};

export const playLottery = async (): Promise<LotteryPlayResponse> => {
  try {
    const response = await userApi.post<{ result: string; prize: BackendLotteryPrizeDto }>("/api/lottery/play");
    const data = response.data;
    return {
      prize: {
        id: data.prize.id,
        label: data.prize.label,
        reward_type: data.prize.reward_type,
        reward_value: data.prize.reward_amount,
        stock: data.prize.stock ?? null,
        is_active: data.prize.is_active ?? true,
      },
      remaining_plays: 0,
      message: data.result !== "OK" ? data.result : undefined,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (isDemoFallbackEnabled) {
        console.warn("[lotteryApi] Falling back to demo play", error.message);
        return playFallbackLottery();
      }
      throw error;
    }
    throw error;
  }
};

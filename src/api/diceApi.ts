// src/api/diceApi.ts
import axios from "axios";
import { GameTokenType } from "../types/gameTokens";
import { isDemoFallbackEnabled } from "../config/featureFlags";
import { getFallbackDiceStatus, playFallbackDice } from "./fallbackData";
import userApi from "./httpClient";

interface BackendDiceStatusResponse {
  readonly config_id: number;
  readonly name: string;
  readonly max_daily_plays: number;
  readonly today_plays: number;
  readonly remaining_plays: number;
  readonly token_type: GameTokenType;
  readonly token_balance: number;
  readonly feature_type: string;
}

export interface DiceStatusResponse {
  readonly feature_type: string;
  readonly remaining_plays: number;
  readonly token_type: GameTokenType;
  readonly token_balance: number;
}

interface BackendDicePlayResponse {
  readonly result: string;
  readonly game: {
    readonly user_dice: number[];
    readonly dealer_dice: number[];
    readonly user_sum: number;
    readonly dealer_sum: number;
    readonly outcome: "WIN" | "LOSE" | "DRAW";
    readonly reward_type: string;
    readonly reward_amount: number;
  };
  readonly season_pass?: Record<string, unknown> | null;
}

export interface DicePlayResponse {
  readonly user_dice: number[];
  readonly dealer_dice: number[];
  readonly result: "WIN" | "LOSE" | "DRAW";
  readonly remaining_plays: number;
  readonly reward_type?: string;
  readonly reward_value?: number | string;
  readonly message?: string;
}

export const getDiceStatus = async (): Promise<DiceStatusResponse> => {
  try {
    const response = await userApi.get<BackendDiceStatusResponse>("/dice/status");
    const data = response.data;
    return {
      feature_type: data.feature_type,
      remaining_plays: data.remaining_plays,
      token_type: data.token_type,
      token_balance: data.token_balance,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (isDemoFallbackEnabled) {
        console.warn("[diceApi] Falling back to demo data", error.message);
        return getFallbackDiceStatus();
      }
      throw error;
    }
    throw error;
  }
};

export const playDice = async (): Promise<DicePlayResponse> => {
  try {
    const response = await userApi.post<BackendDicePlayResponse>("/dice/play");
    const data = response.data;
    return {
      user_dice: data.game.user_dice,
      dealer_dice: data.game.dealer_dice,
      result: data.game.outcome,
      remaining_plays: 0,
      reward_type: data.game.reward_type,
      reward_value: data.game.reward_amount,
      message: data.result !== "OK" ? data.result : undefined,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (isDemoFallbackEnabled) {
        console.warn("[diceApi] Falling back to demo play", error.message);
        return playFallbackDice();
      }
      throw error;
    }
    throw error;
  }
};

// src/api/diceApi.ts
import axios from "axios";
import userApi from "./httpClient";
import { getFallbackDiceStatus, playFallbackDice } from "./fallbackData";
import { isDemoFallbackEnabled } from "../config/featureFlags";

export interface DiceStatusResponse {
  readonly feature_type: string;
  readonly remaining_plays: number;
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
    const response = await userApi.get<DiceStatusResponse>("/dice/status");
    return response.data;
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
    const response = await userApi.post<DicePlayResponse>("/dice/play");
    return response.data;
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

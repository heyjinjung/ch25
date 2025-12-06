// src/api/diceApi.ts
import userApi from "./httpClient";

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
}

export const getDiceStatus = async (): Promise<DiceStatusResponse> => {
  const response = await userApi.get<DiceStatusResponse>("/dice/status");
  return response.data;
};

export const playDice = async (): Promise<DicePlayResponse> => {
  const response = await userApi.post<DicePlayResponse>("/dice/play");
  return response.data;
};

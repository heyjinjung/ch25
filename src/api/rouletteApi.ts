// src/api/rouletteApi.ts
import userApi from "./httpClient";

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
  const response = await userApi.get<RouletteStatusResponse>("/roulette/status");
  return response.data;
};

export const playRoulette = async (): Promise<RoulettePlayResponse> => {
  const response = await userApi.post<RoulettePlayResponse>("/roulette/play");
  return response.data;
};

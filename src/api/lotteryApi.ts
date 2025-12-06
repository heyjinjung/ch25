// src/api/lotteryApi.ts
import userApi from "./httpClient";

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
  const response = await userApi.get<LotteryStatusResponse>("/lottery/status");
  return response.data;
};

export const playLottery = async (): Promise<LotteryPlayResponse> => {
  const response = await userApi.post<LotteryPlayResponse>("/lottery/play");
  return response.data;
};

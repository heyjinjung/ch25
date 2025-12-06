// src/api/rankingApi.ts
import axios from "axios";
import userApi from "./httpClient";
import { getFallbackRanking } from "./fallbackData";

export interface RankingEntryDto {
  readonly rank: number;
  readonly user_name: string;
  readonly score?: number;
}

export interface TodayRankingResponse {
  readonly date: string;
  readonly entries: RankingEntryDto[];
  readonly my_entry?: RankingEntryDto;
}

export const getTodayRanking = async (topN: number = 10): Promise<TodayRankingResponse> => {
  try {
    const response = await userApi.get<TodayRankingResponse>("/ranking/today", {
      params: { top: topN },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn("[rankingApi] Falling back to demo data", error.message);
      return getFallbackRanking(topN);
    }
    throw error;
  }
};

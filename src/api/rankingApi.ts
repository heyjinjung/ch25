// src/api/rankingApi.ts
import axios from "axios";
import userApi from "./httpClient";
import { getFallbackRanking } from "./fallbackData";
import { isDemoFallbackEnabled } from "../config/featureFlags";

export interface RankingEntryDto {
  readonly rank: number;
  readonly user_name: string;
  readonly score?: number;
}

export interface ExternalRankingEntryDto {
  readonly rank: number;
  readonly user_id: number;
  readonly user_name?: string;
  readonly deposit_amount: number;
  readonly play_count: number;
  readonly memo?: string;
}

export interface TodayRankingResponse {
  readonly date: string;
  readonly entries: RankingEntryDto[];
  readonly my_entry?: RankingEntryDto;
  readonly external_entries?: ExternalRankingEntryDto[];
  readonly my_external_entry?: ExternalRankingEntryDto;
}

export const getTodayRanking = async (topN: number = 10): Promise<TodayRankingResponse> => {
  try {
    const response = await userApi.get<TodayRankingResponse>("/api/ranking/today", {
      params: { top: topN },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (isDemoFallbackEnabled) {
        console.warn("[rankingApi] Falling back to demo data", error.message);
        return getFallbackRanking(topN);
      }
      throw error;
    }
    throw error;
  }
};

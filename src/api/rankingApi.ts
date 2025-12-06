// src/api/rankingApi.ts
import userApi from "./httpClient";

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
  const response = await userApi.get<TodayRankingResponse>("/ranking/today", {
    params: { top: topN },
  });
  return response.data;
};

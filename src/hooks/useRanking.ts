// src/hooks/useRanking.ts
import { useQuery } from "@tanstack/react-query";
import { getTodayRanking, TodayRankingResponse } from "../api/rankingApi";

export const TODAY_RANKING_QUERY_KEY = ["today-ranking"] as const;

export const useTodayRanking = (topN: number = 10) => {
  return useQuery<TodayRankingResponse, unknown>({
    queryKey: [...TODAY_RANKING_QUERY_KEY, topN],
    queryFn: () => getTodayRanking(topN),
  });
};

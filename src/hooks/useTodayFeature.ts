// src/hooks/useTodayFeature.ts
import { useQuery } from "@tanstack/react-query";
import { getTodayFeature, TodayFeatureResponse } from "../api/featureApi";

export const TODAY_FEATURE_QUERY_KEY = ["today-feature"] as const;

export const useTodayFeature = () => {
  return useQuery<TodayFeatureResponse, unknown>({
    queryKey: TODAY_FEATURE_QUERY_KEY,
    queryFn: getTodayFeature,
  });
};

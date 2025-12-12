import { useQuery } from "@tanstack/react-query";
import { getLevelXpStatus, LevelXpStatusResponse } from "../api/levelXpApi";

export const LEVEL_XP_STATUS_QUERY_KEY = ["level-xp-status"] as const;

export const useLevelXpStatus = () => {
  return useQuery<LevelXpStatusResponse, unknown>({
    queryKey: LEVEL_XP_STATUS_QUERY_KEY,
    queryFn: getLevelXpStatus,
    staleTime: 60_000,
  });
};

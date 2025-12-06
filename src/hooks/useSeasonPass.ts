// src/hooks/useSeasonPass.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { claimSeasonReward, ClaimSeasonRewardResponse, getSeasonPassStatus, SeasonPassStatusResponse } from "../api/seasonPassApi";

export const SEASON_PASS_STATUS_QUERY_KEY = ["season-pass-status"] as const;

export const useSeasonPassStatus = () => {
  return useQuery<SeasonPassStatusResponse, unknown>({
    queryKey: SEASON_PASS_STATUS_QUERY_KEY,
    queryFn: getSeasonPassStatus,
  });
};

export const useClaimSeasonReward = () => {
  const queryClient = useQueryClient();
  return useMutation<ClaimSeasonRewardResponse, unknown, number>({
    mutationFn: (level: number) => claimSeasonReward(level),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEASON_PASS_STATUS_QUERY_KEY });
    },
  });
};

// src/hooks/useSeasonPass.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addSeasonPassStamp,
  AddStampResponse,
  claimSeasonReward,
  ClaimSeasonRewardResponse,
  getSeasonPassStatus,
  getInternalWinStatus,
  SeasonPassStatusResponse,
  InternalWinStatusResponse,
} from "../api/seasonPassApi";

export const SEASON_PASS_STATUS_QUERY_KEY = ["season-pass-status"] as const;
export const INTERNAL_WINS_QUERY_KEY = ["season-pass-internal-wins"] as const;

export const useSeasonPassStatus = () => {
  return useQuery<SeasonPassStatusResponse, unknown>({
    queryKey: SEASON_PASS_STATUS_QUERY_KEY,
    queryFn: getSeasonPassStatus,
  });
};

export const useInternalWinStatus = () => {
  return useQuery<InternalWinStatusResponse, unknown>({
    queryKey: INTERNAL_WINS_QUERY_KEY,
    queryFn: getInternalWinStatus,
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

export const useAddSeasonPassStamp = () => {
  const queryClient = useQueryClient();
  return useMutation<AddStampResponse, unknown, { sourceFeatureType: string; xpBonus?: number }>({
    mutationFn: ({ sourceFeatureType, xpBonus }) => addSeasonPassStamp(sourceFeatureType, xpBonus ?? 0),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEASON_PASS_STATUS_QUERY_KEY });
    },
  });
};

// src/hooks/useRoulette.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouletteStatus, playRoulette, RoulettePlayResponse, RouletteStatusResponse } from "../api/rouletteApi";
import { recordActivity } from "../api/activityApi";

const ROULETTE_STATUS_QUERY_KEY = ["roulette-status"] as const;

export const useRouletteStatus = () => {
  return useQuery<RouletteStatusResponse, unknown>({
    queryKey: ROULETTE_STATUS_QUERY_KEY,
    queryFn: getRouletteStatus,
  });
};

export const usePlayRoulette = () => {
  const queryClient = useQueryClient();
  return useMutation<RoulettePlayResponse, unknown>({
    mutationFn: playRoulette,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROULETTE_STATUS_QUERY_KEY });
      recordActivity({ event_type: "ROULETTE_PLAY" }).catch(() => undefined);
    },
  });
};

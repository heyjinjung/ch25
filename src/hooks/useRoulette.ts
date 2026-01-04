// src/hooks/useRoulette.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouletteStatus, playRoulette, RoulettePlayResponse, RouletteStatusResponse } from "../api/rouletteApi";
import { recordActivity } from "../api/activityApi";
import { useMissionStore } from "../stores/missionStore";

const ROULETTE_STATUS_QUERY_KEY = ["roulette-status"] as const;

export const useRouletteStatus = (ticketType: string = "ROULETTE_COIN") => {
  return useQuery<RouletteStatusResponse, unknown>({
    queryKey: [...ROULETTE_STATUS_QUERY_KEY, ticketType],
    queryFn: () => getRouletteStatus(ticketType),
  });
};

export const usePlayRoulette = () => {
  const queryClient = useQueryClient();
  return useMutation<RoulettePlayResponse, unknown, string | undefined>({
    mutationFn: (ticketType) => playRoulette(ticketType),
    onSuccess: (data) => {
      // Invalidate all roulette status queries regardless of type
      queryClient.invalidateQueries({ queryKey: ROULETTE_STATUS_QUERY_KEY });
      // Invalidate vault status to refresh balance immediately
      queryClient.invalidateQueries({ queryKey: ["vault-status"] });

      if (data.streakInfo) {
        useMissionStore.getState().setStreakInfo(data.streakInfo);
      }

      recordActivity({ event_type: "ROULETTE_PLAY" }).catch(() => undefined);

      if ((data.vaultEarn ?? 0) > 0) {
        // Vault accrual is now handled via a modal in the page component
      }
    },
  });
};

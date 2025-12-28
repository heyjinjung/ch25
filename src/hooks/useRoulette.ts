// src/hooks/useRoulette.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouletteStatus, playRoulette, RoulettePlayResponse, RouletteStatusResponse } from "../api/rouletteApi";
import { recordActivity } from "../api/activityApi";
import { useToast } from "../components/common/ToastProvider";
import { formatWon } from "../utils/vaultUtils";

const ROULETTE_STATUS_QUERY_KEY = ["roulette-status"] as const;


export const useRouletteStatus = (ticketType: string = "ROULETTE_COIN") => {
  return useQuery<RouletteStatusResponse, unknown>({
    queryKey: [...ROULETTE_STATUS_QUERY_KEY, ticketType],
    queryFn: () => getRouletteStatus(ticketType),
  });
};

export const usePlayRoulette = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  return useMutation<RoulettePlayResponse, unknown, string | undefined>({
    mutationFn: (ticketType) => playRoulette(ticketType),
    onSuccess: (data) => {
      // Invalidate all roulette status queries regardless of type
      queryClient.invalidateQueries({ queryKey: ROULETTE_STATUS_QUERY_KEY });
      // Invalidate vault status to refresh balance immediately
      queryClient.invalidateQueries({ queryKey: ["vault-status"] });

      recordActivity({ event_type: "ROULETTE_PLAY" }).catch(() => undefined);

      if ((data.vaultEarn ?? 0) > 0) {
        addToast(`${formatWon(data.vaultEarn!)} 금고 적립 완료!`, "success");
      }
    },
  });
};

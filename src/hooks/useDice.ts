// src/hooks/useDice.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DicePlayResponse, DiceStatusResponse, getDiceStatus, playDice } from "../api/diceApi";

const DICE_STATUS_QUERY_KEY = ["dice-status"] as const;

export const useDiceStatus = () => {
  return useQuery<DiceStatusResponse, unknown>({
    queryKey: DICE_STATUS_QUERY_KEY,
    queryFn: getDiceStatus,
  });
};

export const usePlayDice = () => {
  const queryClient = useQueryClient();
  return useMutation<DicePlayResponse, unknown>({
    mutationFn: playDice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DICE_STATUS_QUERY_KEY });
    },
  });
};

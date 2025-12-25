// src/hooks/useDice.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DicePlayResponse, DiceStatusResponse, getDiceStatus, playDice } from "../api/diceApi";
import { recordActivity } from "../api/activityApi";
import { useToast } from "../components/common/ToastProvider";
import { formatWon } from "../utils/vaultUtils";

const DICE_STATUS_QUERY_KEY = ["dice-status"] as const;

export const useDiceStatus = () => {
  return useQuery<DiceStatusResponse, unknown>({
    queryKey: DICE_STATUS_QUERY_KEY,
    queryFn: getDiceStatus,
  });
};

export const usePlayDice = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  return useMutation<DicePlayResponse, unknown>({
    mutationFn: playDice,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: DICE_STATUS_QUERY_KEY });
      // Invalidate vault status to refresh balance immediately
      queryClient.invalidateQueries({ queryKey: ["vault-status"] });

      recordActivity({ event_type: "DICE_PLAY" }).catch(() => undefined);

      if ((data.vaultEarn ?? 0) > 0) {
        addToast(`${formatWon(data.vaultEarn!)} 금고 적립 완료!`, "success");
      }
    },
  });
};

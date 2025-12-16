// src/hooks/useLottery.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLotteryStatus, playLottery, LotteryPlayResponse, LotteryStatusResponse } from "../api/lotteryApi";
import { recordActivity } from "../api/activityApi";

const LOTTERY_STATUS_QUERY_KEY = ["lottery-status"] as const;

export const useLotteryStatus = () => {
  return useQuery<LotteryStatusResponse, unknown>({
    queryKey: LOTTERY_STATUS_QUERY_KEY,
    queryFn: getLotteryStatus,
  });
};

export const usePlayLottery = () => {
  const queryClient = useQueryClient();
  return useMutation<LotteryPlayResponse, unknown>({
    mutationFn: playLottery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOTTERY_STATUS_QUERY_KEY });
      recordActivity({ event_type: "LOTTERY_PLAY" }).catch(() => undefined);
    },
  });
};

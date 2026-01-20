import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getRouletteConfigs,
  updateRouletteConfig,
  getDiceConfig,
  updateDiceConfig,
  getLotteryConfig,
  updateLotteryConfig,
  updateLotteryPrize,
  type AdminRouletteConfigDto,
  type AdminDiceConfigDto,
  type AdminLotteryConfigDto,
  type AdminLotteryPrizeDto,
} from "../api/adminApi";

// Roulette
export function useRouletteConfigs() {
  return useQuery({
    queryKey: ["admin", "game", "roulette"],
    queryFn: getRouletteConfigs,
  });
}

export function useUpdateRouletteConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AdminRouletteConfigDto>) => updateRouletteConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "game", "roulette"] });
    },
  });
}

// Dice
export function useDiceConfig() {
  return useQuery({
    queryKey: ["admin", "game", "dice"],
    queryFn: getDiceConfig,
  });
}

export function useUpdateDiceConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AdminDiceConfigDto>) => updateDiceConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "game", "dice"] });
    },
  });
}

// Lottery
export function useLotteryConfig() {
  return useQuery({
    queryKey: ["admin", "game", "lottery"],
    queryFn: getLotteryConfig,
  });
}

export function useUpdateLotteryConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AdminLotteryConfigDto>) => updateLotteryConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "game", "lottery"] });
    },
  });
}

export function useUpdateLotteryPrize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ configId, prizeId, data }: {
      configId: number;
      prizeId: number;
      data: Partial<AdminLotteryPrizeDto>;
    }) => updateLotteryPrize(configId, prizeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "game", "lottery"] });
    },
  });
}

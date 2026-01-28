// src/hooks/useV2Mission.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getV2Missions,
  claimV2Mission,
  claimV2DailyGift,
  getV2StreakRules,
  claimV2StreakReward,
  getV2SeasonPassStatus,
  claimV2SeasonPassReward,
  getV2LevelXPStatus,
} from "../api/missionApi";

// ============================================================================
// Mission Hooks
// ============================================================================

export function useV2Missions(category?: string) {
  return useQuery({
    queryKey: ["v2", "missions", category],
    queryFn: () => getV2Missions(category),
    staleTime: 30000, // 30 seconds
  });
}

export function useV2ClaimMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (missionId: string) => claimV2Mission(missionId),
    onSuccess: () => {
      // Invalidate missions list
      queryClient.invalidateQueries({ queryKey: ["v2", "missions"] });
      // Invalidate inventory/wallet (reward may include items)
      queryClient.invalidateQueries({ queryKey: ["v2", "inventory"] });
      // Invalidate vault/balance (reward may include points)
      queryClient.invalidateQueries({ queryKey: ["v2-vault-status"] });
      queryClient.invalidateQueries({ queryKey: ["v2-user-me"] });
    },
  });
}

export function useV2ClaimDailyGift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => claimV2DailyGift(),
    onSuccess: () => {
      // Invalidate missions list
      queryClient.invalidateQueries({ queryKey: ["v2", "missions"] });
      // Invalidate inventory/wallet
      queryClient.invalidateQueries({ queryKey: ["v2", "inventory"] });
      // Invalidate vault/balance
      queryClient.invalidateQueries({ queryKey: ["v2-vault-status"] });
      queryClient.invalidateQueries({ queryKey: ["v2-user-me"] });
    },
  });
}

// ============================================================================
// Streak Hooks
// ============================================================================

export function useV2StreakRules() {
  return useQuery({
    queryKey: ["v2", "streak", "rules"],
    queryFn: () => getV2StreakRules(),
    staleTime: 300000, // 5 minutes (rules rarely change)
  });
}

export function useV2ClaimStreakReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => claimV2StreakReward(),
    onSuccess: () => {
      // Invalidate missions/streak info
      queryClient.invalidateQueries({ queryKey: ["v2", "missions"] });
      // Invalidate inventory/wallet
      queryClient.invalidateQueries({ queryKey: ["v2", "inventory"] });
      // Invalidate vault/balance
      queryClient.invalidateQueries({ queryKey: ["v2-vault-status"] });
      queryClient.invalidateQueries({ queryKey: ["v2-user-me"] });
    },
  });
}

// ============================================================================
// Season Pass Hooks
// ============================================================================

export function useV2SeasonPassStatus() {
  return useQuery({
    queryKey: ["v2", "season-pass", "status"],
    queryFn: () => getV2SeasonPassStatus(),
    staleTime: 30000, // 30 seconds
  });
}

export function useV2ClaimSeasonPassReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (level: number) => claimV2SeasonPassReward(level),
    onSuccess: () => {
      // Invalidate season pass status
      queryClient.invalidateQueries({ queryKey: ["v2", "season-pass"] });
      // Invalidate inventory/wallet
      queryClient.invalidateQueries({ queryKey: ["v2", "inventory"] });
      // Invalidate vault/balance
      queryClient.invalidateQueries({ queryKey: ["v2-vault-status"] });
      queryClient.invalidateQueries({ queryKey: ["v2-user-me"] });
    },
  });
}

export function useV2LevelXPStatus() {
  return useQuery({
    queryKey: ["v2", "level-xp", "status"],
    queryFn: () => getV2LevelXPStatus(),
    staleTime: 30000,
  });
}

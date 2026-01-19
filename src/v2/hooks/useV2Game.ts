// src/v2/hooks/useV2Game.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getV2RouletteStatus,
  playV2Roulette,
  getV2DiceStatus,
  playV2Dice,
  getV2LotteryStatus,
  playV2Lottery,
  playV2DiceDoubleUp,
} from "../api/gameApi";
import type {
  RoulettePlayRequest,
  DiceRollRequest,
  DiceDoubleUpRequest,
  LotteryScratchRequest,
} from "../types/gameAction";

// ============================================================================
// Roulette Hooks
// ============================================================================

export function useV2RouletteStatus(ticketType?: string) {
  return useQuery({
    queryKey: ["v2", "roulette", "status", ticketType],
    queryFn: () => getV2RouletteStatus(ticketType),
    staleTime: 10000, // 10 seconds
  });
}

export function useV2RoulettePlay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RoulettePlayRequest) => playV2Roulette(request),
    onSuccess: () => {
      // Invalidate roulette status queries
      queryClient.invalidateQueries({ queryKey: ["v2", "roulette", "status"] });
      // Invalidate inventory/wallet queries
      queryClient.invalidateQueries({ queryKey: ["v2", "inventory"] });
      // Invalidate vault/balance queries
      queryClient.invalidateQueries({ queryKey: ["vault-status"] });
      queryClient.invalidateQueries({ queryKey: ["user-status"] });
    },
  });
}

// ============================================================================
// Dice Hooks
// ============================================================================

export function useV2DiceStatus() {
  return useQuery({
    queryKey: ["v2", "dice", "status"],
    queryFn: () => getV2DiceStatus(),
    staleTime: 10000, // 10 seconds
  });
}

export function useV2DicePlay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: DiceRollRequest) => playV2Dice(request),
    onSuccess: () => {
      // Invalidate dice status queries
      queryClient.invalidateQueries({ queryKey: ["v2", "dice", "status"] });
      // Invalidate inventory/wallet queries
      queryClient.invalidateQueries({ queryKey: ["v2", "inventory"] });
      // Invalidate vault/balance queries
      queryClient.invalidateQueries({ queryKey: ["vault-status"] });
      queryClient.invalidateQueries({ queryKey: ["user-status"] });
    },
  });
}

export function useV2DiceDoubleUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: DiceDoubleUpRequest) => playV2DiceDoubleUp(request),
    onSuccess: () => {
      // Invalidate dice status queries (if balance/stats matter)
      queryClient.invalidateQueries({ queryKey: ["v2", "dice", "status"] });
      // Invalidate inventory/wallet queries
      queryClient.invalidateQueries({ queryKey: ["v2", "inventory"] });
      // Invalidate vault/balance queries
      queryClient.invalidateQueries({ queryKey: ["vault-status"] });
    },
  });
}

// ============================================================================
// Lottery Hooks
// ============================================================================

export function useV2LotteryStatus() {
  return useQuery({
    queryKey: ["v2", "lottery", "status"],
    queryFn: () => getV2LotteryStatus(),
    staleTime: 10000, // 10 seconds
  });
}

export function useV2LotteryPlay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: LotteryScratchRequest) => playV2Lottery(request),
    onSuccess: () => {
      // Invalidate lottery status queries
      queryClient.invalidateQueries({ queryKey: ["v2", "lottery", "status"] });
      // Invalidate inventory/wallet queries
      queryClient.invalidateQueries({ queryKey: ["v2", "inventory"] });
      // Invalidate vault/balance queries
      queryClient.invalidateQueries({ queryKey: ["vault-status"] });
      queryClient.invalidateQueries({ queryKey: ["user-status"] });
    },
  });
}

// ============================================================================

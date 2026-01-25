/**
 * V2 Backend Adapter
 *
 * This adapter connects V2 frontend components to V2 backend endpoints.
 * Uses v2Client for proper authentication handling.
 */

import axios from "axios";
import { v2Client } from "./client"; // V2 apiClient
import {
  getRouletteStatus as getV1RouletteStatus,
  type RouletteStatusResponse as V1RouletteStatusResponse,
} from "../../api/rouletteApi";
import {
  getDiceStatus as getV1DiceStatus,
  type DiceStatusResponse as V1DiceStatusResponse,
} from "../../api/diceApi";
import {
  getLotteryStatus as getV1LotteryStatus,
  type LotteryStatusResponse as V1LotteryStatusResponse,
} from "../../api/lotteryApi";
import type {
  RouletteStatusResponse,
  DiceStatusResponse,
  LotteryStatusResponse,
  LotteryPrizeDto,
  VaultStatusResponse,
} from "./gameApi";
import type {
  DicePlayResponse,
  DiceRollRequest,
  LotteryPlayResponse,
  RoulettePlayRequest,
  RoulettePlayResponse,
} from "../types/gameAction";

const isNoFeatureToday = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;
  const code = error.response?.data?.error?.code;
  const detail = error.response?.data?.detail;
  return code === "NO_FEATURE_TODAY" || detail === "NO_FEATURE_TODAY";
};

const isRouletteConfigFallback = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;
  if (error.response?.status !== 400) return false;
  const code = error.response?.data?.error?.code;
  const detail = error.response?.data?.detail;
  const candidates = new Set([
    "INVALID_CONFIG",
    "INVALID_ROULETTE_CONFIG",
    "FEATURE_NOT_ACTIVE",
    "V2_ROULETTE_CONFIG_MISSING",
  ]);
  return candidates.has(code) || candidates.has(detail);
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

const mapV1RouletteToV2 = (
  data: V1RouletteStatusResponse,
): RouletteStatusResponse => {
  const segments = (data.segments || []).map((seg, index) => ({
    id: index + 1,
    label: seg.label,
    reward_type: seg.reward_type ?? "UNKNOWN",
    reward_amount: toNumber(seg.reward_amount, 0),
    slot_index: seg.slot_index ?? index,
    is_fever_reward: false,
  }));

  return {
    config_id: 1,
    name: "Roulette",
    max_daily_spins: data.remaining_spins ?? 0,
    today_spins: 0,
    remaining_spins: data.remaining_spins ?? 0,
    token_type: data.token_type,
    token_balance: data.token_balance ?? 0,
    segments,
  };
};

const mapV1DiceToV2 = (data: V1DiceStatusResponse): DiceStatusResponse => ({
  config_id: 1,
  name: "Dice",
  max_daily_plays: data.remaining_plays ?? 0,
  today_plays: 0,
  remaining_plays: data.remaining_plays ?? 0,
  token_type: data.token_type,
  token_balance: data.token_balance ?? 0,
  event_active: data.event_active ?? false,
  event_plays_done: data.event_plays_done ?? 0,
  event_plays_max: data.event_plays_max ?? 0,
  event_ineligible_reason: data.event_ineligible_reason,
  // Reward Config (V1 does not have this, so we use defaults or undefined)
  reward_config: undefined,
});

const mapV1LotteryToV2 = (
  data: V1LotteryStatusResponse,
): LotteryStatusResponse => ({
  config_id: 1,
  name: "Lottery",
  max_daily_tickets: data.remaining_plays ?? 0,
  today_tickets: 0,
  remaining_tickets: data.remaining_plays ?? 0,
  token_type: data.token_type,
  token_balance: data.token_balance ?? 0,
  prizes: (data.prizes || []).map((prize) => ({
    id: prize.id,
    label: prize.label,
    reward_type: prize.reward_type,
    reward_amount: toNumber(prize.reward_amount, 0),
    stock: prize.stock ?? null,
    is_active: prize.is_active ?? true,
  })),
  collectionProgress: data.collectionProgress,
});

const emptyRouletteStatus = (ticketType?: string): RouletteStatusResponse => ({
  config_id: 1,
  name: "Roulette",
  max_daily_spins: 0,
  today_spins: 0,
  remaining_spins: 0,
  token_type: ticketType || "ROULETTE_TICKET",
  token_balance: 0,
  segments: [],
});

const emptyDiceStatus = (): DiceStatusResponse => ({
  config_id: 1,
  name: "Dice",
  max_daily_plays: 0,
  today_plays: 0,
  remaining_plays: 0,
  token_type: "DICE_TICKET",
  token_balance: 0,
  event_active: false,
  event_plays_done: 0,
  event_plays_max: 0,
  event_ineligible_reason: "NO_FEATURE_TODAY",
});

const emptyLotteryStatus = (): LotteryStatusResponse => ({
  config_id: 1,
  name: "Lottery",
  max_daily_tickets: 0,
  today_tickets: 0,
  remaining_tickets: 0,
  token_type: "LOTTERY_TICKET",
  token_balance: 0,
  prizes: [],
  collectionProgress: {},
});

// ============================================================================
// User / Vault Adapter
// ============================================================================

export const getV2VaultStatus = async (): Promise<VaultStatusResponse> => {
  try {
    const response = await v2Client.get<any>("/api/vault/status");
    const data = response.data;

    return {
      eligible: data.eligible ?? true,
      vaultBalance:
        data.vaultBalance ??
        data.vault_balance ??
        data.vault_locked_balance ??
        0,
      lockedBalance: data.lockedBalance ?? data.vault_locked_balance ?? 0,
      availableBalance:
        data.availableBalance ?? data.vault_available_balance ?? 0,
      ticketCount: data.ticketCount ?? data.ticket_count ?? 0,
      is_golden_hour_active: data.is_golden_hour_active ?? false,
      golden_hour_multiplier: data.golden_hour_multiplier ?? 1.0,
      golden_hour_remaining_seconds: data.golden_hour_remaining_seconds ?? 0,
      showModalOverride: data.show_modal_override ?? null,
      segment: data.segment ?? null,
      balances: data.balances ?? {},
    } as any;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.warn(
        "[V2Adapter] V2 vault status 404; falling back to V1 alias check",
      );
    }
    // Fallback to V1 if V2 endpoint is not yet active
    const response = await v2Client.get<any>("/api/vault/status");
    const data = response.data;
    return {
      eligible: data.eligible,
      vaultBalance: data.vault_balance ?? 0,
      lockedBalance: data.vault_locked_balance ?? 0,
      availableBalance: data.vault_available_balance ?? 0,
      ticketCount: data.ticket_count ?? 0,
      is_golden_hour_active: data.is_golden_hour_active ?? false,
      golden_hour_multiplier: data.golden_hour_multiplier ?? 1.0,
      golden_hour_remaining_seconds: data.golden_hour_remaining_seconds ?? 0,
      showModalOverride: data.show_modal_override ?? null,
      segment: data.segment ?? null,
      balances: {},
    } as any;
  }
};

// ============================================================================
// Roulette Adapter
// ============================================================================

export const getV2RouletteStatus = async (
  ticketType?: string,
): Promise<RouletteStatusResponse> => {
  try {
    const response = await v2Client.get<any>("/api/v2/roulette/status", {
      params: ticketType ? { ticket_type: ticketType } : undefined,
    });

    const data = response.data;

    return {
      config_id: data.config_id || 1,
      name: data.name || "Roulette",
      max_daily_spins: data.max_daily_spins || 0,
      today_spins: data.today_spins || 0,
      remaining_spins: data.remaining_spins || 0,
      token_type: data.token_type || ticketType || "ROULETTE_TICKET",
      token_balance: data.token_balance || 0,
      segments: (data.segments || []).map((seg: any) => ({
        id: seg.id,
        label: seg.label,
        reward_type: seg.reward_type,
        reward_amount: seg.reward_amount,
        slot_index: seg.slot_index,
        is_fever_reward: seg.is_fever_reward ?? false,
      })),
    };
  } catch (error) {
    if (isNoFeatureToday(error)) {
      console.warn(
        "[V2Adapter] V2 roulette unavailable (NO_FEATURE_TODAY); falling back to V1",
      );
      try {
        const v1Data = await getV1RouletteStatus(ticketType);
        return mapV1RouletteToV2(v1Data);
      } catch (fallbackError) {
        if (isNoFeatureToday(fallbackError)) {
          return emptyRouletteStatus(ticketType);
        }
        throw fallbackError;
      }
    }
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.warn("[V2Adapter] V2 roulette status 404; falling back to V1");
      try {
        const v1Data = await getV1RouletteStatus(ticketType);
        return mapV1RouletteToV2(v1Data);
      } catch (fallbackError) {
        if (isNoFeatureToday(fallbackError)) {
          return emptyRouletteStatus(ticketType);
        }
        throw fallbackError;
      }
    }
    if (isRouletteConfigFallback(error)) {
      console.warn(
        "[V2Adapter] V2 roulette status invalid config; falling back to V1",
      );
      try {
        const v1Data = await getV1RouletteStatus(ticketType);
        return mapV1RouletteToV2(v1Data);
      } catch (fallbackError) {
        if (isNoFeatureToday(fallbackError)) {
          return emptyRouletteStatus(ticketType);
        }
        throw fallbackError;
      }
    }
    console.error("[V2Adapter] Failed to fetch roulette status", error);
    throw error;
  }
};

export const getV2RouletteStatusStrict = async (
  ticketType: string,
): Promise<RouletteStatusResponse> => {
  const response = await v2Client.get<any>("/api/v2/roulette/status", {
    params: { ticket_type: ticketType },
  });
  const data = response.data;

  return {
    config_id: data.config_id || 1,
    name: data.name || "Roulette",
    max_daily_spins: data.max_daily_spins || 0,
    today_spins: data.today_spins || 0,
    remaining_spins: data.remaining_spins || 0,
    token_type: data.token_type || ticketType || "ROULETTE_TICKET",
    token_balance: data.token_balance || 0,
    segments: (data.segments || []).map((seg: any) => ({
      id: seg.id,
      label: seg.label,
      reward_type: seg.reward_type,
      reward_amount: seg.reward_amount,
      slot_index: seg.slot_index,
      is_fever_reward: seg.is_fever_reward ?? false,
    })),
  };
};

export const playV2Roulette = async (
  request: RoulettePlayRequest,
): Promise<RoulettePlayResponse> => {
  try {
    const payload = {
      ticket_type: request.ticket_type,
      bet_multiplier: request.bet_multiplier || 1,
    };
    const response = await v2Client.post<any>("/api/v2/roulette/play", payload);
    const data = response.data;

    if (data?.game_data?.segment) {
      return data as RoulettePlayResponse;
    }

    const segment = data?.segment
      ? {
          ...data.segment,
          is_fever_reward: data.segment.is_fever_reward ?? false,
        }
      : undefined;

    return {
      result: data?.result,
      vault_earn: data?.vault_earn ?? 0,
      season_pass: data?.season_pass ?? null,
      streak_info: data?.streak_info ?? null,
      fever_gauge: data?.fever_gauge ?? null,
      next_action_available: data?.next_action_available ?? null,
      game_data: {
        segment,
        animation_type: "NORMAL",
      },
    } as RoulettePlayResponse;
  } catch (error) {
    console.error("[V2Adapter] Failed to play roulette", error);
    throw error;
  }
};

// ============================================================================
// Dice Adapter
// ============================================================================

export const getV2DiceStatus = async (): Promise<DiceStatusResponse> => {
  try {
    const response = await v2Client.get<any>("/api/v2/dice/status");
    const data = response.data;
    console.log("[V2Adapter] Dice Status Data:", data);

    return {
      config_id: data.config_id || 1,
      name: data.name || "Dice",
      max_daily_plays: data.max_daily_plays || 0,
      today_plays: data.today_plays || 0,
      remaining_plays: data.remaining_plays || 0,
      token_type: data.token_type || "DICE_TICKET",
      token_balance: data.token_balance || 0,
      event_active: data.event_active || false,
      event_plays_done: data.event_plays_done || 0,
      event_plays_max: data.event_plays_max || 0,
      event_ineligible_reason: data.event_ineligible_reason,
      reward_config: {
        win_reward_type:
          data.reward_config?.win_reward_type ??
          data.reward_config?.winRewardType ??
          data.win_reward_type ??
          data.winRewardType,
        win_reward_amount:
          data.reward_config?.win_reward_amount ??
          data.reward_config?.winRewardAmount ??
          data.win_reward_amount ??
          data.winRewardAmount,
        draw_reward_type:
          data.reward_config?.draw_reward_type ??
          data.reward_config?.drawRewardType ??
          data.draw_reward_type ??
          data.drawRewardType,
        draw_reward_amount:
          data.reward_config?.draw_reward_amount ??
          data.reward_config?.drawRewardAmount ??
          data.draw_reward_amount ??
          data.drawRewardAmount,
        lose_reward_type:
          data.reward_config?.lose_reward_type ??
          data.reward_config?.loseRewardType ??
          data.lose_reward_type ??
          data.loseRewardType,
        lose_reward_amount:
          data.reward_config?.lose_reward_amount ??
          data.reward_config?.loseRewardAmount ??
          data.lose_reward_amount ??
          data.loseRewardAmount,
      },
    };
  } catch (error) {
    if (isNoFeatureToday(error)) {
      console.warn(
        "[V2Adapter] V2 dice unavailable (NO_FEATURE_TODAY); falling back to V1",
      );
      try {
        const v1Data = await getV1DiceStatus();
        return mapV1DiceToV2(v1Data);
      } catch (fallbackError) {
        if (isNoFeatureToday(fallbackError)) {
          return emptyDiceStatus();
        }
        throw fallbackError;
      }
    }
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.warn("[V2Adapter] V2 dice status 404; falling back to V1");
      try {
        const v1Data = await getV1DiceStatus();
        return mapV1DiceToV2(v1Data);
      } catch (fallbackError) {
        if (isNoFeatureToday(fallbackError)) {
          return emptyDiceStatus();
        }
        throw fallbackError;
      }
    }
    console.error("[V2Adapter] Failed to fetch dice status", error);
    throw error;
  }
};

export const playV2Dice = async (
  request: DiceRollRequest,
): Promise<DicePlayResponse> => {
  try {
    const payload = {
      bet_amount: request.bet_amount,
      prediction: request.prediction ?? null,
    };

    const response = await v2Client.post<DicePlayResponse>(
      "/api/v2/dice/play",
      payload,
    );
    return response.data;
  } catch (error) {
    console.error("[V2Adapter] Failed to play dice", error);
    throw error;
  }
};

// ============================================================================
// Lottery Adapter
// ============================================================================

export const getV2LotteryStatus = async (): Promise<LotteryStatusResponse> => {
  try {
    const response = await v2Client.get<any>("/api/v2/lottery/status");
    const data = response.data;

    const prizes: LotteryPrizeDto[] = (
      data.prizes ||
      data.prize_preview ||
      []
    ).map((p: any) => ({
      id: p.id,
      label: p.label,
      reward_type: p.reward_type,
      reward_amount: p.reward_amount,
      stock: p.stock,
      is_active: p.is_active,
      weight: p.weight,
    }));

    return {
      config_id: data.config_id || 1,
      name: data.name || "Lottery",
      max_daily_tickets: data.max_daily_tickets || 0,
      today_tickets: data.today_tickets || 0,
      remaining_tickets: data.remaining_tickets || 0,
      token_type: data.token_type || "LOTTERY_TICKET",
      token_balance: data.token_balance || 0,
      prizes,
      collectionProgress:
        data.collectionProgress || data.collection_progress || {},
    };
  } catch (error) {
    if (isNoFeatureToday(error)) {
      console.warn(
        "[V2Adapter] V2 lottery unavailable (NO_FEATURE_TODAY); falling back to V1",
      );
      try {
        const v1Data = await getV1LotteryStatus();
        return mapV1LotteryToV2(v1Data);
      } catch (fallbackError) {
        if (isNoFeatureToday(fallbackError)) {
          return emptyLotteryStatus();
        }
        throw fallbackError;
      }
    }
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.warn("[V2Adapter] V2 lottery status 404; falling back to V1");
      try {
        const v1Data = await getV1LotteryStatus();
        return mapV1LotteryToV2(v1Data);
      } catch (fallbackError) {
        if (isNoFeatureToday(fallbackError)) {
          return emptyLotteryStatus();
        }
        throw fallbackError;
      }
    }
    console.error("[V2Adapter] Failed to fetch lottery status", error);
    throw error;
  }
};

export const playV2Lottery = async (): Promise<LotteryPlayResponse> => {
  try {
    const response = await v2Client.post<any>("/api/v2/lottery/play", {});
    const data = response.data;

    if (data?.game_data?.prize) {
      return data as LotteryPlayResponse;
    }

    const prize = data?.prize;

    return {
      result: data?.result,
      vault_earn: data?.vault_earn ?? 0,
      season_pass: data?.season_pass ?? null,
      streak_info: data?.streak_info ?? null,
      fever_gauge: data?.fever_gauge ?? null,
      next_action_available: data?.next_action_available ?? null,
      game_data: {
        prize,
        visual_grid: data?.game_data?.visual_grid ?? [],
        collection_piece: data?.game_data?.collection_piece ?? null,
      },
    } as LotteryPlayResponse;
  } catch (error) {
    console.error("[V2Adapter] Failed to play lottery", error);
    throw error;
  }
};

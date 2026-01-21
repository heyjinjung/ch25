/**
 * V2 Backend Adapter
 *
 * This adapter connects V2 frontend components to V2 backend endpoints.
 * Uses v2Client for proper authentication handling.
 */

import { v2Client } from "./client"; // V2 apiClient
import type {
  RouletteStatusResponse,
  DiceStatusResponse,
  LotteryStatusResponse,
  LotteryPrizeDto,
} from "./gameApi";
import type {
  DicePlayResponse,
  DiceRollRequest,
  LotteryPlayResponse,
  RoulettePlayRequest,
  RoulettePlayResponse,
} from "../types/gameAction";

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
    console.error("[V2Adapter] Failed to fetch roulette status", error);
    throw error;
  }
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
    };
  } catch (error) {
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

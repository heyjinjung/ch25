import { v2Client } from "./client";
import type {
  RoulettePlayResponse,
  DicePlayResponse,
  LotteryPlayResponse,
  RoulettePlayRequest,
  DiceRollRequest,
  DiceDoubleUpRequest,
  DiceDoubleUpResponse,
} from "../types/gameAction";
import type { GameTokenType } from "../../types/gameTokens";

export interface VaultStatusResponse {
  readonly eligible: boolean;
  readonly vaultBalance: number;
  readonly lockedBalance: number;
  readonly availableBalance: number;
  readonly ticketCount: number;
  readonly is_golden_hour_active: boolean;
  readonly golden_hour_multiplier: number;
  readonly golden_hour_remaining_seconds: number;
  readonly showModalOverride: string | null;
  readonly segment: string | null;
  readonly daily_play_count: number;
  readonly daily_play_target: number;
  readonly daily_vault_spent: number;
  readonly daily_vault_spent_target: number;
  readonly daily_deposit_confirmed: boolean;
  readonly withdrawal_count: number;
  readonly today_earnings: number;
  readonly minimum_withdrawal_amount: number;
}

// ============================================================================
// V2 Token Mapping
// ============================================================================
// V1 Legacy Token -> V2 Standard Ticket
const TOKEN_MAPPING: Partial<Record<GameTokenType, string>> = {
  ROULETTE_COIN: "ROULETTE_TICKET",
  DICE_TOKEN: "DICE_TICKET",
  LOTTERY_TICKET: "LOTTERY_TICKET",
  GOLD_KEY: "GOLD_KEY_TICKET",
  DIAMOND_KEY: "DIAMOND_TICKET",
  TRIAL_TOKEN: "TRIAL_TICKET",
  DIAMOND: "DIAMOND",
  PUZZLE_C1: "PUZZLE_C1",
  PUZZLE_C2: "PUZZLE_C2",
  PUZZLE_J: "PUZZLE_J",
  PUZZLE_M: "PUZZLE_M",
};

function mapTokenToV2(legacyToken: string): string {
  return TOKEN_MAPPING[legacyToken as GameTokenType] || legacyToken;
}

// ============================================================================
// Roulette API
// ============================================================================

export interface RouletteSegmentDto {
  readonly id: number;
  readonly label: string;
  readonly reward_type: string;
  readonly reward_amount: number;
  readonly slot_index: number;
  readonly is_fever_reward: boolean;
}

export interface RouletteStatusResponse {
  readonly config_id: number;
  readonly name: string;
  readonly max_daily_spins: number;
  readonly today_spins: number;
  readonly remaining_spins: number;
  readonly token_type: string;
  readonly token_balance: number;
  readonly segments: RouletteSegmentDto[];
}

export const getV2RouletteStatus = async (
  ticketType?: string,
): Promise<RouletteStatusResponse> => {
  try {
    const params = ticketType
      ? { ticket_type: mapTokenToV2(ticketType as GameTokenType) }
      : undefined;
    const response = await v2Client.get<RouletteStatusResponse>(
      "/api/v2/roulette/status",
      { params },
    );
    return response.data;
  } catch (error) {
    console.error("[gameApi] Failed to fetch V2 roulette status", error);
    throw error;
  }
};

export const playV2Roulette = async (
  request: RoulettePlayRequest,
): Promise<RoulettePlayResponse> => {
  try {
    const payload = {
      ticket_type: mapTokenToV2(request.ticket_type as string),
      bet_multiplier: request.bet_multiplier || 1,
    };
    const response = await v2Client.post<RoulettePlayResponse>(
      "/api/v2/roulette/play",
      payload,
    );
    return response.data;
  } catch (error) {
    console.error("[gameApi] Failed to play V2 roulette", error);
    throw error;
  }
};

// ============================================================================
// Dice API
// ============================================================================

export interface DiceStatusResponse {
  readonly config_id: number;
  readonly name: string;
  readonly max_daily_plays: number;
  readonly today_plays: number;
  readonly remaining_plays: number;
  readonly token_type: string;
  readonly token_balance: number;
  readonly event_active: boolean;
  readonly event_plays_done: number;
  readonly event_plays_max: number;
  readonly event_ineligible_reason?: string;
  readonly reward_config?: {
    win_reward_type?: string;
    win_reward_amount?: number;
    draw_reward_type?: string;
    draw_reward_amount?: number;
    lose_reward_type?: string;
    lose_reward_amount?: number;
  };
  readonly is_golden_hour?: boolean;
}

export const getV2DiceStatus = async (): Promise<DiceStatusResponse> => {
  try {
    const response = await v2Client.get<DiceStatusResponse>(
      "/api/v2/dice/status",
    );
    return response.data;
  } catch (error) {
    console.error("[gameApi] Failed to fetch V2 dice status", error);
    throw error;
  }
};

export const playV2Dice = async (
  request: DiceRollRequest,
): Promise<DicePlayResponse> => {
  try {
    const payload = {
      bet_amount: request.bet_amount,
      prediction: request.prediction || null,
    };
    const response = await v2Client.post<DicePlayResponse>(
      "/api/v2/dice/play",
      payload,
    );
    return response.data;
  } catch (error) {
    console.error("[gameApi] Failed to play V2 dice", error);
    throw error;
  }
};

export const playV2DiceDoubleUp = async (
  request: DiceDoubleUpRequest,
): Promise<DiceDoubleUpResponse> => {
  try {
    const response = await v2Client.post<DiceDoubleUpResponse>(
      "/api/v2/dice/double-up",
      request,
    );
    return response.data;
  } catch (error) {
    console.error("[gameApi] Failed to play V2 dice double-up", error);
    throw error;
  }
};

// ============================================================================
// Lottery API
// ============================================================================

export interface LotteryPrizeDto {
  readonly id: number;
  readonly label: string;
  readonly reward_type: string;
  readonly reward_amount: number;
  readonly stock?: number | null;
  readonly is_active?: boolean;
  readonly weight?: number;
}

export interface LotteryStatusResponse {
  readonly config_id: number;
  readonly name: string;
  readonly max_daily_tickets: number;
  readonly today_tickets: number;
  readonly remaining_tickets: number;
  readonly token_type: string;
  readonly token_balance: number;
  readonly prizes: LotteryPrizeDto[];
  readonly collectionProgress?: Record<string, number>;
}

export const getV2LotteryStatus = async (): Promise<LotteryStatusResponse> => {
  try {
    const response = await v2Client.get<LotteryStatusResponse>(
      "/api/v2/lottery/status",
    );
    return response.data;
  } catch (error) {
    console.error("[gameApi] Failed to fetch V2 lottery status", error);
    throw error;
  }
};

export const playV2Lottery = async (): Promise<LotteryPlayResponse> => {
  const response = await v2Client.post<LotteryPlayResponse>(
    "/api/v2/lottery/play",
    {},
  );
  return response.data;
};

// ============================================================================
// Puzzle Collection → Gold Key Exchange
// ============================================================================

export interface CraftPuzzleResponse {
  result: string;
  reward_token: string;
  reward_amount: number;
  consumed_tokens: Record<string, number>;
  message: string;
}

export interface CraftStatusResponse {
  can_craft: boolean;
  collection: Record<string, number>;
  required: Record<string, number>;
}

/**
 * 퍼즐 컬렉션 완성 → 골드키 교환
 * Required: C1 + C2 + J + M 각 1개 이상
 * Reward: GOLD_KEY_TICKET 1개
 */
export const craftPuzzleToGoldKey = async (): Promise<CraftPuzzleResponse> => {
  const response = await v2Client.post<CraftPuzzleResponse>(
    "/api/v2/exchange/craft-puzzle",
    {},
  );
  return response.data;
};

/**
 * 퍼즐 교환 가능 여부 및 현재 잔액 조회
 */
export const getCraftStatus = async (): Promise<CraftStatusResponse> => {
  const response = await v2Client.get<CraftStatusResponse>(
    "/api/v2/exchange/craft-status",
  );
  return response.data;
};

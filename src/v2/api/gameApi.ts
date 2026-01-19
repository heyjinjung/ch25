import { v2Client } from "./client";
import type {
  RoulettePlayResponse,
  DicePlayResponse,
  LotteryPlayResponse,
  RoulettePlayRequest,
  DiceRollRequest,
  DiceDoubleUpRequest,
  DiceDoubleUpResponse,
  LotteryScratchRequest,
  PuzzleCraftRequest,
  PuzzleCraftResponse,
} from "../types/gameAction";
import type { GameTokenType } from "../../types/gameTokens";

// ============================================================================
// V2 Token Mapping
// ============================================================================
// V1 Legacy Token -> V2 Standard Ticket
const TOKEN_MAPPING: Record<GameTokenType, string> = {
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

export const getV2RouletteStatus = async (ticketType?: string): Promise<RouletteStatusResponse> => {
  try {
    const params = ticketType ? { ticket_type: mapTokenToV2(ticketType as GameTokenType) } : undefined;
    const response = await v2Client.get<RouletteStatusResponse>("/api/v2/roulette/status", { params });
    return response.data;
  } catch (error) {
    console.error("[gameApi] Failed to fetch V2 roulette status", error);
    throw error;
  }
};

export const playV2Roulette = async (request: RoulettePlayRequest): Promise<RoulettePlayResponse> => {
  try {
    const payload = {
      ticket_type: mapTokenToV2(request.ticket_type),
      bet_multiplier: request.bet_multiplier || 1,
    };
    const response = await v2Client.post<RoulettePlayResponse>("/api/v2/roulette/play", payload);
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
}

export const getV2DiceStatus = async (): Promise<DiceStatusResponse> => {
  try {
    const response = await v2Client.get<DiceStatusResponse>("/api/v2/dice/status");
    return response.data;
  } catch (error) {
    console.error("[gameApi] Failed to fetch V2 dice status", error);
    throw error;
  }
};

export const playV2Dice = async (request: DiceRollRequest): Promise<DicePlayResponse> => {
  try {
    const payload = {
      bet_amount: request.bet_amount,
      prediction: request.prediction || null,
    };
    const response = await v2Client.post<DicePlayResponse>("/api/v2/dice/play", payload);
    return response.data;
  } catch (error) {
    console.error("[gameApi] Failed to play V2 dice", error);
    throw error;
  }
};

export const playV2DiceDoubleUp = async (request: DiceDoubleUpRequest): Promise<DiceDoubleUpResponse> => {
  try {
    const response = await v2Client.post<DiceDoubleUpResponse>("/api/v2/dice/double-up", request);
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
}

export interface LotteryStatusResponse {
  readonly config_id: number;
  readonly name: string;
  readonly max_daily_tickets: number;
  readonly today_tickets: number;
  readonly remaining_tickets: number;
  readonly token_type: string;
  readonly token_balance: number;
  readonly prize_preview: LotteryPrizeDto[];
  readonly collection_progress: Record<string, number>;
}

export const getV2LotteryStatus = async (): Promise<LotteryStatusResponse> => {
  try {
    const response = await v2Client.get<LotteryStatusResponse>("/api/v2/lottery/status");
    return response.data;
  } catch (error) {
    console.error("[gameApi] Failed to fetch V2 lottery status", error);
    throw error;
  }
};

export const playV2Lottery = async (request: LotteryScratchRequest): Promise<LotteryPlayResponse> => {
  try {
    const payload = {
      ticket_type: mapTokenToV2(request.ticket_type),
      selection_numbers: request.selection_numbers || null,
    };
    const response = await v2Client.post<LotteryPlayResponse>("/api/v2/lottery/play", payload);
    return response.data;
  } catch (error) {
    console.error("[gameApi] Failed to play V2 lottery", error);
    throw error;
  }
};

// ============================================================================
// Exchange/Craft API
// ============================================================================

export const craftV2Exchange = async (request: PuzzleCraftRequest): Promise<PuzzleCraftResponse> => {
  try {
    const response = await v2Client.post<PuzzleCraftResponse>("/api/v2/exchange/craft", request);
    return response.data;
  } catch (error) {
    console.error("[gameApi] Failed to craft V2 exchange", error);
    throw error;
  }
};

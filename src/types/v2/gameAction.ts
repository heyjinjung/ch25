import { z } from "zod";

import {
  animationTypeEnum,
  gameResultEnum,
  gameTypeEnum,
  rewardTypeEnum,
  ticketTypeEnum,
} from "./enums";

export const feverGaugeSchema = z.object({
  current: z.number().int(),
  max: z.number().int(),
  is_full: z.boolean(),
});

export const seasonPassSnapshotSchema = z.object({
  gained_xp: z.number().int(),
  current_level: z.number().int(),
  current_xp: z.number().int(),
  level_up: z.boolean(),
});

export const streakInfoSchema = z.object({
  current_streak: z.number().int(),
  today_completed: z.boolean(),
});

export const roulettePlayRequestSchema = z.object({
  ticket_type: ticketTypeEnum,
  bet_multiplier: z.number().int().default(1),
});

export const rouletteSegmentSchema = z.object({
  id: z.number().int(),
  label: z.string(),
  reward_type: rewardTypeEnum,
  reward_amount: z.number().int(),
  slot_index: z.number().int(),
  is_fever_reward: z.boolean(),
});

export const rouletteGameDataSchema = z.object({
  segment: rouletteSegmentSchema,
  animation_type: animationTypeEnum,
});

export const diceRollRequestSchema = z.object({
  bet_amount: z.number().int(),
  prediction: z.string().optional().nullable(),
});

export const diceGameDataSchema = z.object({
  user_dice: z.array(z.number().int()),
  dealer_dice: z.array(z.number().int()),
  user_sum: z.number().int(),
  dealer_sum: z.number().int(),
  outcome: gameResultEnum,
  reward_amount: z.number().int(),
  can_double_up: z.boolean(),
});

export const diceDoubleUpRequestSchema = z.object({
  previous_game_id: z.string(),
  choice: z.string(),
});

export const diceDoubleUpResponseSchema = z.object({
  result: gameResultEnum,
  final_amount: z.number().int(),
  is_bust: z.boolean(),
});

export const lotteryScratchRequestSchema = z.object({
  ticket_type: ticketTypeEnum,
  selection_numbers: z.array(z.number().int()).optional().nullable(),
});

export const lotteryPrizeSchema = z.object({
  id: z.number().int(),
  label: z.string(),
  reward_type: rewardTypeEnum,
  reward_amount: z.number().int(),
});

export const lotteryGameDataSchema = z.object({
  prize: lotteryPrizeSchema,
  visual_grid: z.array(z.array(z.string())),
  collection_piece: z.string().optional().nullable(),
});

export const gameActionEnvelopeSchema = z.object({
  result: gameResultEnum,
  vault_earn: z.number().int().default(0),
  season_pass: seasonPassSnapshotSchema.optional().nullable(),
  streak_info: streakInfoSchema.optional().nullable(),
  fever_gauge: feverGaugeSchema.optional().nullable(),
  next_action_available: z.array(z.string()).optional().nullable(),
});

export const roulettePlayResponseSchema = gameActionEnvelopeSchema.extend({
  game_data: rouletteGameDataSchema,
});

export const dicePlayResponseSchema = gameActionEnvelopeSchema.extend({
  game_data: diceGameDataSchema,
});

export const lotteryPlayResponseSchema = gameActionEnvelopeSchema.extend({
  game_data: lotteryGameDataSchema,
});

export const jackpotWinPayloadSchema = z.object({
  nickname: z.string(),
  game_type: gameTypeEnum,
  reward_amount: z.number().int(),
  is_mega: z.boolean(),
});

export type FeverGauge = z.infer<typeof feverGaugeSchema>;
export type SeasonPassSnapshot = z.infer<typeof seasonPassSnapshotSchema>;
export type StreakInfo = z.infer<typeof streakInfoSchema>;
export type RoulettePlayRequest = z.infer<typeof roulettePlayRequestSchema>;
export type RoulettePlayResponse = z.infer<typeof roulettePlayResponseSchema>;
export type DiceRollRequest = z.infer<typeof diceRollRequestSchema>;
export type DicePlayResponse = z.infer<typeof dicePlayResponseSchema>;
export type DiceDoubleUpRequest = z.infer<typeof diceDoubleUpRequestSchema>;
export type DiceDoubleUpResponse = z.infer<typeof diceDoubleUpResponseSchema>;
export type LotteryScratchRequest = z.infer<typeof lotteryScratchRequestSchema>;
export type LotteryPlayResponse = z.infer<typeof lotteryPlayResponseSchema>;
export type JackpotWinPayload = z.infer<typeof jackpotWinPayloadSchema>;

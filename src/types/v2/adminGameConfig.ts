import { z } from "zod";

import { rewardTypeEnum, ticketTypeEnum } from "./enums";

export const rouletteSegmentSchema = z.object({
  slot_index: z.number().int().min(0).max(5),
  label: z.string(),
  weight: z.number().int().min(0),
  reward_type: rewardTypeEnum,
  reward_amount: z.number().int(),
  is_jackpot: z.boolean().default(false),
});

export const rouletteConfigSchema = z.object({
  name: z.string(),
  ticket_type: ticketTypeEnum,
  is_active: z.boolean().default(true),
  max_daily_spins: z.number().int().min(0),
  grade: z.string().optional().nullable(),
  segments: z.array(rouletteSegmentSchema),
});

export const diceConfigSchema = z.object({
  name: z.string(),
  ticket_type: ticketTypeEnum,
  is_active: z.boolean().default(true),
  max_daily_plays: z.number().int().min(0),
  win_reward_type: rewardTypeEnum,
  win_reward_amount: z.number().int(),
  draw_reward_type: rewardTypeEnum,
  draw_reward_amount: z.number().int(),
  lose_reward_type: rewardTypeEnum,
  lose_reward_amount: z.number().int(),
});

export const lotteryPrizeSchema = z.object({
  label: z.string(),
  weight: z.number().int().min(0),
  stock: z.number().int().min(0).nullable().optional(),
  reward_type: rewardTypeEnum,
  reward_amount: z.number().int(),
  is_active: z.boolean().default(true),
});

export const lotteryConfigSchema = z.object({
  name: z.string(),
  ticket_type: ticketTypeEnum,
  is_active: z.boolean().default(true),
  max_daily_plays: z.number().int().min(0),
  prizes: z.array(lotteryPrizeSchema),
});

export type RouletteSegment = z.infer<typeof rouletteSegmentSchema>;
export type RouletteConfig = z.infer<typeof rouletteConfigSchema>;
export type DiceConfig = z.infer<typeof diceConfigSchema>;
export type LotteryPrize = z.infer<typeof lotteryPrizeSchema>;
export type LotteryConfig = z.infer<typeof lotteryConfigSchema>;

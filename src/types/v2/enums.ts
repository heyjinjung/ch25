import { z } from "zod";

export const rewardTypeEnum = z.enum([
  "POINT",
  "CC_POINT",
  "GAME_XP",
  "DIAMOND",
  "TICKET",
  "BUNDLE",
  "TICKET_BUNDLE",
  "NONE",
]);

export const ticketTypeEnum = z.enum([
  "ROULETTE_TICKET",
  "DICE_TICKET",
  "GOLD_KEY_TICKET",
  "DIAMOND_TICKET",
  "LOTTERY_TICKET",
]);

export const gameResultEnum = z.enum(["WIN", "LOSE", "DRAW"]);

export const animationTypeEnum = z.enum([
  "NORMAL",
  "SKIP",
  "DRAMATIC",
  "FEVER",
]);

export const gameTypeEnum = z.enum(["ROULETTE", "DICE", "LOTTERY"]);

export type RewardType = z.infer<typeof rewardTypeEnum>;
export type TicketType = z.infer<typeof ticketTypeEnum>;
export type GameResult = z.infer<typeof gameResultEnum>;
export type AnimationType = z.infer<typeof animationTypeEnum>;
export type GameType = z.infer<typeof gameTypeEnum>;

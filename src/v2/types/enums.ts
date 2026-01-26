import { z } from "zod";

export const rewardTypeEnum = z.enum([
  "NONE",
  "DIAMOND",
  "GOLD_KEY",
  "DIAMOND_KEY",
  "CASH_UNLOCK",
  "TICKET_BUNDLE",
  "TICKET_ROULETTE",
  "TICKET_LOTTERY",
  "TICKET_DICE",
  "POINT",
  "CC_POINT",
  "GAME_XP",
  "TICKET",
  "BUNDLE",
  "GIFTICON_BAEMIN",
  "GIFTICON_COMPOSE",
  "CHICKEN_GIFTICON_5000",
  "CHICKEN_GIFTICON_10000",
  "STARBUCKS_GIFTICON_2000",
  "STARBUCKS_GIFTICON_10000",
  "PIZZA_GIFTICON_5000",
  "PIZZA_GIFTICON_10000",
  "GOOGLE_GIFTICON_5000",
  "GOOGLE_GIFTICON_10000",
]);

export const ticketTypeEnum = z.enum([
  "ROULETTE_TICKET",
  "DICE_TICKET",
  "GOLD_KEY_TICKET",
  "DIAMOND_TICKET",
  "LOTTERY_TICKET",
  "TRIAL_TICKET",
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

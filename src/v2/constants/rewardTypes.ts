export const REWARD_TYPES = {
  NONE: "NONE",
  POINT: "POINT",
  TICKET: "TICKET", // Generic
  ROULETTE_TICKET: "ROULETTE_TICKET",
  DIAMOND_TICKET: "DIAMOND_TICKET",
  GOLDEN_TICKET: "GOLDEN_TICKET",
  XP: "XP",
} as const;

export const SOT_REWARD_TYPES = REWARD_TYPES;

export type RewardType = keyof typeof REWARD_TYPES;

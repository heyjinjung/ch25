/**
 * V2 Reward Types & Cost Types (SoT)
 * 백엔드: app/v2/schemas/v2_constants.py 와 동기화
 */

// =============================================================================
// RewardType - 보상 재화 타입 (기프티콘 포함)
// =============================================================================
export const REWARD_TYPES = {
  // === Core Vault Types ===
  VAULT: "VAULT",
  POINT: "POINT",
  CC_POINT: "CC_POINT",

  // === Game XP / Diamond ===
  GAME_XP: "GAME_XP",
  DIAMOND: "DIAMOND",

  // === Tickets ===
  TICKET: "TICKET",
  BUNDLE: "BUNDLE",
  TICKET_BUNDLE: "TICKET_BUNDLE",
  ROULETTE_TICKET: "ROULETTE_TICKET",
  DICE_TICKET: "DICE_TICKET",
  LOTTERY_TICKET: "LOTTERY_TICKET",
  GOLD_KEY_TICKET: "GOLD_KEY_TICKET",
  DIAMOND_TICKET: "DIAMOND_TICKET",
  TRIAL_TICKET: "TRIAL_TICKET",

  // === Fragments ===
  GOLD_KEY_FRAGMENT: "GOLD_KEY_FRAGMENT",
  DIAMOND_FRAGMENT: "DIAMOND_FRAGMENT",

  // === Puzzle Pieces ===
  PUZZLE_C1: "PUZZLE_C1",
  PUZZLE_C2: "PUZZLE_C2",
  PUZZLE_J: "PUZZLE_J",
  PUZZLE_M: "PUZZLE_M",

  // === Gifticons ===
  CHICKEN_GIFTICON_5000: "CHICKEN_GIFTICON_5000",
  CHICKEN_GIFTICON_10000: "CHICKEN_GIFTICON_10000",
  STARBUCKS_GIFTICON_2000: "STARBUCKS_GIFTICON_2000",
  STARBUCKS_GIFTICON_5000: "STARBUCKS_GIFTICON_5000",
  STARBUCKS_GIFTICON_10000: "STARBUCKS_GIFTICON_10000",
  CULTURE_VOUCHER_5000: "CULTURE_VOUCHER_5000",
  CULTURE_VOUCHER_10000: "CULTURE_VOUCHER_10000",

  // === Special ===
  NONE: "NONE",
} as const;

export const SOT_REWARD_TYPES = REWARD_TYPES;
export type RewardType = keyof typeof REWARD_TYPES;

// =============================================================================
// CostType - 결제 재화 타입 (기프티콘 제외)
// =============================================================================
export const COST_TYPES = {
  // === 금고 (Vault) ===
  VAULT: "VAULT",
  POINT: "POINT",
  CC_POINT: "CC_POINT",

  // === 게임 지갑 토큰 (GameWallet) ===
  DIAMOND: "DIAMOND",
  ROULETTE_TICKET: "ROULETTE_TICKET",
  DICE_TICKET: "DICE_TICKET",
  LOTTERY_TICKET: "LOTTERY_TICKET",
  GOLD_KEY_TICKET: "GOLD_KEY_TICKET",
  DIAMOND_TICKET: "DIAMOND_TICKET",
  TRIAL_TICKET: "TRIAL_TICKET",
  GOLD_KEY_FRAGMENT: "GOLD_KEY_FRAGMENT",
  DIAMOND_FRAGMENT: "DIAMOND_FRAGMENT",
  PUZZLE_C1: "PUZZLE_C1",
  PUZZLE_C2: "PUZZLE_C2",
  PUZZLE_J: "PUZZLE_J",
  PUZZLE_M: "PUZZLE_M",
} as const;

export const SOT_COST_TYPES = COST_TYPES;
export type CostType = keyof typeof COST_TYPES;

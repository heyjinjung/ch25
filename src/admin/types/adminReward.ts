import type { RewardType } from "../constants/rewardTypes";

// Admin-configured reward_type values.
// - Keep strict known types from REWARD_TYPES
// - Allow dynamic gifticon item_type format per SoT: {BRAND}_GIFTICON_{amount}
// - Allow legacy ticket aliases used in backend mappings
export type AdminRewardType =
  | RewardType
  | `${string}_GIFTICON_${number}`
  | `${string}_GIFTICON`
  | "TICKET_BUNDLE"
  | "ROULETTE_TICKET"
  | "DICE_TICKET"
  | "LOTTERY_TICKET";

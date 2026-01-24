// src/admin/constants/rewardTypes.ts

export const REWARD_TYPES = [
  // --- Common Currencies ---
  { value: "POINT", label: "금고 ?�립 (POINT)", group: "Common" },
  { value: "CC_POINT", label: "CC ?�인??(CC_POINT)", group: "Common" },
  { value: "GAME_XP", label: "?�즌 XP (GAME_XP)", group: "Common" },

  // --- Game Tickets (V2 Standard) ---
  { value: "ROULETTE_TICKET", label: "룰렛 ?�켓 (ROULETTE_TICKET)", group: "Ticket" },
  { value: "DICE_TICKET", label: "주사???�켓 (DICE_TICKET)", group: "Ticket" },
  { value: "LOTTERY_TICKET", label: "복권 ?�켓 (LOTTERY_TICKET)", group: "Ticket" },
  { value: "TRIAL_TICKET", label: "체험 ?�켓 (TRIAL_TICKET)", group: "Ticket" },

  // --- Keys & Premium (V2 Standard) ---
  { value: "GOLD_KEY_TICKET", label: "골드 ???�켓 (GOLD_KEY_TICKET)", group: "Key" },
  { value: "DIAMOND_TICKET", label: "?�이???�켓 (DIAMOND_TICKET)", group: "Key" },
  { value: "GOLD_KEY_FRAGMENT", label: "골드 ??조각 (FRAGMENT)", group: "Key" },
  { value: "DIAMOND_FRAGMENT", label: "?�이??조각 (FRAGMENT)", group: "Key" },
  { value: "DIAMOND", label: "?�이??(DIAMOND)", group: "Premium" },

  // --- Real-world / Gifticons ---
  { value: "GIFTICON_BAEMIN", label: "배�? ?�품�?(GIFTICON_BAEMIN)", group: "Gifticon" },
  { value: "GIFTICON_COMPOSE", label: "컴포�?커피 (GIFTICON_COMPOSE)", group: "Gifticon" },
  { value: "CC_COIN_GIFTICON", label: "?�씨코인 교환�?(CC_COIN_GIFTICON)", group: "Gifticon" },

  // --- Bundles ---
  { value: "BUNDLE", label: "종합 번들 (BUNDLE)", group: "Bundle" },

  // --- Collections ---
  { value: "PUZZLE_C", label: "?�즐 C (PUZZLE_C)", group: "Collection" },
  { value: "PUZZLE_J", label: "?�즐 J (PUZZLE_J)", group: "Collection" },
  { value: "PUZZLE_M", label: "?�즐 M (PUZZLE_M)", group: "Collection" },

  // --- Special / Legacy ---
  { value: "NONE", label: "?�음 (NONE)", group: "Etc" },
] as const;

export type RewardType = typeof REWARD_TYPES[number]["value"] | string;

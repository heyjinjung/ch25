// src/admin/constants/rewardTypes.ts

export const REWARD_TYPES = [
  // --- Common Currencies ---
  { value: "POINT", label: "금고 적립 (POINT)", group: "Common" },
  { value: "CC_POINT", label: "CC 포인트 (CC_POINT)", group: "Common" },
  { value: "GAME_XP", label: "시즌 XP (GAME_XP)", group: "Common" },
  
  // --- Game Tickets (Canonical) ---
  { value: "TICKET_ROULETTE", label: "룰렛 티켓 (TICKET_ROULETTE)", group: "Ticket" },
  { value: "TICKET_DICE", label: "주사위 티켓 (TICKET_DICE)", group: "Ticket" },
  { value: "TICKET_LOTTERY", label: "복권 티켓 (TICKET_LOTTERY)", group: "Ticket" },

  // --- Keys & Premium ---
  { value: "GOLD_KEY", label: "골드 키 (GOLD_KEY)", group: "Key" },
  { value: "DIAMOND_KEY", label: "다이아 키 (DIAMOND_KEY)", group: "Key" },
  { value: "DIAMOND", label: "다이아 (DIAMOND)", group: "Premium" },

  // --- Real-world / Gifticons ---
  { value: "GIFTICON_BAEMIN", label: "배민 상품권 (GIFTICON_BAEMIN)", group: "Gifticon" },
  { value: "GIFTICON_COMPOSE", label: "컴포즈 커피 (GIFTICON_COMPOSE)", group: "Gifticon" },
  { value: "CC_COIN_GIFTICON", label: "씨씨코인 교환권 (CC_COIN_GIFTICON)", group: "Gifticon" },

  // --- Bundles ---
  { value: "BUNDLE", label: "종합 번들 (BUNDLE)", group: "Bundle" },
  
  // --- Special / Legacy ---
  { value: "NONE", label: "없음 (NONE)", group: "Etc" },
] as const;

export type RewardType = typeof REWARD_TYPES[number]["value"] | string;

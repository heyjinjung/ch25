// src/admin/constants/rewardTypes.ts

export const REWARD_TYPES = [
  { value: "POINT", label: "포인트" },
  // { value: "COUPON", label: "쿠폰" }, // [REMOVED]
  { value: "NONE", label: "없음" },
  { value: "GOLD_KEY", label: "골드 키" },
  { value: "DIAMOND_KEY", label: "다이아 키" },
  { value: "TICKET_ROULETTE", label: "룰렛 티켓" },
  { value: "TICKET_DICE", label: "주사위 티켓" },
  { value: "TICKET_LOTTERY", label: "복권 티켓" },
] as const;

export type RewardType = typeof REWARD_TYPES[number]["value"];


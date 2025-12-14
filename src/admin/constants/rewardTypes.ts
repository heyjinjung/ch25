// src/admin/constants/rewardTypes.ts
// 보상 타입 선택 옵션

export const REWARD_TYPES = [
  { value: "POINT", label: "포인트" },
  { value: "COUPON", label: "쿠폰" },
  { value: "NONE", label: "없음" },
  { value: "TICKET_ROULETTE", label: "룰렛 티켓" },
  { value: "TICKET_DICE", label: "주사위 티켓" },
  { value: "TICKET_LOTTERY", label: "복권 티켓" },
] as const;

export type RewardType = typeof REWARD_TYPES[number]["value"];

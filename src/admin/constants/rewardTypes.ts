// src/admin/constants/rewardTypes.ts

export const REWARD_TYPES = [
  { value: "POINT", label: "금고 적립(POINT)" },
  { value: "GAME_XP", label: "게임 경험치(XP)" },
  // { value: "COUPON", label: "쿠폰" }, // [REMOVED]
  { value: "GIFTICON_BAEMIN", label: "배민 기프티콘(지급대기)" },
  { value: "CC_COIN_GIFTICON", label: "씨씨코인 기프티콘(지급대기)" },
  { value: "NONE", label: "없음" },
  { value: "DIAMOND", label: "다이아" },
  { value: "GOLD_KEY", label: "골드 키" },
  { value: "DIAMOND_KEY", label: "다이아 키" },
  { value: "TICKET_ROULETTE", label: "룰렛 티켓" },
  { value: "TICKET_DICE", label: "주사위 티켓" },
  { value: "TICKET_LOTTERY", label: "복권 티켓" },
] as const;

export type RewardType = typeof REWARD_TYPES[number]["value"];


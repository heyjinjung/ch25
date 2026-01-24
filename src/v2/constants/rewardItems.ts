export type RewardCategory =
  | "GAME_TICKET"
  | "INVENTORY"
  | "VAULT"
  | "POINT"
  | "SYSTEM";

export type RewardItem = {
  value: string;
  label: string;
  category?: RewardCategory;
};

export const REWARD_ITEMS: RewardItem[] = [
  { value: "NONE", label: "없음", category: "SYSTEM" },
  { value: "VAULT", label: "금고 포인트 (P)", category: "VAULT" },
  { value: "POINT", label: "포인트 (P)", category: "POINT" },
  { value: "CC_POINT", label: "CC 포인트", category: "POINT" },
  { value: "GAME_XP", label: "경험치 (XP)", category: "SYSTEM" },
  { value: "TICKET", label: "만능 티켓", category: "SYSTEM" },
  { value: "TICKET_BUNDLE", label: "티켓 묶음", category: "SYSTEM" },
  { value: "BUNDLE", label: "복합 보상", category: "SYSTEM" },
  { value: "ROULETTE_TICKET", label: "룰렛 티켓", category: "GAME_TICKET" },
  { value: "DICE_TICKET", label: "다이스 티켓", category: "GAME_TICKET" },
  { value: "LOTTERY_TICKET", label: "복권 티켓", category: "GAME_TICKET" },
  {
    value: "GOLD_KEY_TICKET",
    label: "골드 열쇠 티켓",
    category: "GAME_TICKET",
  },
  {
    value: "DIAMOND_TICKET",
    label: "다이아몬드 티켓",
    category: "GAME_TICKET",
  },
  { value: "TRIAL_TICKET", label: "체험 티켓", category: "GAME_TICKET" },
  {
    value: "GOLD_KEY_FRAGMENT",
    label: "골드 열쇠 조각",
    category: "GAME_TICKET",
  },
  {
    value: "DIAMOND_FRAGMENT",
    label: "다이아몬드 조각",
    category: "GAME_TICKET",
  },
  { value: "PUZZLE_C1", label: "퍼즐 조각 C1", category: "GAME_TICKET" },
  { value: "PUZZLE_C2", label: "퍼즐 조각 C2", category: "GAME_TICKET" },
  { value: "PUZZLE_J", label: "퍼즐 조각 J", category: "GAME_TICKET" },
  { value: "PUZZLE_M", label: "퍼즐 조각 M", category: "GAME_TICKET" },
  { value: "DIAMOND", label: "다이아몬드", category: "GAME_TICKET" },
  {
    value: "CHICKEN_GIFTICON_5000",
    label: "치킨 기프티콘 5천원",
    category: "INVENTORY",
  },
  {
    value: "CHICKEN_GIFTICON_10000",
    label: "치킨 기프티콘 1만원",
    category: "INVENTORY",
  },
  {
    value: "STARBUCKS_GIFTICON_2000",
    label: "스타벅스 기프티콘 2천원",
    category: "INVENTORY",
  },
  {
    value: "STARBUCKS_GIFTICON_10000",
    label: "스타벅스 기프티콘 1만원",
    category: "INVENTORY",
  },
  {
    value: "PIZZA_GIFTICON_5000",
    label: "피자 기프티콘 5천원",
    category: "INVENTORY",
  },
  {
    value: "PIZZA_GIFTICON_10000",
    label: "피자 기프티콘 1만원",
    category: "INVENTORY",
  },
  {
    value: "GOOGLE_GIFTICON_5000",
    label: "구글 기프트카드 5천원",
    category: "INVENTORY",
  },
  {
    value: "GOOGLE_GIFTICON_10000",
    label: "구글 기프트카드 1만원",
    category: "INVENTORY",
  },
];

export const getRewardItemLabel = (value: string) => {
  const found = REWARD_ITEMS.find((item) => item.value === value);
  return found ? found.label : value;
};

export const getInventoryRewardItems = (): RewardItem[] => {
  const filtered = REWARD_ITEMS.filter((item) => item.category === "INVENTORY");
  return filtered.length > 0 ? filtered : REWARD_ITEMS;
};

export const getWalletRewardItems = (): RewardItem[] =>
  REWARD_ITEMS.filter((item) =>
    ["GAME_TICKET", "VAULT", "POINT"].includes(item.category ?? ""),
  );

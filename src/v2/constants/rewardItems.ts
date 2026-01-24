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
  { value: "POINT", label: "포인트 (P)", category: "POINT" },
  {
    value: "ROULETTE_TICKET",
    label: "일반 룰렛 티켓",
    category: "GAME_TICKET",
  },
  { value: "DIAMOND_TICKET", label: "다이아 티켓", category: "GAME_TICKET" },
  { value: "GOLDEN_TICKET", label: "황금 티켓", category: "GAME_TICKET" },
  { value: "XP", label: "경험치 (XP)", category: "SYSTEM" },
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

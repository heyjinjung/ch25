/**
 * V2 보상 ?�이???��? ?�수 (SoT 준??
 *
 * 근거 문서:
 * - docs/v2_specs/01_core/v2_item_inventory_sot_ko.md (?�이??분류)
 * - docs/v2_specs/01_core/v2_reward_type_standard_sot_ko.md (보상 ?�??
 * - docs/v2_specs/01_core/v2_gifticon_naming_sot_ko.md (기프?�콘 명칭)
 *
 * 최종 ?�데?�트: 2026-01-21
 * 버전: v2.1 (공통 지�?목록 ?�렬)
 */

export type RewardCategory =
  | "GAME_TICKET"
  | "VAULT"
  | "PREMIUM_TICKET"
  | "FRAGMENT"
  | "PUZZLE"
  | "CURRENCY"
  | "GIFTICON"
  | "SPECIAL";

export interface RewardItem {
  value: string;
  label: string;
  category: RewardCategory;
  storage:
    | "UserGameWallet"
    | "User.vault_locked_balance"
    | "UserInventoryItem"
    | "N/A";
  description?: string;
}

/**
 * V2 ?��? 보상 ?�이??목록 (SoT 기�?)
 * �?10�?카테고리, 30+ ?�이??
 */
export const REWARD_ITEMS: readonly RewardItem[] = [
  // ========== 1. 게임 ?�켓 (Game Tickets) ==========
  {
    value: "ROULETTE_TICKET",
    label: "룰렛 ?�켓",
    category: "GAME_TICKET",
    storage: "UserGameWallet",
    description: "룰렛 게임 참여�?,
  },
  {
    value: "DICE_TICKET",
    label: "?�이???�켓",
    category: "GAME_TICKET",
    storage: "UserGameWallet",
    description: "주사??게임 참여�?,
  },
  {
    value: "LOTTERY_TICKET",
    label: "복권 ?�켓",
    category: "GAME_TICKET",
    storage: "UserGameWallet",
    description: "즉석 복권 참여�?,
  },

  // ========== 2. 금고 (Vault - Virtual Token) ==========
  {
    value: "VAULT",
    label: "금고 ?�인??(P)",
    category: "VAULT",
    storage: "User.vault_locked_balance",
    description: "출금 가???�금???�산",
  },

  // ========== 3. ?�리미엄 ?�켓 (Premium Tickets) ==========
  {
    value: "GOLD_KEY_TICKET",
    label: "골드 ?�쇠 ?�켓 (S�?",
    category: "PREMIUM_TICKET",
    storage: "UserGameWallet",
    description: "S�??�품 교환�?,
  },
  {
    value: "DIAMOND_TICKET",
    label: "?�이?�몬???�켓 (SS�?",
    category: "PREMIUM_TICKET",
    storage: "UserGameWallet",
    description: "최상???��? ?�화",
  },

  // ========== 4. 조각 (Fragments) ==========
  {
    value: "GOLD_KEY_FRAGMENT",
    label: "골드 ?�쇠 조각 (x10)",
    category: "FRAGMENT",
    storage: "UserGameWallet",
    description: "10�?모으�?골드 ?�쇠 ?�켓 1�?,
  },
  {
    value: "DIAMOND_FRAGMENT",
    label: "?�이?�몬??조각 (x30)",
    category: "FRAGMENT",
    storage: "UserGameWallet",
    description: "30�?모으�??�이?�몬???�켓 1�?,
  },

  // ========== 5. 복권 ?�즐 조각 (Lottery Puzzle Pieces) ==========
  {
    value: "PUZZLE_C1",
    label: "?�즐 조각 C1 (?�첨)",
    category: "PUZZLE",
    storage: "UserGameWallet",
    description: "복권 ?�첨???�즐 조각",
  },
  {
    value: "PUZZLE_C2",
    label: "?�즐 조각 C2 (?�첨)",
    category: "PUZZLE",
    storage: "UserGameWallet",
    description: "복권 ?�첨???�즐 조각",
  },
  {
    value: "PUZZLE_J",
    label: "?�즐 조각 J (?�첨)",
    category: "PUZZLE",
    storage: "UserGameWallet",
    description: "복권 ?�첨???�즐 조각",
  },
  {
    value: "PUZZLE_M",
    label: "?�즐 조각 M (?�첨)",
    category: "PUZZLE",
    storage: "UserGameWallet",
    description: "복권 ?�첨???�즐 조각",
  },

  // ========== 6. ?�화 (Currency) ==========
  {
    value: "DIAMOND",
    label: "?�이?�몬??(?�화)",
    category: "CURRENCY",
    storage: "UserGameWallet",
    description: "미션 리워?? ?�점 ?�화",
  },

  // ========== 7. 기프?�콘 (Gifticoms) ==========
  {
    value: "CHICKEN_GIFTICON_5000",
    label: "치킨 기프?�콘 5천원",
    category: "GIFTICON",
    storage: "UserInventoryItem",
    description: "치킨 브랜??모바???�품�?,
  },
  {
    value: "CHICKEN_GIFTICON_10000",
    label: "치킨 기프?�콘 1만원",
    category: "GIFTICON",
    storage: "UserInventoryItem",
    description: "치킨 브랜??모바???�품�?,
  },
  {
    value: "STARBUCKS_GIFTICON_2000",
    label: "?��?벅스 기프?�콘 2천원",
    category: "GIFTICON",
    storage: "UserInventoryItem",
    description: "?��?벅스 모바???�품�?,
  },
  {
    value: "STARBUCKS_GIFTICON_10000",
    label: "?��?벅스 기프?�콘 1만원",
    category: "GIFTICON",
    storage: "UserInventoryItem",
    description: "?��?벅스 모바???�품�?,
  },
  {
    value: "PIZZA_GIFTICON_5000",
    label: "?�자 기프?�콘 5천원",
    category: "GIFTICON",
    storage: "UserInventoryItem",
    description: "?�자 브랜??모바???�품�?,
  },
  {
    value: "PIZZA_GIFTICON_10000",
    label: "?�자 기프?�콘 1만원",
    category: "GIFTICON",
    storage: "UserInventoryItem",
    description: "?�자 브랜??모바???�품�?,
  },
  {
    value: "GOOGLE_GIFTICON_5000",
    label: "구�? 기프?�콘 5천원",
    category: "GIFTICON",
    storage: "UserInventoryItem",
    description: "구�? ?�레???�품�?,
  },
  {
    value: "GOOGLE_GIFTICON_10000",
    label: "구�? 기프?�콘 1만원",
    category: "GIFTICON",
    storage: "UserInventoryItem",
    description: "구�? ?�레???�품�?,
  },

  // ========== 8. ?�수 (Special) ==========
  {
    value: "NONE",
    label: "?�음 (보상 ?�음)",
    category: "SPECIAL",
    storage: "N/A",
    description: "No-op, 보상 지�??�음",
  },
] as const;

export type RewardItemValue = (typeof REWARD_ITEMS)[number]["value"];

/**
 * 카테고리�?보상 ?�이???�터�?
 */
export const getRewardItemsByCategory = (
  category: RewardCategory,
): readonly RewardItem[] => {
  return REWARD_ITEMS.filter((item) => item.category === category);
};

/**
 * ?�러 카테고리???�하??보상 ?�이???�터�?
 */
export const getRewardItemsByCategories = (
  categories: RewardCategory[],
): readonly RewardItem[] => {
  return REWARD_ITEMS.filter((item) => categories.includes(item.category));
};

/**
 * 보상 ?�이??값으�??�체 ?�보 조회
 */
export const getRewardItem = (value: string): RewardItem | undefined => {
  return REWARD_ITEMS.find((item) => item.value === value);
};

/**
 * 보상 ?�이??값으�??�벨 조회
 */
export const getRewardItemLabel = (value: string): string => {
  return getRewardItem(value)?.label || value;
};

/**
 * Wallet(GameWallet) ?�?�소 ?�이?�만 ?�터�?
 */
export const getWalletRewardItems = (): readonly RewardItem[] => {
  return REWARD_ITEMS.filter((item) => item.storage === "UserGameWallet");
};

/**
 * Inventory ?�?�소 ?�이?�만 ?�터�?
 */
export const getInventoryRewardItems = (): readonly RewardItem[] => {
  return REWARD_ITEMS.filter((item) => item.storage === "UserInventoryItem");
};

/**
 * Vault ?�외??모든 ?�이??(?�반 보상??
 */
export const getNonVaultRewardItems = (): readonly RewardItem[] => {
  return REWARD_ITEMS.filter((item) => item.category !== "VAULT");
};

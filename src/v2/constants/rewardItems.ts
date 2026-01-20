/**
 * V2 보상 아이템 표준 상수 (SoT 준수)
 * 
 * 근거 문서:
 * - docs/v2_specs/01_core/v2_item_inventory_sot_ko.md (아이템 분류)
 * - docs/v2_specs/01_core/v2_reward_type_standard_sot_ko.md (보상 타입)
 * - docs/v2_specs/01_core/v2_gifticon_naming_sot_ko.md (기프티콘 명칭)
 * 
 * 최종 업데이트: 2026-01-20
 * 버전: v2.0 (SoT 완전 준수)
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
  storage: "UserGameWallet" | "User.vault_locked_balance" | "UserInventoryItem" | "N/A";
  description?: string;
}

/**
 * V2 표준 보상 아이템 목록 (SoT 기준)
 * 총 10개 카테고리, 30+ 아이템
 */
export const REWARD_ITEMS: readonly RewardItem[] = [
  // ========== 1. 게임 티켓 (Game Tickets) ==========
  {
    value: "ROULETTE_TICKET",
    label: "룰렛 티켓",
    category: "GAME_TICKET",
    storage: "UserGameWallet",
    description: "룰렛 게임 참여권",
  },
  {
    value: "DICE_TICKET",
    label: "다이스 티켓",
    category: "GAME_TICKET",
    storage: "UserGameWallet",
    description: "주사위 게임 참여권",
  },
  {
    value: "LOTTERY_TICKET",
    label: "복권 티켓",
    category: "GAME_TICKET",
    storage: "UserGameWallet",
    description: "즉석 복권 참여권",
  },

  // ========== 2. 금고 (Vault - Virtual Token) ==========
  {
    value: "VAULT",
    label: "금고 포인트 (P)",
    category: "VAULT",
    storage: "User.vault_locked_balance",
    description: "출금 가능 현금성 자산",
  },

  // ========== 3. 프리미엄 티켓 (Premium Tickets) ==========
  {
    value: "GOLD_KEY_TICKET",
    label: "골드 열쇠 티켓 (S급)",
    category: "PREMIUM_TICKET",
    storage: "UserGameWallet",
    description: "S급 상품 교환권",
  },
  {
    value: "DIAMOND_TICKET",
    label: "다이아몬드 티켓 (SS급)",
    category: "PREMIUM_TICKET",
    storage: "UserGameWallet",
    description: "최상위 희귀 재화",
  },

  // ========== 4. 조각 (Fragments) ==========
  {
    value: "GOLD_KEY_FRAGMENT",
    label: "골드 열쇠 조각 (x10)",
    category: "FRAGMENT",
    storage: "UserGameWallet",
    description: "10개 모으면 골드 열쇠 티켓 1개",
  },
  {
    value: "DIAMOND_FRAGMENT",
    label: "다이아몬드 조각 (x30)",
    category: "FRAGMENT",
    storage: "UserGameWallet",
    description: "30개 모으면 다이아몬드 티켓 1개",
  },

  // ========== 5. 복권 퍼즐 조각 (Lottery Puzzle Pieces) ==========
  {
    value: "PUZZLE_C1",
    label: "퍼즐 조각 C1 (당첨)",
    category: "PUZZLE",
    storage: "UserGameWallet",
    description: "복권 당첨용 퍼즐 조각",
  },
  {
    value: "PUZZLE_C2",
    label: "퍼즐 조각 C2 (당첨)",
    category: "PUZZLE",
    storage: "UserGameWallet",
    description: "복권 당첨용 퍼즐 조각",
  },
  {
    value: "PUZZLE_J",
    label: "퍼즐 조각 J (당첨)",
    category: "PUZZLE",
    storage: "UserGameWallet",
    description: "복권 당첨용 퍼즐 조각",
  },
  {
    value: "PUZZLE_M",
    label: "퍼즐 조각 M (당첨)",
    category: "PUZZLE",
    storage: "UserGameWallet",
    description: "복권 당첨용 퍼즐 조각",
  },

  // ========== 6. 재화 (Currency) ==========
  {
    value: "DIAMOND",
    label: "다이아몬드 (재화)",
    category: "CURRENCY",
    storage: "UserGameWallet",
    description: "미션 리워드, 상점 재화",
  },

  // ========== 7. 기프티콘 (Gifticoms) ==========
  {
    value: "CHICKEN_GIFTICON_5000",
    label: "치킨 기프티콘 5천원",
    category: "GIFTICON",
    storage: "UserInventoryItem",
    description: "치킨 브랜드 모바일 상품권",
  },
  {
    value: "CHICKEN_GIFTICON_10000",
    label: "치킨 기프티콘 1만원",
    category: "GIFTICON",
    storage: "UserInventoryItem",
    description: "치킨 브랜드 모바일 상품권",
  },
  {
    value: "STARBUCKS_GIFTICON_2000",
    label: "스타벅스 기프티콘 2천원",
    category: "GIFTICON",
    storage: "UserInventoryItem",
    description: "스타벅스 모바일 상품권",
  },
  {
    value: "STARBUCKS_GIFTICON_10000",
    label: "스타벅스 기프티콘 1만원",
    category: "GIFTICON",
    storage: "UserInventoryItem",
    description: "스타벅스 모바일 상품권",
  },
  {
    value: "PIZZA_GIFTICON_5000",
    label: "피자 기프티콘 5천원",
    category: "GIFTICON",
    storage: "UserInventoryItem",
    description: "피자 브랜드 모바일 상품권",
  },
  {
    value: "PIZZA_GIFTICON_10000",
    label: "피자 기프티콘 1만원",
    category: "GIFTICON",
    storage: "UserInventoryItem",
    description: "피자 브랜드 모바일 상품권",
  },
  {
    value: "GOOGLE_GIFTICON_5000",
    label: "구글 기프티콘 5천원",
    category: "GIFTICON",
    storage: "UserInventoryItem",
    description: "구글 플레이 상품권",
  },
  {
    value: "GOOGLE_GIFTICON_10000",
    label: "구글 기프티콘 1만원",
    category: "GIFTICON",
    storage: "UserInventoryItem",
    description: "구글 플레이 상품권",
  },

  // ========== 8. 특수 (Special) ==========
  {
    value: "NONE",
    label: "없음 (보상 없음)",
    category: "SPECIAL",
    storage: "N/A",
    description: "No-op, 보상 지급 없음",
  },
] as const;

export type RewardItemValue = (typeof REWARD_ITEMS)[number]["value"];

/**
 * 카테고리별 보상 아이템 필터링
 */
export const getRewardItemsByCategory = (
  category: RewardCategory
): readonly RewardItem[] => {
  return REWARD_ITEMS.filter((item) => item.category === category);
};

/**
 * 여러 카테고리에 속하는 보상 아이템 필터링
 */
export const getRewardItemsByCategories = (
  categories: RewardCategory[]
): readonly RewardItem[] => {
  return REWARD_ITEMS.filter((item) => categories.includes(item.category));
};

/**
 * 보상 아이템 값으로 전체 정보 조회
 */
export const getRewardItem = (value: string): RewardItem | undefined => {
  return REWARD_ITEMS.find((item) => item.value === value);
};

/**
 * 보상 아이템 값으로 라벨 조회
 */
export const getRewardItemLabel = (value: string): string => {
  return getRewardItem(value)?.label || value;
};

/**
 * Wallet(GameWallet) 저장소 아이템만 필터링
 */
export const getWalletRewardItems = (): readonly RewardItem[] => {
  return REWARD_ITEMS.filter((item) => item.storage === "UserGameWallet");
};

/**
 * Inventory 저장소 아이템만 필터링
 */
export const getInventoryRewardItems = (): readonly RewardItem[] => {
  return REWARD_ITEMS.filter((item) => item.storage === "UserInventoryItem");
};

/**
 * Vault 제외한 모든 아이템 (일반 보상용)
 */
export const getNonVaultRewardItems = (): readonly RewardItem[] => {
  return REWARD_ITEMS.filter((item) => item.category !== "VAULT");
};

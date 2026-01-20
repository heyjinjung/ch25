/**
 * V2 Admin 보상 아이템 표준 상수
 * 모든 보상 관련 드롭다운에서 일관된 옵션을 제공하기 위한 중앙 집중식 정의
 */

export const REWARD_ITEMS = [
  { value: "ROULETTE_TICKET", label: "골드 티켓(지갑)", category: "TICKET" },
  { value: "DICE_TICKET", label: "주사위 티켓(지갑)", category: "TICKET" },
  { value: "LOTTERY_TICKET", label: "복권 티켓(지갑)", category: "TICKET" },
  { value: "DIAMOND_KEY", label: "다이아몬드 열쇠", category: "ITEM" },
  { value: "EXCHANGE_KEY_PIECE", label: "환율열쇠 조각", category: "ITEM" },
  { value: "COLOR_DIAMOND", label: "컬러 다이아몬드", category: "ITEM" },
  { value: "DIAMOND_POINT", label: "다이아 포인트", category: "POINT" },
  { value: "UNIVERSAL_TICKET", label: "만능 티켓", category: "TICKET" },
  { value: "CC_COIN_KILLUN", label: "씨씨코인 킬런", category: "COIN" },
  { value: "COLOR_RED_5000", label: "컬러(빨강) 5000", category: "CURRENCY" },
  { value: "COLOR_RED_10000", label: "컬러(빨강) 10000", category: "CURRENCY" },
  { value: "COLOR_RED_18000", label: "컬러(빨강) 18000", category: "CURRENCY" },
  { value: "COLOR_REDWATER_5000", label: "컬러(빨강수) 5000", category: "CURRENCY" },
] as const;

export type RewardCategory = "TICKET" | "ITEM" | "POINT" | "COIN" | "CURRENCY";
export type RewardItemValue = (typeof REWARD_ITEMS)[number]["value"];

/**
 * 카테고리별 보상 아이템 필터링 헬퍼 함수
 */
export const getRewardItemsByCategory = (category: RewardCategory) => {
  return REWARD_ITEMS.filter((item) => item.category === category);
};

/**
 * 여러 카테고리에 속하는 보상 아이템 필터링
 */
export const getRewardItemsByCategories = (categories: RewardCategory[]) => {
  return REWARD_ITEMS.filter((item) => categories.includes(item.category));
};

/**
 * 보상 아이템 값으로 라벨 조회
 */
export const getRewardItemLabel = (value: string): string => {
  return REWARD_ITEMS.find((item) => item.value === value)?.label || value;
};

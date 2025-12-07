// src/api/fallbackData.ts
// Provides demo fallback data when backend APIs are unavailable so the UI remains interactive.
import { NullableFeatureType } from "../types/features";

export interface FallbackRouletteSegment {
  label: string;
  weight: number;
  isJackpot?: boolean;
  reward_type?: string;
  reward_amount?: number;
  slot_index?: number;
}

export interface FallbackRouletteState {
  remainingSpins: number;
  segments: FallbackRouletteSegment[];
}

const rouletteState: FallbackRouletteState = {
  remainingSpins: 0, // 0 = unlimited sentinel
  segments: [
    { label: "100 코인", weight: 30, reward_type: "POINT", reward_amount: 100, slot_index: 0 },
    { label: "200 코인", weight: 25, reward_type: "POINT", reward_amount: 200, slot_index: 1 },
    { label: "500 코인", weight: 15, reward_type: "POINT", reward_amount: 500, slot_index: 2 },
    { label: "크리스탈", weight: 10, reward_type: "TOKEN", reward_amount: 1, slot_index: 3 },
    { label: "꽝", weight: 15, reward_type: "NONE", reward_amount: 0, slot_index: 4 },
    { label: "🎰 JACKPOT", weight: 5, isJackpot: true, reward_type: "POINT", reward_amount: 10000, slot_index: 5 },
  ],
};

export const getFallbackRouletteStatus = () => ({
  feature_type: "ROULETTE" as const,
  remaining_spins: rouletteState.remainingSpins,
  token_type: "ROULETTE_COIN" as const,
  token_balance: 10,
  segments: rouletteState.segments.map((segment) => ({ ...segment })),
});

export const playFallbackRoulette = () => {
  const totalWeight = rouletteState.segments.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  let selectedIndex = 0;
  
  for (let i = 0; i < rouletteState.segments.length; i++) {
    random -= rouletteState.segments[i].weight;
    if (random <= 0) {
      selectedIndex = i;
      break;
    }
  }

  const segment = rouletteState.segments[selectedIndex];

  return {
    selected_index: selectedIndex,
    segment,
    remaining_spins: rouletteState.remainingSpins,
    reward_type: segment.reward_type,
    reward_value: segment.reward_amount,
    message: "데모 모드 결과입니다.",
  };
};

const diceState = {
  remainingPlays: 0, // 0 = unlimited sentinel
  tokenBalance: 10,
};

const rollDie = () => Math.floor(Math.random() * 6) + 1;

export const getFallbackDiceStatus = () => ({
  feature_type: "DICE" as const,
  remaining_plays: diceState.remainingPlays,
  token_type: "DICE_TOKEN" as const,
  token_balance: diceState.tokenBalance,
});

export const playFallbackDice = () => {
  const userDice = [rollDie(), rollDie()];
  const dealerDice = [rollDie(), rollDie()];
  const userTotal = userDice.reduce((sum, value) => sum + value, 0);
  const dealerTotal = dealerDice.reduce((sum, value) => sum + value, 0);

  let result: "WIN" | "LOSE" | "DRAW" = "DRAW";
  if (userTotal > dealerTotal) {
    result = "WIN";
  } else if (userTotal < dealerTotal) {
    result = "LOSE";
  }

  return {
    user_dice: userDice,
    dealer_dice: dealerDice,
    result,
    remaining_plays: diceState.remainingPlays,
    reward_type: result === "WIN" ? "POINT" : undefined,
    reward_value: result === "WIN" ? 200 : undefined,
    message: result === "WIN" ? "승리! 200 코인 획득!" : result === "LOSE" ? "패배..." : "무승부!",
  };
};

const lotteryState = {
  remainingPlays: 0, // 0 = unlimited sentinel
  tokenBalance: 10,
  prizes: [
    { id: 1, label: "눈사람 코스튬", reward_type: "ITEM", reward_value: 1, stock: null, is_active: true, weight: 5 },
    { id: 2, label: "1,000 코인", reward_type: "POINT", reward_value: 1000, stock: null, is_active: true, weight: 30 },
    { id: 3, label: "50 크리스탈", reward_type: "TOKEN", reward_value: 50, stock: 10, is_active: true, weight: 15 },
    { id: 4, label: "배민 2만원권", reward_type: "COUPON", reward_value: 20000, stock: 3, is_active: true, weight: 2 },
    { id: 5, label: "꽝", reward_type: "NONE", reward_value: 0, stock: null, is_active: true, weight: 48 },
  ],
};

export const getFallbackLotteryStatus = () => ({
  feature_type: "LOTTERY" as const,
  remaining_plays: lotteryState.remainingPlays,
  token_type: "LOTTERY_TICKET" as const,
  token_balance: lotteryState.tokenBalance,
  prizes: lotteryState.prizes.filter(p => p.is_active).map((prize) => ({ ...prize })),
});

export const playFallbackLottery = () => {
  const activePrizes = lotteryState.prizes.filter(p => p.is_active && (p.stock === null || p.stock > 0));
  const totalWeight = activePrizes.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;
  let selectedPrize = activePrizes[0];

  for (const prize of activePrizes) {
    random -= prize.weight;
    if (random <= 0) {
      selectedPrize = prize;
      break;
    }
  }

  // Decrease stock if applicable
  if (selectedPrize.stock !== null && selectedPrize.stock > 0) {
    selectedPrize.stock--;
  }

  return {
    prize: selectedPrize,
    remaining_plays: lotteryState.remainingPlays,
    message: selectedPrize.reward_type === "NONE" ? "아쉽네요! 다음 기회에!" : `${selectedPrize.label} 당첨!`,
  };
};

export const getFallbackTodayFeature = (): { feature_type: NullableFeatureType } => ({
  feature_type: null, // 데모 모드에서는 feature 없음 (스케줄 row 없음과 동일)
});

const rankingEntries = Array.from({ length: 10 }, (_, index) => ({
  rank: index + 1,
  user_name: `User_${index + 1}`,
  score: 1000 - index * 37,
}));

export const getFallbackRanking = (topN: number) => ({
  date: new Date().toISOString().slice(0, 10),
  entries: rankingEntries.slice(0, topN).map((entry) => ({ ...entry })),
  my_entry: { rank: 23, user_name: "나 (DEMO)", score: 512 },
});

interface FallbackSeasonLevel {
  level: number;
  required_xp: number;
  reward_label: string;
  is_claimed: boolean;
  is_unlocked: boolean;
}

const seasonPassState: {
  current_level: number;
  current_xp: number;
  next_level_xp: number;
  max_level: number;
  levels: FallbackSeasonLevel[];
} = {
  current_level: 3,
  current_xp: 120,
  next_level_xp: 200,
  max_level: 10,
  levels: [
    { level: 1, required_xp: 0, reward_label: "스노우볼 배경", is_claimed: true, is_unlocked: true },
    { level: 2, required_xp: 80, reward_label: "300 코인", is_claimed: true, is_unlocked: true },
    { level: 3, required_xp: 150, reward_label: "눈사람 이모티콘", is_claimed: false, is_unlocked: true },
    { level: 4, required_xp: 220, reward_label: "스페셜 상자", is_claimed: false, is_unlocked: false },
    { level: 5, required_xp: 300, reward_label: "프리미엄 티켓", is_claimed: false, is_unlocked: false },
  ],
};

export const getFallbackSeasonPassStatus = () => ({
  current_level: seasonPassState.current_level,
  current_xp: seasonPassState.current_xp,
  next_level_xp: seasonPassState.next_level_xp,
  max_level: seasonPassState.max_level,
  levels: seasonPassState.levels.map((level) => ({ ...level })),
});

export const claimFallbackSeasonReward = (level: number) => {
  const target = seasonPassState.levels.find((lvl) => lvl.level === level);
  if (!target) {
    return {
      level,
      reward_label: "알 수 없는 보상",
      message: "데모 모드: 존재하지 않는 레벨입니다.",
    };
  }

  if (!target.is_unlocked) {
    return {
      level,
      reward_label: target.reward_label,
      message: "데모 모드: 아직 잠금 해제되지 않았습니다.",
    };
  }

  if (target.is_claimed) {
    return {
      level,
      reward_label: target.reward_label,
      message: "데모 모드: 이미 수령한 보상입니다.",
    };
  }

  target.is_claimed = true;

  return {
    level: target.level,
    reward_label: target.reward_label,
    message: "데모 모드: 보상을 수령했습니다!",
  };
};
// src/api/fallbackData.ts
// Provides demo fallback data when backend APIs are unavailable.
import { NullableFeatureType } from "../types/features";

export interface FallbackRouletteSegment {
  label: string;
  weight: number;
  isJackpot?: boolean;
  reward_type?: string;
  reward_amount?: number;
  slot_index?: number;
}

export const getFallbackRouletteStatus = () => ({
  feature_type: "ROULETTE" as const,
  remaining_spins: 0,
  token_type: "ROULETTE_COIN" as const,
  token_balance: 10,
  segments: [
    { label: "ê¸ˆê³  ?ë¦½ 100??, weight: 30, reward_type: "POINT", reward_amount: 100, slot_index: 0 },
    { label: "ê¸ˆê³  ?ë¦½ 200??, weight: 25, reward_type: "POINT", reward_amount: 200, slot_index: 1 },
    { label: "ê¸ˆê³  ?ë¦½ 500??, weight: 15, reward_type: "POINT", reward_amount: 500, slot_index: 2 },
    { label: "? í° 1ê°?, weight: 10, reward_type: "TOKEN", reward_amount: 1, slot_index: 3 },
    { label: "ê½?, weight: 15, reward_type: "NONE", reward_amount: 0, slot_index: 4 },
    { label: "??ŒŸ", weight: 5, isJackpot: true, reward_type: "POINT", reward_amount: 10000, slot_index: 5 },
  ],
});

export const playFallbackRoulette = () => {
  const segments = getFallbackRouletteStatus().segments;
  const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  let selectedIndex = 0;
  for (let i = 0; i < segments.length; i++) {
    random -= segments[i].weight;
    if (random <= 0) {
      selectedIndex = i;
      break;
    }
  }
  const segment = segments[selectedIndex];
  return {
    selected_index: selectedIndex,
    segment,
    remaining_spins: 0,
    reward_type: segment.reward_type,
    reward_value: segment.reward_amount,
    message: "?°ëª¨ ?°ì´?°ìž…?ˆë‹¤.",
  };
};

const diceState = { remainingPlays: 0, tokenBalance: 10 };
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
  if (userTotal > dealerTotal) result = "WIN";
  else if (userTotal < dealerTotal) result = "LOSE";

  const vaultEarn = 0;
  return {
    user_dice: userDice,
    dealer_dice: dealerDice,
    result,
    remaining_plays: diceState.remainingPlays,
    vaultEarn,
    message: result === "WIN" ? "?¹ë¦¬!" : result === "LOSE" ? "?¨ë°°" : "ë¬´ìŠ¹ë¶€",
  };
};

const lotteryState = {
  remainingPlays: 0,
  tokenBalance: 10,
  prizes: [
    { id: 1, label: "?¤ì´??, reward_type: "DIAMOND", reward_amount: 1, stock: null, is_active: true, weight: 5 },
    { id: 2, label: "ê¸ˆê³  ?ë¦½ 1,000??, reward_type: "POINT", reward_amount: 1000, stock: null, is_active: true, weight: 30 },
    { id: 3, label: "? í° 50ê°?, reward_type: "TOKEN", reward_amount: 50, stock: 10, is_active: true, weight: 15 },
    { id: 4, label: "ì¿ í° 20,000??, reward_type: "COUPON", reward_amount: 20000, stock: 3, is_active: true, weight: 2 },
    { id: 5, label: "ê½?, reward_type: "NONE", reward_amount: 0, stock: null, is_active: true, weight: 48 },
  ],
};

export const getFallbackLotteryStatus = () => ({
  feature_type: "LOTTERY" as const,
  remaining_plays: lotteryState.remainingPlays,
  token_type: "LOTTERY_TICKET" as const,
  token_balance: lotteryState.tokenBalance,
  prizes: lotteryState.prizes
    .filter((p) => p.is_active)
    .map((prize) => ({ ...prize, reward_value: prize.reward_amount })),
  collectionProgress: { C: 1, J: 0, M: 0 },
});

export const playFallbackLottery = () => {
  const activePrizes = lotteryState.prizes.filter((p) => p.is_active && (p.stock === null || p.stock > 0));
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
  if (selectedPrize.stock !== null && selectedPrize.stock > 0) {
    selectedPrize.stock--;
  }
  return {
    prize: selectedPrize,
    remaining_plays: lotteryState.remainingPlays,
    message: selectedPrize.reward_type === "NONE" ? "ê½?" : `${selectedPrize.label} ?¹ì²¨!`,
  };
};

export const getFallbackTodayFeature = (): { feature_type: NullableFeatureType } => ({ feature_type: null });

const rankingEntries = Array.from({ length: 10 }, (_, index) => ({
  rank: index + 1,
  user_name: `User_${index + 1}`,
  score: 1000 - index * 37,
}));

export const getFallbackRanking = (topN: number) => ({
  date: new Date().toISOString().slice(0, 10),
  entries: rankingEntries.slice(0, topN).map((entry) => ({ ...entry })),
  my_entry: { rank: 23, user_name: "ï¿½ï¿½(DEMO)", score: 512 },
  external_entries: [],
  my_external_entry: undefined,
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
    { level: 1, required_xp: 0, reward_label: "ï¿½ï¿½ï¿?, is_claimed: true, is_unlocked: true },
    { level: 2, required_xp: 80, reward_label: "300 coin", is_claimed: true, is_unlocked: true },
    { level: 3, required_xp: 150, reward_label: "ï¿½Ì¸ï¿½ï¿½ï¿½", is_claimed: false, is_unlocked: true },
    { level: 4, required_xp: 220, reward_label: "ï¿½Ù¹Ì±ï¿½", is_claimed: false, is_unlocked: false },
    { level: 5, required_xp: 300, reward_label: "ï¿½ï¿½ï¿½ï¿½ï¿½Ì¾ï¿½ Æ¼ï¿½ï¿½", is_claimed: false, is_unlocked: false },
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
    return { level, reward_label: "ï¿½ï¿½ï¿½ï¿½ ï¿½ï¿½ï¿½ï¿½", message: "ï¿½ï¿½ï¿½ï¿½ ï¿½ï¿½ï¿? ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ ï¿½Ê´ï¿½ ï¿½ï¿½ï¿½ï¿½" };
  }
  if (!target.is_unlocked) {
    return { level, reward_label: target.reward_label, message: "ï¿½ï¿½ï¿½ï¿½ ï¿½ï¿½ï¿? ï¿½ï¿½ï¿½ï¿½ ï¿½ï¿½ï¿?ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ï¿½ ï¿½ï¿½ï¿½ï¿½" };
  }
  if (target.is_claimed) {
    return { level, reward_label: target.reward_label, message: "ï¿½ï¿½ï¿½ï¿½ ï¿½ï¿½ï¿? ï¿½Ì¹ï¿½ ï¿½ï¿½ï¿½ï¿½" };
  }
  target.is_claimed = true;
  return { level: target.level, reward_label: target.reward_label, message: "ï¿½ï¿½ï¿½ï¿½ ï¿½ï¿½ï¿? ï¿½ï¿½ï¿½ï¿½ ï¿½ï¿½ï¿½ï¿½" };
};

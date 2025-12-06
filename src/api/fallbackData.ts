// src/api/fallbackData.ts
// Provides demo fallback data when backend APIs are unavailable so the UI remains interactive.

export interface FallbackRouletteState {
  remainingSpins: number;
  segments: { label: string }[];
}

const rouletteState: FallbackRouletteState = {
  remainingSpins: 5,
  segments: [
    { label: "100 코인" },
    { label: "200 코인" },
    { label: "500 코인" },
    { label: "크리스탈" },
    { label: "꽝" },
    { label: "추가 회전" },
  ],
};

export const getFallbackRouletteStatus = () => ({
  feature_type: "ROULETTE" as const,
  remaining_spins: rouletteState.remainingSpins,
  segments: rouletteState.segments.map((segment) => ({ ...segment })),
});

export const playFallbackRoulette = () => {
  if (rouletteState.remainingSpins <= 0) {
    return {
      selected_index: 0,
      segment: rouletteState.segments[0],
      remaining_spins: 0,
      message: "데모 모드: 오늘 남은 회차가 없습니다.",
    };
  }

  const index = Math.floor(Math.random() * rouletteState.segments.length);
  const segment = rouletteState.segments[index];
  rouletteState.remainingSpins = Math.max(rouletteState.remainingSpins - 1, 0);

  return {
    selected_index: index,
    segment,
    remaining_spins: rouletteState.remainingSpins,
    message: "데모 모드 결과입니다.",
  };
};

const diceState = {
  remainingPlays: 5,
};

const rollDie = () => Math.floor(Math.random() * 6) + 1;

export const getFallbackDiceStatus = () => ({
  feature_type: "DICE" as const,
  remaining_plays: diceState.remainingPlays,
});

export const playFallbackDice = () => {
  if (diceState.remainingPlays <= 0) {
    return {
      user_dice: [1, 1],
      dealer_dice: [1, 1],
      result: "DRAW" as const,
      remaining_plays: 0,
      message: "데모 모드: 남은 횟수가 없습니다.",
    };
  }

  diceState.remainingPlays = Math.max(diceState.remainingPlays - 1, 0);
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
    reward_type: result === "WIN" ? "코인" : undefined,
    reward_value: result === "WIN" ? 200 : undefined,
  };
};

const lotteryState = {
  remainingPlays: 3,
  prizes: [
    { id: 1, label: "눈사람 코스튬", reward_type: "아이템", reward_value: "코스튬", stock: null, is_active: true },
    { id: 2, label: "1,000 코인", reward_type: "코인", reward_value: 1000, stock: null, is_active: true },
    { id: 3, label: "50 크리스탈", reward_type: "크리스탈", reward_value: 50, stock: null, is_active: true },
  ],
};

export const getFallbackLotteryStatus = () => ({
  feature_type: "LOTTERY" as const,
  remaining_plays: lotteryState.remainingPlays,
  prizes: lotteryState.prizes.map((prize) => ({ ...prize })),
});

export const playFallbackLottery = () => {
  if (lotteryState.remainingPlays <= 0) {
    return {
      prize: lotteryState.prizes[0],
      remaining_plays: 0,
      message: "데모 모드: 남은 추첨 횟수가 없습니다.",
    };
  }

  lotteryState.remainingPlays = Math.max(lotteryState.remainingPlays - 1, 0);
  const prizeIndex = Math.floor(Math.random() * lotteryState.prizes.length);
  const prize = lotteryState.prizes[prizeIndex];

  return {
    prize,
    remaining_plays: lotteryState.remainingPlays,
    message: "데모 모드 결과입니다.",
  };
};

export const getFallbackTodayFeature = () => ({
  feature_type: "NONE" as const,
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
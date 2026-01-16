export type GameTokenType =
  | "ROULETTE_COIN"
  | "DICE_TOKEN"
  | "LOTTERY_TICKET"
  | "GOLD_KEY"
  | "DIAMOND_KEY"
  | "TRIAL_TOKEN"
  | "DIAMOND"
  | "PUZZLE_C1"
  | "PUZZLE_C2"
  | "PUZZLE_J"
  | "PUZZLE_M";

export const GAME_TOKEN_LABELS: Record<GameTokenType, string> = {
  ROULETTE_COIN: "룰렛 코인",
  DICE_TOKEN: "주사위 토큰",
  LOTTERY_TICKET: "복권 티켓",
  GOLD_KEY: "골드 키",
  DIAMOND_KEY: "다이아 키",
  TRIAL_TOKEN: "체험 토큰",
  DIAMOND: "다이아",
  PUZZLE_C1: "퍼즐 C1",
  PUZZLE_C2: "퍼즐 C2",
  PUZZLE_J: "퍼즐 J",
  PUZZLE_M: "퍼즐 M",
};

// V2 Standard Token Types (Primary - Use these for new code)
export type V2TokenType =
  | "ROULETTE_TICKET"
  | "DICE_TICKET"
  | "LOTTERY_TICKET"
  | "GOLD_KEY_TICKET"
  | "DIAMOND_TICKET"
  | "TRIAL_TICKET"
  | "DIAMOND"
  | "PUZZLE_C1"
  | "PUZZLE_C2"
  | "PUZZLE_J"
  | "PUZZLE_M";

// Legacy Token Types (For backward compatibility only)
export type LegacyTokenType =
  | "ROULETTE_COIN"
  | "DICE_TOKEN"
  | "GOLD_KEY"
  | "DIAMOND_KEY"
  | "TRIAL_TOKEN";

// Combined type for backward compatibility
export type GameTokenType = V2TokenType | LegacyTokenType;

export const GAME_TOKEN_LABELS: Record<GameTokenType, string> = {
  // V2 Standard
  ROULETTE_TICKET: "룰렛 티켓",
  DICE_TICKET: "주사위 티켓",
  LOTTERY_TICKET: "복권 티켓",
  GOLD_KEY_TICKET: "골드 키 티켓",
  DIAMOND_TICKET: "다이아 티켓",
  TRIAL_TICKET: "체험 티켓",
  DIAMOND: "다이아",
  PUZZLE_C1: "퍼즐 C1",
  PUZZLE_C2: "퍼즐 C2",
  PUZZLE_J: "퍼즐 J",
  PUZZLE_M: "퍼즐 M",
  // Legacy (Deprecated)
  ROULETTE_COIN: "룰렛 코인 (레거시)",
  DICE_TOKEN: "주사위 토큰 (레거시)",
  GOLD_KEY: "골드 키 (레거시)",
  DIAMOND_KEY: "다이아 키 (레거시)",
  TRIAL_TOKEN: "체험 토큰 (레거시)",
};

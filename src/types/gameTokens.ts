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
  ROULETTE_TICKET: "룰렛 ?�켓",
  DICE_TICKET: "주사???�켓",
  LOTTERY_TICKET: "복권 ?�켓",
  GOLD_KEY_TICKET: "골드 ???�켓",
  DIAMOND_TICKET: "?�이???�켓",
  TRIAL_TICKET: "체험 ?�켓",
  DIAMOND: "?�이??,
  PUZZLE_C1: "?�즐 C1",
  PUZZLE_C2: "?�즐 C2",
  PUZZLE_J: "?�즐 J",
  PUZZLE_M: "?�즐 M",
  // Legacy (Deprecated)
  ROULETTE_COIN: "룰렛 코인 (?�거??",
  DICE_TOKEN: "주사???�큰 (?�거??",
  GOLD_KEY: "골드 ??(?�거??",
  DIAMOND_KEY: "?�이????(?�거??",
  TRIAL_TOKEN: "체험 ?�큰 (?�거??",
};

export type GameTokenType = "ROULETTE_COIN" | "DICE_TOKEN" | "LOTTERY_TICKET" | "CC_COIN" | "GOLD_KEY" | "DIAMOND_KEY";

export const GAME_TOKEN_LABELS: Record<GameTokenType, string> = {
  ROULETTE_COIN: "룰렛 티켓",
  DICE_TOKEN: "주사위 티켓",
  LOTTERY_TICKET: "복권 티켓",
  CC_COIN: "CC 코인",
  GOLD_KEY: "골드 키",
  DIAMOND_KEY: "다이아몬드 키",
};

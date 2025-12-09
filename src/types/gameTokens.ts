export type GameTokenType = "ROULETTE_COIN" | "DICE_TOKEN" | "LOTTERY_TICKET";

// 명칭을 모두 티켓으로 통일
export const GAME_TOKEN_LABELS: Record<GameTokenType, string> = {
  ROULETTE_COIN: "룰렛 티켓",
  DICE_TOKEN: "주사위 티켓",
  LOTTERY_TICKET: "복권 티켓",
};

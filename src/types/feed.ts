export interface JackpotWin {
  nickname: string;
  game_type: string; // 'roulette' | 'dice' | 'lottery'
  reward_amount: number;
  is_mega: boolean;
  timestamp: string; // ISO string
}

export type FeedEventType = "JACKPOT_WIN";

export interface FeedMessage {
  type: FeedEventType;
  payload: JackpotWin;
}

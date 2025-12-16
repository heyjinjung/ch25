// src/api/newMemberDiceApi.ts
import userApi from "./httpClient";

interface BackendNewMemberDiceStatusResponse {
  readonly eligible: boolean;
  readonly already_played: boolean;
  readonly played_at?: string | null;
  readonly last_outcome?: "WIN" | "LOSE" | null;
  readonly last_user_dice?: number | null;
  readonly last_dealer_dice?: number | null;
  readonly win_link: string;
}

export interface NewMemberDiceStatusResponse {
  readonly eligible: boolean;
  readonly alreadyPlayed: boolean;
  readonly playedAt?: string | null;
  readonly lastOutcome?: "WIN" | "LOSE" | null;
  readonly lastUserDice?: number | null;
  readonly lastDealerDice?: number | null;
  readonly winLink: string;
}

interface BackendNewMemberDicePlayResponse {
  readonly result: string;
  readonly game: {
    readonly user_dice: number[];
    readonly dealer_dice: number[];
    readonly outcome: "WIN" | "LOSE";
  };
  readonly message: string;
  readonly win_link: string;
}

export interface NewMemberDicePlayResponse {
  readonly userDice: number[];
  readonly dealerDice: number[];
  readonly outcome: "WIN" | "LOSE";
  readonly message: string;
  readonly winLink: string;
}

export const getNewMemberDiceStatus = async (): Promise<NewMemberDiceStatusResponse> => {
  const response = await userApi.get<BackendNewMemberDiceStatusResponse>("/api/new-member-dice/status");
  const data = response.data;
  return {
    eligible: data.eligible,
    alreadyPlayed: data.already_played,
    playedAt: data.played_at ?? null,
    lastOutcome: data.last_outcome ?? null,
    lastUserDice: data.last_user_dice ?? null,
    lastDealerDice: data.last_dealer_dice ?? null,
    winLink: data.win_link,
  };
};

export const playNewMemberDice = async (): Promise<NewMemberDicePlayResponse> => {
  const response = await userApi.post<BackendNewMemberDicePlayResponse>("/api/new-member-dice/play");
  const data = response.data;
  return {
    userDice: data.game.user_dice,
    dealerDice: data.game.dealer_dice,
    outcome: data.game.outcome,
    message: data.message,
    winLink: data.win_link,
  };
};

import userApi from "./httpClient";
import type { GameTokenType } from "../types/gameTokens";

export const TRIAL_GRANT_ALLOWED_TOKEN_TYPES = ["ROULETTE_COIN", "DICE_TOKEN", "LOTTERY_TICKET"] as const;
export type TrialGrantAllowedTokenType = (typeof TRIAL_GRANT_ALLOWED_TOKEN_TYPES)[number];

export const isTrialGrantAllowedTokenType = (tokenType: GameTokenType): tokenType is TrialGrantAllowedTokenType => {
  return (TRIAL_GRANT_ALLOWED_TOKEN_TYPES as readonly string[]).includes(tokenType);
};

export type TrialGrantRequest = {
  token_type: TrialGrantAllowedTokenType;
};

export type TrialGrantResponse = {
  result: "OK" | "SKIP";
  token_type: GameTokenType;
  granted: number;
  balance: number;
  label?: string | null;
};

export const requestTrialGrant = async (payload: TrialGrantRequest): Promise<TrialGrantResponse> => {
  const response = await userApi.post<TrialGrantResponse>("/api/trial-grant", payload);
  return response.data;
};

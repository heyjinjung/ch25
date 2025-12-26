import userApi from "./httpClient";
import type { GameTokenType } from "../types/gameTokens";

export type TrialGrantRequest = {
  token_type: GameTokenType;
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

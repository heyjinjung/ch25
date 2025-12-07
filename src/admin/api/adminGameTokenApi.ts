// src/admin/api/adminGameTokenApi.ts
import { adminApi } from "./httpClient";
import { GameTokenType } from "../../types/gameTokens";

export interface GrantGameTokensPayload {
  user_id: number;
  token_type: GameTokenType;
  amount: number;
}

export interface GrantGameTokensResponse {
  user_id: number;
  token_type: GameTokenType;
  balance: number;
}

export async function grantGameTokens(payload: GrantGameTokensPayload) {
  const { data } = await adminApi.post<GrantGameTokensResponse>("/game-tokens/grant", payload);
  return data;
}

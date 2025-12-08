// src/admin/api/adminGameTokenApi.ts
import { adminApi } from "./httpClient";
import { GameTokenType } from "../../types/gameTokens";

export interface GrantGameTokensPayload {
  external_id: string;
  token_type: GameTokenType;
  amount: number;
}

export interface GrantGameTokensResponse {
  user_id: number;
  external_id?: string;
  token_type: GameTokenType;
  balance: number;
}

export async function grantGameTokens(payload: GrantGameTokensPayload) {
  const { data } = await adminApi.post<GrantGameTokensResponse>("/game-tokens/grant", payload);
  return data;
}

export interface TokenBalance {
  user_id: number;
  external_id?: string;
  token_type: GameTokenType;
  balance: number;
}

export interface RevokeGameTokensPayload {
  external_id: string;
  token_type: GameTokenType;
  amount: number;
}

export interface PlayLogEntry {
  id: number;
  user_id: number;
  external_id?: string;
  game: string;
  reward_type: string;
  reward_amount: number;
  created_at: string;
}

export async function fetchWallets(externalId?: string) {
  const params = externalId ? { external_id: externalId } : undefined;
  const { data } = await adminApi.get<TokenBalance[]>("/game-tokens/wallets", { params });
  return data;
}

export async function revokeGameTokens(payload: RevokeGameTokensPayload) {
  const { data } = await adminApi.post<GrantGameTokensResponse>("/game-tokens/revoke", payload);
  return data;
}

export async function fetchRecentPlayLogs(limit: number = 50) {
  const { data } = await adminApi.get<PlayLogEntry[]>("/game-tokens/play-logs", { params: { limit } });
  return data;
}

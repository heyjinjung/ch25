// src/admin/api/adminGameTokenApi.ts
import { adminApi } from "./httpClient";
import { GameTokenType } from "../../types/gameTokens";

export interface GrantGameTokensPayload {
  /** New standardized identifier field (tg id/username/nickname/external id). */
  user_identifier?: string;
  /** Backward-compat: legacy field name used by older UI. */
  external_id?: string;
  token_type: GameTokenType;
  amount: number;
}

export interface GrantGameTokensResponse {
  user_id: number;
  external_id?: string;
  telegram_username?: string;
  nickname?: string;
  token_type: GameTokenType;
  balance: number;
}

export async function grantGameTokens(payload: GrantGameTokensPayload) {
  // Backend supports both `user_identifier` and legacy `external_id`.
  const normalizedPayload = {
    ...payload,
    user_identifier: payload.user_identifier ?? payload.external_id,
  };
  const { data } = await adminApi.post<GrantGameTokensResponse>("/admin/api/game-tokens/grant", normalizedPayload);
  return data;
}

export interface TokenBalance {
  user_id: number;
  external_id?: string;
  nickname?: string;
  telegram_username?: string;
  token_type: GameTokenType;
  balance: number;
}

export interface RevokeGameTokensPayload {
  user_identifier?: string;
  external_id?: string;
  token_type: GameTokenType;
  amount: number;
}

export interface PlayLogEntry {
  id: number;
  user_id: number;
  external_id?: string;
  nickname?: string;
  telegram_username?: string;
  game: string;
  reward_type: string;
  reward_amount: number;
  reward_label?: string | null;
  created_at: string;
}

export interface LedgerEntry {
  id: number;
  user_id: number;
  external_id?: string;
  nickname?: string;
  telegram_username?: string;
  token_type: GameTokenType;
  delta: number;
  balance_after: number;
  reason?: string | null;
  label?: string | null;
  meta_json?: Record<string, unknown> | null;
  created_at: string;
}

export async function fetchWallets(
  externalId?: string,
  limit: number = 50,
  offset: number = 0,
  hasBalance?: boolean,
  tokenType?: string
) {
  const params: Record<string, any> = { limit, offset };
  if (externalId) params.external_id = externalId;
  if (hasBalance !== undefined) params.has_balance = hasBalance;
  if (tokenType) params.token_type = tokenType;
  const { data } = await adminApi.get<TokenBalance[]>("/admin/api/game-tokens/wallets", { params });
  return data;
}

export async function fetchWalletsByUserId(userId: number, limit: number = 50, offset: number = 0) {
  const params: Record<string, any> = { user_id: userId, limit, offset };
  const { data } = await adminApi.get<TokenBalance[]>("/admin/api/game-tokens/wallets", { params });
  return data;
}

export async function revokeGameTokens(payload: RevokeGameTokensPayload) {
  const normalizedPayload = {
    ...payload,
    user_identifier: payload.user_identifier ?? payload.external_id,
  };
  const { data } = await adminApi.post<GrantGameTokensResponse>("/admin/api/game-tokens/revoke", normalizedPayload);
  return data;
}

export async function fetchRecentPlayLogs(limit: number = 50, externalId?: string, offset: number = 0) {
  const params: Record<string, any> = { limit, offset };
  if (externalId) params.external_id = externalId;
  const { data } = await adminApi.get<PlayLogEntry[]>("/admin/api/game-tokens/play-logs", { params });
  return data;
}

export async function fetchLedger(limit: number = 100, externalId?: string, offset: number = 0) {
  const params: Record<string, any> = { limit, offset };
  if (externalId) params.external_id = externalId;
  const { data } = await adminApi.get<LedgerEntry[]>("/admin/api/game-tokens/ledger", { params });
  return data;
}

export async function fetchLedgerByUserId(userId: number, limit: number = 100, offset: number = 0) {
  const params: Record<string, any> = { user_id: userId, limit, offset };
  const { data } = await adminApi.get<LedgerEntry[]>("/admin/api/game-tokens/ledger", { params });
  return data;
}

export interface UserWalletSummary {
  user_id: number;
  external_id?: string;
  nickname?: string;
  telegram_username?: string;
  balances: Record<string, number>;
}

export async function fetchWalletSummary() {
  const { data } = await adminApi.get<UserWalletSummary[]>("/admin/api/game-tokens/summary");
  return data;
}

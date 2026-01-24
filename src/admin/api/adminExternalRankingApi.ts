// src/api/admin/adminExternalRankingApi.ts
import { adminApi } from "./httpClient";

export interface ExternalRankingPayload {
  user_id?: number;
  external_id?: string;
  telegram_username?: string;
  deposit_amount: number;
  play_count: number;
  memo?: string | null;
}

export interface ExternalRankingEntry extends ExternalRankingPayload {
  id: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    external_id?: string | null;
    nickname?: string | null;
    tg_id?: number | null;
    tg_username?: string | null;
    real_name?: string | null;
    phone_number?: string | null;
  } | null;
}

export interface ExternalRankingListResponse {
  items: ExternalRankingEntry[];
}

export async function fetchExternalRankingList() {
  const { data } = await adminApi.get<ExternalRankingListResponse>("/api/admin/external-ranking/");
  return data;
}

export async function upsertExternalRanking(payloads: ExternalRankingPayload[]) {
  const { data } = await adminApi.post<ExternalRankingListResponse>("/api/admin/external-ranking/", payloads);
  return data;
}

export async function updateExternalRanking(userId: number, payload: Partial<ExternalRankingPayload>) {
  // Backend route is `PUT /api/admin/external-ranking/{user_id}` (no trailing slash).
  const { data } = await adminApi.put<ExternalRankingEntry>(`/api/admin/external-ranking/${userId}`, payload);
  return data;
}

export async function deleteExternalRanking(userId: number) {
  // Backend route is `DELETE /api/admin/external-ranking/{user_id}` (no trailing slash).
  await adminApi.delete(`/api/admin/external-ranking/${userId}`);
}

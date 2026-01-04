// src/admin/api/adminExternalRankingApi.ts
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
  const { data } = await adminApi.get<ExternalRankingListResponse>("/admin/api/external-ranking/");
  return data;
}

export async function upsertExternalRanking(payloads: ExternalRankingPayload[]) {
  const { data } = await adminApi.post<ExternalRankingListResponse>("/admin/api/external-ranking/", payloads);
  return data;
}

export async function updateExternalRanking(userId: number, payload: Partial<ExternalRankingPayload>) {
  // Backend route is `PUT /admin/api/external-ranking/{user_id}` (no trailing slash).
  const { data } = await adminApi.put<ExternalRankingEntry>(`/admin/api/external-ranking/${userId}`, payload);
  return data;
}

export async function deleteExternalRanking(userId: number) {
  // Backend route is `DELETE /admin/api/external-ranking/{user_id}` (no trailing slash).
  await adminApi.delete(`/admin/api/external-ranking/${userId}`);
}

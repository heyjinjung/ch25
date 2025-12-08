// src/admin/api/adminExternalRankingApi.ts
import { adminApi } from "./httpClient";

export interface ExternalRankingPayload {
  user_id: number;
  deposit_amount: number;
  play_count: number;
  memo?: string | null;
}

export interface ExternalRankingEntry extends ExternalRankingPayload {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface ExternalRankingListResponse {
  items: ExternalRankingEntry[];
}

export async function fetchExternalRankingList() {
  const { data } = await adminApi.get<ExternalRankingListResponse>("/external-ranking");
  return data;
}

export async function upsertExternalRanking(payloads: ExternalRankingPayload[]) {
  const { data } = await adminApi.post<ExternalRankingListResponse>("/external-ranking", payloads);
  return data;
}

export async function updateExternalRanking(userId: number, payload: Partial<ExternalRankingPayload>) {
  const { data } = await adminApi.put<ExternalRankingEntry>(`/external-ranking/${userId}`, payload);
  return data;
}

export async function deleteExternalRanking(userId: number) {
  await adminApi.delete(`/external-ranking/${userId}`);
}

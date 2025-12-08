// src/admin/api/adminRankingApi.ts
import { adminApi } from "./httpClient";

export interface AdminRankingEntryPayload {
  date: string;
  rank: number;
  user_id?: number;
  user_name: string;
  score?: number;
}

export type AdminRankingEntry = AdminRankingEntryPayload & { id?: number };

interface AdminRankingListResponse {
  date: string;
  items: AdminRankingEntry[];
}

export async function fetchRankingByDate(date: string) {
  const { data } = await adminApi.get<AdminRankingListResponse>(`/ranking/${date}`);
  return data.items ?? [];
}

export async function upsertRanking(date: string, entries: AdminRankingEntryPayload[]) {
  const { data } = await adminApi.put<AdminRankingListResponse>(`/ranking/${date}`, entries);
  return data.items ?? [];
}

export async function deleteRanking(date: string) {
  await adminApi.delete(`/ranking/${date}`);
}

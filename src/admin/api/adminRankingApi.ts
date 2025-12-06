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

export async function fetchRankingByDate(date: string) {
  const { data } = await adminApi.get<AdminRankingEntry[]>(`/ranking/${date}`);
  return data;
}

export async function upsertRanking(date: string, entries: AdminRankingEntryPayload[]) {
  const { data } = await adminApi.put<AdminRankingEntry[]>(`/ranking/${date}`, entries);
  return data;
}

export async function deleteRanking(date: string) {
  await adminApi.delete(`/ranking/${date}`);
}

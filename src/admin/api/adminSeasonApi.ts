// src/api/admin/adminSeasonApi.ts
import { adminApi } from "./httpClient";
import type { AdminRewardType } from "../types/adminReward";

export interface AdminSeasonPayload {
  name: string;
  start_date: string;
  end_date: string;
  max_level: number;
  base_xp_per_stamp: number;
  is_active: boolean;
}

export interface AdminSeason extends AdminSeasonPayload {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface AdminSeasonListResponse {
  items: AdminSeason[];
  total: number;
  page: number;
  size: number;
}

export async function fetchSeasons(params?: { page?: number; size?: number; is_active?: boolean }) {
  const { data } = await adminApi.get<AdminSeasonListResponse>("/api/admin/seasons/", { params });
  return data;
}

export async function fetchSeason(id: number) {
  const { data } = await adminApi.get<AdminSeason>(`/api/admin/seasons/${id}`);
  return data;
}

export async function createSeason(payload: AdminSeasonPayload) {
  const { data } = await adminApi.post<AdminSeason>("/api/admin/seasons/", payload);
  return data;
}

export async function updateSeason(id: number, payload: AdminSeasonPayload) {
  const { data } = await adminApi.put<AdminSeason>(`/api/admin/seasons/${id}`, payload);
  return data;
}

// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// Season Level API (XP requirements and rewards per level)
// ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€

export interface AdminSeasonLevel {
  id?: number;
  season_id?: number;
  level: number;
  required_xp: number;
  reward_type: AdminRewardType;
  reward_amount: number;
  auto_claim: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AdminSeasonLevelListResponse {
  season_id: number;
  levels: AdminSeasonLevel[];
}

export async function fetchSeasonLevels(seasonId: number) {
  const { data } = await adminApi.get<AdminSeasonLevelListResponse>(
    `/api/admin/seasons/${seasonId}/levels`
  );
  return data;
}

export async function upsertSeasonLevels(seasonId: number, levels: AdminSeasonLevel[]) {
  const { data } = await adminApi.put<AdminSeasonLevelListResponse>(
    `/api/admin/seasons/${seasonId}/levels`,
    levels
  );
  return data;
}

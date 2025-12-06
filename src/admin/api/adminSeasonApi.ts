// src/admin/api/adminSeasonApi.ts
import { adminApi } from "./httpClient";

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
  const { data } = await adminApi.get<AdminSeasonListResponse>("/seasons", { params });
  return data;
}

export async function fetchSeason(id: number) {
  const { data } = await adminApi.get<AdminSeason>(`/seasons/${id}`);
  return data;
}

export async function createSeason(payload: AdminSeasonPayload) {
  const { data } = await adminApi.post<AdminSeason>("/seasons", payload);
  return data;
}

export async function updateSeason(id: number, payload: AdminSeasonPayload) {
  const { data } = await adminApi.put<AdminSeason>(`/seasons/${id}` , payload);
  return data;
}

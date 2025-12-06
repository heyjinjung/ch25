// src/admin/api/adminRouletteApi.ts
import { adminApi } from "./httpClient";

export interface AdminRouletteSegmentPayload {
  index: number;
  label: string;
  weight: number;
  reward_type: string;
  reward_value: number;
}

export interface AdminRouletteConfigPayload {
  name: string;
  is_active: boolean;
  max_daily_spins: number;
  segments: AdminRouletteSegmentPayload[];
}

export interface AdminRouletteConfig extends AdminRouletteConfigPayload {
  id: number;
  created_at: string;
  updated_at: string;
}

export async function fetchRouletteConfigs() {
  const { data } = await adminApi.get<AdminRouletteConfig[]>("/roulette-config");
  return data;
}

export async function createRouletteConfig(payload: AdminRouletteConfigPayload) {
  const { data } = await adminApi.post<AdminRouletteConfig>("/roulette-config", payload);
  return data;
}

export async function updateRouletteConfig(id: number, payload: AdminRouletteConfigPayload) {
  const { data } = await adminApi.put<AdminRouletteConfig>(`/roulette-config/${id}`, payload);
  return data;
}

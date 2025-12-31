// src/admin/api/adminRouletteApi.ts
import { adminApi } from "./httpClient";

export type RouletteTicketType = "ROULETTE_COIN" | "GOLD_KEY" | "DIAMOND_KEY";

export interface AdminRouletteSegmentPayload {
  id?: number;
  index: number;
  label: string;
  weight: number;
  reward_type: string;
  reward_value: number;
}

export interface AdminRouletteConfigPayload {
  name: string;
  ticket_type: RouletteTicketType;
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
  const { data } = await adminApi.get<AdminRouletteConfig[]>("/admin/api/roulette-config/");
  return data;
}

export async function createRouletteConfig(payload: AdminRouletteConfigPayload) {
  const { data } = await adminApi.post<AdminRouletteConfig>("/admin/api/roulette-config/", payload);
  return data;
}

export async function updateRouletteConfig(id: number, payload: AdminRouletteConfigPayload) {
  const { data } = await adminApi.put<AdminRouletteConfig>(`/admin/api/roulette-config/${id}`, payload);
  return data;
}

export async function deleteRouletteConfig(id: number) {
  await adminApi.delete(`/admin/api/roulette-config/${id}`);
}

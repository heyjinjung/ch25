// src/admin/api/adminDiceApi.ts
import { adminApi } from "./httpClient";

export interface AdminDiceConfigPayload {
  name: string;
  is_active: boolean;
  max_daily_plays: number;
  win_reward_type: string;
  win_reward_value: number;
  lose_reward_type: string;
  lose_reward_value: number;
  draw_reward_type?: string;
  draw_reward_value?: number;
}

export interface AdminDiceConfig extends AdminDiceConfigPayload {
  id: number;
  created_at: string;
  updated_at: string;
}

export async function fetchDiceConfigs() {
  const { data } = await adminApi.get<AdminDiceConfig[]>("/dice-config");
  return data;
}

export async function createDiceConfig(payload: AdminDiceConfigPayload) {
  const { data } = await adminApi.post<AdminDiceConfig>("/dice-config", payload);
  return data;
}

export async function updateDiceConfig(id: number, payload: AdminDiceConfigPayload) {
  const { data } = await adminApi.put<AdminDiceConfig>(`/dice-config/${id}`, payload);
  return data;
}

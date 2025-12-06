// src/admin/api/adminLotteryApi.ts
import { adminApi } from "./httpClient";

export interface AdminLotteryPrizePayload {
  label: string;
  weight: number;
  stock?: number | null;
  reward_type: string;
  reward_value: number;
  is_active: boolean;
}

export interface AdminLotteryConfigPayload {
  name: string;
  is_active: boolean;
  max_daily_plays: number;
  prizes: AdminLotteryPrizePayload[];
}

export interface AdminLotteryConfig extends AdminLotteryConfigPayload {
  id: number;
  created_at: string;
  updated_at: string;
}

export async function fetchLotteryConfigs() {
  const { data } = await adminApi.get<AdminLotteryConfig[]>("/lottery-config");
  return data;
}

export async function createLotteryConfig(payload: AdminLotteryConfigPayload) {
  const { data } = await adminApi.post<AdminLotteryConfig>("/lottery-config", payload);
  return data;
}

export async function updateLotteryConfig(id: number, payload: AdminLotteryConfigPayload) {
  const { data } = await adminApi.put<AdminLotteryConfig>(`/lottery-config/${id}`, payload);
  return data;
}

// src/admin/api/adminDiceApi.ts
import { adminApi } from "./httpClient";
import type { AdminRewardType } from "../types/adminReward";

export interface AdminDiceConfigPayload {
  name: string;
  is_active: boolean;
  max_daily_plays: number;
  win_reward_type: AdminRewardType;
  win_reward_value: number;
  lose_reward_type: AdminRewardType;
  lose_reward_value: number;
  draw_reward_type: AdminRewardType;
  draw_reward_value: number;
}

export interface AdminDiceConfig extends AdminDiceConfigPayload {
  id: number;
  created_at: string;
  updated_at: string;
}

export async function fetchDiceConfigs() {
  const { data } = await adminApi.get<AdminDiceConfig[]>("/admin/api/dice-config/");
  return data;
}

export async function createDiceConfig(payload: AdminDiceConfigPayload) {
  const { data } = await adminApi.post<AdminDiceConfig>("/admin/api/dice-config/", payload);
  return data;
}

export async function updateDiceConfig(id: number, payload: AdminDiceConfigPayload) {
  const { data } = await adminApi.put<AdminDiceConfig>(`/admin/api/dice-config/${id}`, payload);
  return data;
}

// --- Event Params ---

export interface DiceEventParams {
  is_active: boolean;
  probability: {
    DICE?: {
      p_win: number;
      p_draw: number;
      p_lose: number;
    };
  } | null;
  game_earn_config: {
    DICE?: {
      WIN: number;
      DRAW: number;
      LOSE: number;
    };
  } | null;
  caps: {
    DICE?: {
      daily_gain?: number;
      daily_plays?: number;
    };
  } | null;
  eligibility: {
    tags?: {
      blocklist?: string[];
    };
  } | null;
}

export async function getEventParams() {
  const { data } = await adminApi.get<DiceEventParams>("/admin/api/dice-config/event-params");
  return data;
}

export async function updateEventParams(payload: DiceEventParams) {
  const { data } = await adminApi.put<DiceEventParams>("/admin/api/dice-config/event-params", payload);
  return data;
}

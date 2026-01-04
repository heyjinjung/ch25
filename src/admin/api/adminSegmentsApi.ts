// src/admin/api/adminSegmentsApi.ts
import { adminApi } from "./httpClient";

export interface AdminUserSegmentRow {
  readonly user_id: number;
  readonly external_id: string;
  readonly nickname?: string;
  readonly telegram_username?: string;
  readonly segment: string;
  readonly segment_updated_at?: string | null;

  readonly recommended_segment?: string | null;
  readonly recommended_rule_name?: string | null;
  readonly recommended_reason?: string | null;

  readonly roulette_plays: number;
  readonly dice_plays: number;
  readonly lottery_plays: number;
  readonly total_play_duration: number;

  readonly last_login_at?: string | null;
  readonly last_charge_at?: string | null;
  readonly last_bonus_used_at?: string | null;
  readonly activity_updated_at?: string | null;
}

export async function fetchUserSegments(params?: { identifier?: string; external_id?: string; limit?: number }) {
  const { data } = await adminApi.get<AdminUserSegmentRow[]>("/admin/api/segments/", {
    params,
  });
  return data;
}

export async function upsertUserSegment(payload: { user_id?: number; external_id?: string; segment: string }) {
  const { data } = await adminApi.put<AdminUserSegmentRow>("/admin/api/segments/", payload);
  return data;
}

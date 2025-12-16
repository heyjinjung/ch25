// src/admin/api/adminNewMemberDiceApi.ts
import { adminApi } from "./httpClient";

export interface AdminNewMemberDiceEligibility {
  readonly id: number;
  readonly user_id: number;
  readonly is_eligible: boolean;
  readonly campaign_key?: string | null;
  readonly granted_by?: string | null;
  readonly expires_at?: string | null;
  readonly revoked_at?: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface AdminNewMemberDiceEligibilityUpsertPayload {
  readonly user_id: number;
  readonly is_eligible: boolean;
  readonly campaign_key?: string | null;
  readonly granted_by?: string | null;
  readonly expires_at?: string | null;
}

export interface AdminNewMemberDiceEligibilityUpdatePayload {
  readonly is_eligible?: boolean;
  readonly campaign_key?: string | null;
  readonly granted_by?: string | null;
  readonly expires_at?: string | null;
  readonly revoked_at?: string | null;
}

export async function fetchNewMemberDiceEligibility(userId?: number) {
  const { data } = await adminApi.get<AdminNewMemberDiceEligibility[]>("/new-member-dice/eligibility/", {
    params: userId ? { user_id: userId } : undefined,
  });
  return data;
}

export async function upsertNewMemberDiceEligibility(payload: AdminNewMemberDiceEligibilityUpsertPayload) {
  const { data } = await adminApi.post<AdminNewMemberDiceEligibility>("/new-member-dice/eligibility/", payload);
  return data;
}

export async function updateNewMemberDiceEligibility(userId: number, payload: AdminNewMemberDiceEligibilityUpdatePayload) {
  const { data } = await adminApi.put<AdminNewMemberDiceEligibility>(`/new-member-dice/eligibility/${userId}`, payload);
  return data;
}

export async function deleteNewMemberDiceEligibility(userId: number) {
  await adminApi.delete(`/new-member-dice/eligibility/${userId}`);
}

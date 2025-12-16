// src/admin/api/adminNewMemberDiceApi.ts
import { adminApi } from "./httpClient";

export interface AdminNewMemberDiceEligibility {
  readonly id: number;
  readonly user_id: number;
  readonly external_id?: string | null;
  readonly nickname?: string | null;
  readonly is_eligible: boolean;
  readonly campaign_key?: string | null;
  readonly granted_by?: string | null;
  readonly expires_at?: string | null;
  readonly revoked_at?: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface AdminNewMemberDiceEligibilityUpsertPayload {
  readonly user_id?: number | null;
  readonly external_id?: string | null;
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

export async function fetchNewMemberDiceEligibilityByExternalId(externalId?: string) {
  const trimmed = externalId?.trim();
  const { data } = await adminApi.get<AdminNewMemberDiceEligibility[]>("/new-member-dice/eligibility/", {
    params: trimmed ? { external_id: trimmed } : undefined,
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

export async function updateNewMemberDiceEligibilityByExternalId(
  externalId: string,
  payload: AdminNewMemberDiceEligibilityUpdatePayload
) {
  const encoded = encodeURIComponent(externalId);
  const { data } = await adminApi.put<AdminNewMemberDiceEligibility>(`/new-member-dice/eligibility/by-external/${encoded}`, payload);
  return data;
}

export async function deleteNewMemberDiceEligibility(userId: number) {
  await adminApi.delete(`/new-member-dice/eligibility/${userId}`);
}

export async function deleteNewMemberDiceEligibilityByExternalId(externalId: string) {
  const encoded = encodeURIComponent(externalId);
  await adminApi.delete(`/new-member-dice/eligibility/by-external/${encoded}`);
}

// src/admin/api/adminSegmentRulesApi.ts
import { adminApi } from "./httpClient";

export interface AdminSegmentRule {
  readonly id: number;
  readonly name: string;
  readonly segment: string;
  readonly priority: number;
  readonly enabled: boolean;
  readonly condition_json: Record<string, unknown>;
  readonly created_at: string;
  readonly updated_at: string;
}

export type CreateSegmentRulePayload = {
  name: string;
  segment: string;
  priority?: number;
  enabled?: boolean;
  condition_json: Record<string, unknown>;
};

export type UpdateSegmentRulePayload = {
  name?: string;
  segment?: string;
  priority?: number;
  enabled?: boolean;
  condition_json?: Record<string, unknown>;
};

export async function fetchSegmentRules() {
  const { data } = await adminApi.get<AdminSegmentRule[]>("/segment-rules/");
  return data;
}

export async function createSegmentRule(payload: CreateSegmentRulePayload) {
  const { data } = await adminApi.post<AdminSegmentRule>("/segment-rules/", payload);
  return data;
}

export async function updateSegmentRule(ruleId: number, payload: UpdateSegmentRulePayload) {
  const { data } = await adminApi.put<AdminSegmentRule>(`/segment-rules/${ruleId}`, payload);
  return data;
}

export async function deleteSegmentRule(ruleId: number) {
  const { data } = await adminApi.delete<{ ok: boolean }>(`/segment-rules/${ruleId}`);
  return data;
}

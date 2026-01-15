import { adminApi } from "./httpClient";

const BASE_PATH = "/admin/api/ops";

export type OpsCampaign = {
  id: number;
  name: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  owner_admin_id?: number | null;
  goal_json?: Record<string, unknown> | null;
  notes_md?: string | null;
  created_at: string;
  updated_at: string;
};

export type OpsPlan = {
  id: number;
  campaign_id: number;
  plan_date: string;
  theme_title?: string | null;
  key_message?: string | null;
  status: string;
  closing_summary_md?: string | null;
  kpi_snapshot_json?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type OpsPlanTask = {
  id: number;
  plan_id: number;
  slot_time?: string | null;
  title: string;
  type: string;
  status: string;
  memo?: string | null;
  payload_json?: Record<string, unknown> | null;
  executed_at?: string | null;
  actor_admin_id?: number | null;
  created_at: string;
  updated_at: string;
};

export type OpsTargetList = {
  id: number;
  plan_id: number;
  name: string;
  source_type: string;
  source_params?: Record<string, unknown> | null;
  count_snapshot: number;
  is_processed: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateOpsCampaignRequest = {
  name: string;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
  owner_admin_id?: number | null;
  goal_json?: Record<string, unknown> | null;
  notes_md?: string | null;
};

export async function createOpsCampaign(payload: CreateOpsCampaignRequest) {
  const { data } = await adminApi.post<OpsCampaign>(`${BASE_PATH}/campaigns`, payload);
  return data;
}

export async function fetchOpsCampaigns(params?: { status?: string }) {
  const { data } = await adminApi.get<OpsCampaign[]>(`${BASE_PATH}/campaigns`, { params });
  return data;
}

export async function updateOpsCampaign(campaignId: number, payload: {
  name?: string;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
  owner_admin_id?: number | null;
  goal_json?: Record<string, unknown> | null;
  notes_md?: string | null;
}) {
  const { data } = await adminApi.patch<OpsCampaign>(`${BASE_PATH}/campaigns/${campaignId}`, payload);
  return data;
}

export async function ensureOpsPlan(payload: { campaign_id: number; plan_date: string }) {
  const { data } = await adminApi.post<OpsPlan>(`${BASE_PATH}/plans`, payload);
  return data;
}

export async function deleteOpsPlan(planId: number) {
  await adminApi.delete(`${BASE_PATH}/plans/${planId}`);
}

export async function fetchOpsPlanTasks(planId: number) {
  const { data } = await adminApi.get<OpsPlanTask[]>(`${BASE_PATH}/plans/${planId}/tasks`);
  return data;
}

export async function createOpsPlanTask(planId: number, payload: {
  slot_time?: string | null;
  title: string;
  type?: string;
  status?: string;
  memo?: string | null;
  payload_json?: Record<string, unknown>;
}) {
  const { data } = await adminApi.post<OpsPlanTask>(`${BASE_PATH}/plans/${planId}/tasks`, payload);
  return data;
}

export async function updateOpsPlanTask(taskId: number, payload: {
  slot_time?: string | null;
  title?: string;
  type?: string;
  status?: string;
  memo?: string | null;
  payload_json?: Record<string, unknown> | null;
}) {
  const { data } = await adminApi.patch<OpsPlanTask>(`${BASE_PATH}/tasks/${taskId}`, payload);
  return data;
}

export async function deleteOpsPlanTask(taskId: number) {
  await adminApi.delete(`${BASE_PATH}/tasks/${taskId}`);
}

export async function executeOpsPlanTask(taskId: number, payload?: { status?: string }) {
  const { data } = await adminApi.post<OpsPlanTask>(`${BASE_PATH}/tasks/${taskId}/execute`, {
    status: payload?.status ?? "DONE",
  });
  return data;
}

export async function fetchOpsTargetLists(planId: number) {
  const { data } = await adminApi.get<OpsTargetList[]>(`${BASE_PATH}/plans/${planId}/target-lists`);
  return data;
}

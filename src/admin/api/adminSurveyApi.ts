import { adminApi } from "./httpClient";

export type AdminSurvey = {
  id: number;
  title: string;
  status: string;
  channel: string;
  created_at: string;
  updated_at: string;
  question_count: number;
};

export type AdminSurveyListResponse = { items: AdminSurvey[] };

export type AdminSurveyQuestionInput = {
  title: string;
  question_type: string;
  order_index: number;
  is_required: boolean;
  helper_text?: string | null;
  randomize_group?: string | null;
  config_json?: Record<string, unknown> | null;
  options: Array<{ value?: string; label?: string; order_index?: number; weight?: number }>;
};

export type AdminSurveyUpsertRequest = {
  title: string;
  description?: string | null;
  channel: string;
  status: string;
  reward_json?: Record<string, unknown> | null;
  target_segment_json?: Record<string, unknown> | null;
  auto_launch?: boolean;
  start_at?: string | null;
  end_at?: string | null;
  questions: AdminSurveyQuestionInput[];
};

export type AdminSurveyDetail = AdminSurveyUpsertRequest & {
  id: number;
  questions: Array<AdminSurveyQuestionInput & { id: number }>;
};

export type AdminSurveyTrigger = {
  id: number;
  trigger_type: string;
  trigger_config_json?: Record<string, unknown> | null;
  priority: number;
  cooldown_hours: number;
  max_per_user: number;
  is_active: boolean;
};

export async function fetchAdminSurveys(): Promise<AdminSurveyListResponse> {
  const res = await adminApi.get<AdminSurveyListResponse>("/surveys/");
  return res.data;
}

export async function fetchAdminSurveyDetail(id: number): Promise<AdminSurveyDetail> {
  const res = await adminApi.get<AdminSurveyDetail>(`/surveys/${id}`);
  return res.data;
}

export async function createAdminSurvey(payload: AdminSurveyUpsertRequest): Promise<AdminSurveyDetail> {
  const res = await adminApi.post<AdminSurveyDetail>("/surveys/", payload);
  return res.data;
}

export async function updateAdminSurvey(id: number, payload: AdminSurveyUpsertRequest): Promise<AdminSurveyDetail> {
  const res = await adminApi.put<AdminSurveyDetail>(`/surveys/${id}`, payload);
  return res.data;
}

export async function fetchAdminSurveyTriggers(id: number): Promise<{ items: AdminSurveyTrigger[] }> {
  const res = await adminApi.get<{ items: AdminSurveyTrigger[] }>(`/surveys/${id}/triggers`);
  return res.data;
}

export async function upsertAdminSurveyTriggers(id: number, payload: Array<Omit<AdminSurveyTrigger, "id">>): Promise<{ items: AdminSurveyTrigger[] }> {
  const res = await adminApi.put<{ items: AdminSurveyTrigger[] }>(`/surveys/${id}/triggers`, payload);
  return res.data;
}

import userApi from "./httpClient";

export type SurveyRewardMeta = {
  amount?: number | null;
  reward_type?: string | null;
  token_type?: string | null;
  toast_message?: string | null;
};

export type SurveySummary = {
  id: number;
  title: string;
  description?: string | null;
  channel: string;
  status: string;
  reward_json?: SurveyRewardMeta | null;
  pending_response_id?: number | null;
};

export type SurveyOption = {
  id: number;
  value: string;
  label: string;
  order_index: number;
  weight: number;
};

export type SurveyQuestion = {
  id: number;
  order_index: number;
  randomize_group?: string | null;
  question_type: string;
  title: string;
  helper_text?: string | null;
  is_required: boolean;
  config_json?: Record<string, unknown> | null;
  options: SurveyOption[];
};

export type SurveyDetail = {
  id: number;
  title: string;
  description?: string | null;
  channel: string;
  status: string;
  reward_json?: SurveyRewardMeta | null;
  questions: SurveyQuestion[];
};

export type SurveyResponseInfo = {
  id: number;
  survey_id: number;
  status: string;
  reward_status: string;
  last_question_id?: number | null;
  started_at?: string | null;
  completed_at?: string | null;
};

export type SurveyAnswerPayload = {
  question_id: number;
  option_id?: number | null;
  answer_text?: string | null;
  answer_number?: number | null;
  meta_json?: Record<string, unknown> | null;
};

export type SurveySession = {
  response: SurveyResponseInfo;
  survey: SurveyDetail;
  answers: SurveyAnswerPayload[];
};

export type SurveyCompleteResult = {
  response: SurveyResponseInfo;
  reward_applied: boolean;
  toast_message?: string | null;
};

export async function fetchActiveSurveys(): Promise<SurveySummary[]> {
  const res = await userApi.get<{ items: SurveySummary[] }>("/api/surveys/active");
  return res.data.items;
}

export async function createOrGetSession(surveyId: number): Promise<SurveySession> {
  const res = await userApi.post<SurveySession>(`/api/surveys/${surveyId}/responses`);
  return res.data;
}

export async function saveSurveyAnswers(
  surveyId: number,
  responseId: number,
  payload: { answers: SurveyAnswerPayload[]; last_question_id?: number | null }
): Promise<SurveySession> {
  const res = await userApi.patch<SurveySession>(`/api/surveys/${surveyId}/responses/${responseId}`, payload);
  return res.data;
}

export async function completeSurvey(
  surveyId: number,
  responseId: number,
  payload: { force_submit?: boolean }
): Promise<SurveyCompleteResult> {
  const res = await userApi.post<SurveyCompleteResult>(
    `/api/surveys/${surveyId}/responses/${responseId}/complete`,
    payload
  );
  return res.data;
}

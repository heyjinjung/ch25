import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeSurvey,
  createOrGetSession,
  fetchActiveSurveys,
  saveSurveyAnswers,
  SurveyAnswerPayload,
  SurveyCompleteResult,
  SurveySession,
  SurveySummary,
} from "../api/surveyApi";
import { useToast } from "../components/common/ToastProvider";

export function useActiveSurveys() {
  return useQuery<SurveySummary[]>({
    queryKey: ["surveys", "active"],
    queryFn: fetchActiveSurveys,
    staleTime: 60_000,
  });
}

export function useSurveySession(surveyId: number | undefined) {
  return useQuery<SurveySession>({
    queryKey: ["survey", surveyId, "session"],
    queryFn: () => createOrGetSession(surveyId as number),
    enabled: !!surveyId,
  });
}

export function useSaveSurveyAnswers(surveyId: number, responseId: number) {
  const queryClient = useQueryClient();
  return useMutation<SurveySession, unknown, { answers: SurveyAnswerPayload[]; last_question_id?: number | null }>(
    {
      mutationFn: (payload) => saveSurveyAnswers(surveyId, responseId, payload),
      onSuccess: (data) => {
        queryClient.setQueryData(["survey", surveyId, "session"], data);
      },
    }
  );
}

export function useCompleteSurvey(surveyId: number, responseId: number) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  return useMutation<SurveyCompleteResult, unknown, { force_submit?: boolean }>(
    {
      mutationFn: (payload) => completeSurvey(surveyId, responseId, payload),
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["surveys", "active"] });
        queryClient.invalidateQueries({ queryKey: ["survey", surveyId, "session"] });
        if (data.toast_message) {
          addToast(data.toast_message, data.reward_applied ? "success" : "info");
        }
      },
    }
  );
}

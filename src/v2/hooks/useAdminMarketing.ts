import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminMessages,
  sendAdminMessage,
  getSurveys,
  getSurveyResults,
  toggleSurvey,
  type SendMessageRequest
} from "../api/adminApi";

// ============================================================================
// Message Hooks
// ============================================================================

export function useAdminMessages() {
  return useQuery({
    queryKey: ["admin", "marketing", "messages"],
    queryFn: getAdminMessages,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SendMessageRequest) => sendAdminMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "marketing", "messages"] });
    },
  });
}

// ============================================================================
// Survey Hooks
// ============================================================================

export function useAdminSurveys() {
  return useQuery({
    queryKey: ["admin", "marketing", "surveys"],
    queryFn: getSurveys,
  });
}

export function useSurveyResults(surveyId: number) {
  return useQuery({
    queryKey: ["admin", "marketing", "survey", surveyId, "results"],
    queryFn: () => getSurveyResults(surveyId),
    enabled: !!surveyId,
  });
}

export function useToggleSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ surveyId, isActive }: { surveyId: number; isActive: boolean }) =>
      toggleSurvey(surveyId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "marketing", "surveys"] });
    },
  });
}

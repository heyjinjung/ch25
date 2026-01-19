// src/v2/hooks/useV2Admin.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  runV2SegmentBatch,
  createV2AdminMessage,
  type CreateMessageRequest,
} from "../api/adminApi";

// ============================================================================
// Admin/Ops Hooks
// ============================================================================

export function useV2RunSegmentBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => runV2SegmentBatch(),
    onSuccess: () => {
      // Invalidate user segment queries if needed
      queryClient.invalidateQueries({ queryKey: ["v2", "segments"] });
    },
  });
}

export function useV2CreateAdminMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateMessageRequest) => createV2AdminMessage(request),
    onSuccess: () => {
      // Invalidate inbox queries (users will see new messages)
      queryClient.invalidateQueries({ queryKey: ["v2", "inbox"] });
      // Invalidate admin message list if it exists
      queryClient.invalidateQueries({ queryKey: ["v2", "admin", "messages"] });
    },
  });
}

// Ops 실행 결과 조회 훅은 향후 API가 추가되면 구현
// export function useV2OpsExecutionResults(params?: { limit?: number; offset?: number }) {
//   return useQuery({
//     queryKey: ["v2", "ops", "executions", params?.limit, params?.offset],
//     queryFn: () => getV2OpsExecutionResults(params),
//     staleTime: 30000, // 30 seconds
//   });
// }

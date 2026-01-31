// src/hooks/useV2Golden.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  resolveV2Intervention,
  queueV2Reengagement,
  type RetentionInterventionRequest,
  type ReengagementQueueRequest,
} from "../api/goldenApi";
import {
  getGoldenHourStatus,
  type GoldenHourStatus,
} from "../api/goldenHourApi";

// ============================================================================
// Golden Hour Status Hook
// ============================================================================

export function useGoldenHourStatus() {
  return useQuery<GoldenHourStatus>({
    queryKey: ["golden-hour-status"],
    queryFn: getGoldenHourStatus,
    refetchInterval: 60000, // 1분마다 갱신
    staleTime: 30000, // 30초 캐시
  });
}

// ============================================================================
// Golden (Retention/Intervention) Hooks
// ============================================================================

export function useV2ResolveIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RetentionInterventionRequest) =>
      resolveV2Intervention(request),
    onSuccess: (data) => {
      // If reward was granted, invalidate relevant queries
      if (data.eligible && data.reward_type) {
        // Invalidate inventory (if item reward)
        queryClient.invalidateQueries({ queryKey: ["v2", "inventory"] });
        // Invalidate vault/balance (if point reward)
        queryClient.invalidateQueries({ queryKey: ["vault-status"] });
        queryClient.invalidateQueries({ queryKey: ["user-status"] });
      }
    },
  });
}

export function useV2QueueReengagement() {
  return useMutation({
    mutationFn: (request: ReengagementQueueRequest) =>
      queueV2Reengagement(request),
    // No cache invalidation needed for queuing
  });
}

// src/hooks/useV2Golden.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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

/**
 * Golden 개입 해결 훅
 * 
 * 보상이 지급되면 자동으로 Toast 알림을 표시합니다.
 * - 포인트 보상: "🎁 골든 보너스 지급! +{amount}P"
 * - 아이템 보상: "🎁 골든 보너스 지급! {reward_type}"
 */
export function useV2ResolveIntervention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RetentionInterventionRequest) =>
      resolveV2Intervention(request),
    onSuccess: (data) => {
      // If reward was granted, show toast notification
      if (data.eligible && data.reward_type) {
        const rewardAmount = data.capped_amount ?? data.reward_amount ?? 0;
        
        // 보상 타입에 따른 Toast 메시지
        if (data.reward_type === "POINT" && rewardAmount > 0) {
          toast.success(`🎁 골든 보너스 지급! +${rewardAmount.toLocaleString()}P`, {
            duration: 4000,
          });
        } else if (data.reward_type === "ITEM") {
          toast.success(`🎁 골든 보너스 아이템 지급!`, {
            duration: 4000,
          });
        } else if (rewardAmount > 0) {
          toast.success(`🎁 골든 보너스 지급!`, {
            duration: 4000,
          });
        }
        
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

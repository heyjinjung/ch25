// src/v2/hooks/useValentineSeol.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getValentineSeolStatus, claimSecretCode } from "../api/eventApi";

// ============================================================================
// Valentine & Seol Event Hooks
// ============================================================================

const EVENT_QUERY_KEY = ["v2", "event", "valentine-seol"] as const;

/**
 * 이벤트 미션 현황 + 비밀코드 입력 현황 조회.
 * enabled=false 로 이벤트 기간 외 API 호출 방지.
 */
export function useValentineSeolStatus(enabled = true) {
  return useQuery({
    queryKey: [...EVENT_QUERY_KEY, "status"],
    queryFn: getValentineSeolStatus,
    staleTime: 30000,
    enabled,
  });
}

/**
 * 비밀코드 입력 뮤테이션.
 * 성공 시 이벤트 상태 + 인벤토리 + 볼트 + 유저 캐시 무효화.
 */
export function useClaimSecretCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => claimSecretCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENT_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["v2", "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["v2-vault-status"] });
      queryClient.invalidateQueries({ queryKey: ["v2-user-me"] });
    },
  });
}

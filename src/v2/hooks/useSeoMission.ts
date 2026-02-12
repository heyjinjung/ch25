// src/v2/hooks/useSeoMission.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { claimSeoCode, getSeoMissionStatus } from "../../api/seoMissionApi";

const SEO_QUERY_KEY = ["v2", "seo-mission"] as const;

/**
 * 오늘의 SEO 미션 상태 조회.
 */
export function useSeoMissionStatus() {
  return useQuery({
    queryKey: [...SEO_QUERY_KEY, "status"],
    queryFn: getSeoMissionStatus,
    staleTime: 30000, // 30초
  });
}

/**
 * SEO 코드 입력 뮤테이션.
 * 성공 시 SEO 상태 + 볼트 + 유저 캐시 무효화.
 */
export function useClaimSeoCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => claimSeoCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEO_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["v2-vault-status"] });
      queryClient.invalidateQueries({ queryKey: ["v2-user-me"] });
    },
  });
}

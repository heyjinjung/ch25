import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminUiConfig,
  updateAdminUiConfig,
  type AdminUiConfigUpsertRequest,
} from "../api/adminApi";

export function useAdminUiConfig(key: string) {
  return useQuery({
    queryKey: ["admin", "ui-config", key],
    queryFn: () => getAdminUiConfig(key),
  });
}

export function useAdminUpdateUiConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      key,
      payload,
    }: {
      key: string;
      payload: AdminUiConfigUpsertRequest;
    }) => updateAdminUiConfig(key, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "ui-config", variables.key],
      });
      // Also invalidate the generic uiConfig used by V1 hooks if they share the same query cache key
      queryClient.invalidateQueries({
        queryKey: ["uiConfig", variables.key],
      });
    },
  });
}

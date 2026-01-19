import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTicketLogs,
  grantItem,
  revokeItem,
  type GrantItemRequest
} from "../api/adminApi";

// ============================================================================
// Inventory Hooks
// ============================================================================

export function useAdminTicketLogs(userId?: number) {
  return useQuery({
    queryKey: ["admin", "inventory", "logs", userId],
    queryFn: () => getTicketLogs(userId),
  });
}

export function useAdminGrantItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GrantItemRequest) => grantItem(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory", "logs"] });
      // If we are viewing a specific user's logs, we might need to invalidate that specific key too
      if (variables.userId) {
         queryClient.invalidateQueries({ queryKey: ["admin", "inventory", "logs", variables.userId] });
      }
    },
  });
}

export function useAdminRevokeItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GrantItemRequest) => revokeItem(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory", "logs"] });
      if (variables.userId) {
         queryClient.invalidateQueries({ queryKey: ["admin", "inventory", "logs", variables.userId] });
      }
    },
  });
}

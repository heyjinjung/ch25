// src/v2/hooks/useV2Inventory.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getV2Inventory,
  useV2InventoryItem,
  type UseInventoryItemRequest,
} from "../api/inventoryApi";

// ============================================================================
// Inventory Hooks
// ============================================================================

export function useV2Inventory() {
  return useQuery({
    queryKey: ["v2", "inventory"],
    queryFn: () => getV2Inventory(),
    staleTime: 10000, // 10 seconds
  });
}

export function useV2UseInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UseInventoryItemRequest) => useV2InventoryItem(request),
    onSuccess: () => {
      // Invalidate inventory (item consumed)
      queryClient.invalidateQueries({ queryKey: ["v2", "inventory"] });
      // Invalidate vault/balance (if item gives points)
      queryClient.invalidateQueries({ queryKey: ["vault-status"] });
      queryClient.invalidateQueries({ queryKey: ["user-status"] });
    },
  });
}

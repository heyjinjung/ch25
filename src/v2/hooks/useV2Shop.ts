// src/hooks/useV2Shop.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getV2ShopProducts,
  purchaseV2ShopProduct,
  type PurchaseShopProductRequest,
} from "../api/shopApi";

// ============================================================================
// Shop Hooks
// ============================================================================

export function useV2ShopProducts() {
  return useQuery({
    queryKey: ["v2", "shop", "products"],
    queryFn: () => getV2ShopProducts(),
    staleTime: 60000, // 1 minute
  });
}

export function useV2PurchaseProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: PurchaseShopProductRequest) =>
      purchaseV2ShopProduct(request),
    onSuccess: () => {
      // Invalidate shop products (stock may have changed)
      queryClient.invalidateQueries({ queryKey: ["v2", "shop", "products"] });
      // Invalidate inventory/wallet (reward delivered)
      queryClient.invalidateQueries({ queryKey: ["v2", "inventory"] });
      // Invalidate vault/balance (cost deducted)
      queryClient.invalidateQueries({ queryKey: ["v2-vault-status"] });
      queryClient.invalidateQueries({ queryKey: ["v2-user-me"] });
    },
  });
}

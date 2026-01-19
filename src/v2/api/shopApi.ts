// src/v2/api/shopApi.ts
import { v2Client } from "./client";

// ============================================================================
// Shop API
// ============================================================================

export interface ShopProductDto {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly cost_type: "VAULT" | "DIAMOND";
  readonly cost_amount: number;
  readonly reward_type: string;
  readonly reward_amount: number;
  readonly is_active: boolean;
  readonly display_order?: number;
}

export interface ShopProductListResponse {
  readonly products: ShopProductDto[];
}

export interface PurchaseShopProductRequest {
  readonly sku: string;
}

export interface PurchaseShopProductResponse {
  readonly order_id: string;
  readonly sku: string;
  readonly reward_type: string;
  readonly reward_amount: number;
}

export const getV2ShopProducts = async (): Promise<ShopProductDto[]> => {
  try {
    const response = await v2Client.get<ShopProductDto[]>("/api/v2/shop/products");
    return response.data;
  } catch (error) {
    console.error("[shopApi] Failed to fetch V2 shop products", error);
    throw error;
  }
};

export const purchaseV2ShopProduct = async (request: PurchaseShopProductRequest): Promise<PurchaseShopProductResponse> => {
  try {
    const response = await v2Client.post<PurchaseShopProductResponse>("/api/v2/shop/purchase", request);
    return response.data;
  } catch (error) {
    console.error("[shopApi] Failed to purchase V2 shop product", error);
    throw error;
  }
};

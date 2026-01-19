// src/v2/api/shopApi.ts
import userApi from "../../api/httpClient";

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
  readonly product_id: string;
  readonly quantity?: number;
}

export interface PurchaseShopProductResponse {
  readonly success: boolean;
  readonly order_id: string;
  readonly product_name: string;
  readonly cost_amount: number;
  readonly reward_type: string;
  readonly reward_amount: number;
  readonly message?: string;
}

export const getV2ShopProducts = async (): Promise<ShopProductListResponse> => {
  try {
    const response = await userApi.get<ShopProductListResponse>("/api/v2/shop/products");
    return response.data;
  } catch (error) {
    console.error("[shopApi] Failed to fetch V2 shop products", error);
    throw error;
  }
};

export const purchaseV2ShopProduct = async (request: PurchaseShopProductRequest): Promise<PurchaseShopProductResponse> => {
  try {
    const response = await userApi.post<PurchaseShopProductResponse>("/api/v2/shop/purchase", request);
    return response.data;
  } catch (error) {
    console.error("[shopApi] Failed to purchase V2 shop product", error);
    throw error;
  }
};

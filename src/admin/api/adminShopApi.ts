import { adminApi } from "./httpClient";

export type AdminShopProduct = {
  sku: string;
  title: string;
  cost: { token: string; amount: number };
  grant: { item_type: string; amount: number };
  is_active?: boolean;
  source?: "builtin" | "custom";
};

export type ShopProductsOverrides = {
  products?: Record<
    string,
    {
      title?: string;
      cost_token?: string;
      cost_amount?: number;
      item_type?: string;
      item_amount?: number;
      is_active?: boolean;
    }
  >;
  deleted_skus?: string[];
};

export type AdminUiConfigResponse = {
  key: string;
  value: any;
  updated_at: string | null;
};

export async function fetchAdminShopProducts(): Promise<AdminShopProduct[]> {
  const { data } = await adminApi.get<AdminShopProduct[]>("/api/admin/shop/products");
  return data;
}

export async function fetchAdminShopOverrides(): Promise<AdminUiConfigResponse> {
  const { data } = await adminApi.get<AdminUiConfigResponse>("/api/admin/shop/products/overrides");
  return data;
}

export async function upsertAdminShopOverrides(value: ShopProductsOverrides): Promise<AdminUiConfigResponse> {
  const { data } = await adminApi.put<AdminUiConfigResponse>("/api/admin/shop/products/overrides", value);
  return data;
}

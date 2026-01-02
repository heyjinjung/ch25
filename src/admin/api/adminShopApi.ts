import { adminApi } from "./httpClient";

export type AdminShopProduct = {
  sku: string;
  title: string;
  cost: { token: string; amount: number };
  grant: { item_type: string; amount: number };
  is_active?: boolean;
};

export type ShopProductsOverrides = {
  products?: Record<
    string,
    {
      title?: string;
      cost_amount?: number;
      is_active?: boolean;
    }
  >;
};

export type AdminUiConfigResponse = {
  key: string;
  value: any;
  updated_at: string | null;
};

export async function fetchAdminShopProducts(): Promise<AdminShopProduct[]> {
  const { data } = await adminApi.get<AdminShopProduct[]>("/admin/api/shop/products");
  return data;
}

export async function fetchAdminShopOverrides(): Promise<AdminUiConfigResponse> {
  const { data } = await adminApi.get<AdminUiConfigResponse>("/admin/api/shop/products/overrides");
  return data;
}

export async function upsertAdminShopOverrides(value: ShopProductsOverrides): Promise<AdminUiConfigResponse> {
  const { data } = await adminApi.put<AdminUiConfigResponse>("/admin/api/shop/products/overrides", { value });
  return data;
}

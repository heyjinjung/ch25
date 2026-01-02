import { adminApi } from "./httpClient";

export type EconomyStats = {
  shop_purchases: Array<{ reason: string; count: number; sum_delta: number }>;
  voucher_uses: Array<{ item_type: string; count: number; sum_abs_delta: number }>;
  idempotency: Array<{ scope: string; count: number; completed: number; in_progress: number; failed: number }>;
};

export async function fetchEconomyStats(): Promise<EconomyStats> {
  const { data } = await adminApi.get<EconomyStats>("/admin/api/economy/stats");
  return data;
}

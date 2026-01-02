import { adminApi } from "./httpClient";

export type AdminInventoryItem = {
  item_type: string;
  quantity: number;
  updated_at?: string;
};

export type AdminInventoryLedgerEntry = {
  id: number;
  item_type: string;
  change_amount: number;
  balance_after: number;
  reason: string;
  related_id: string | null;
  created_at: string;
};

export type AdminInventoryUserSummary = {
  id: number;
  external_id: string | null;
  telegram_username: string | null;
  nickname: string | null;
};

export type AdminUserInventoryResponse = {
  user: AdminInventoryUserSummary;
  items: AdminInventoryItem[];
  ledger: AdminInventoryLedgerEntry[];
};

export async function fetchAdminUserInventory(userId: number, limit = 50): Promise<AdminUserInventoryResponse> {
  const { data } = await adminApi.get<AdminUserInventoryResponse>(`/admin/api/inventory/users/${userId}`, {
    params: { limit },
  });
  return data;
}

export async function adjustAdminUserInventory(
  userId: number,
  payload: { item_type: string; delta: number; note?: string }
): Promise<{ success: boolean; user_id: number; item_type: string; quantity: number }> {
  const { data } = await adminApi.post(`/admin/api/inventory/users/${userId}/adjust`, payload);
  return data;
}

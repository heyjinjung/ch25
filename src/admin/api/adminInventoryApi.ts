import { adminApi } from './httpClient';

export interface AdminInventoryItem {
  id: number;
  user_id: number;
  nickname?: string;
  item_type: string;
  quantity: number;
  updated_at: string;
}

export interface AdminInventoryLedger {
  id: number;
  user_id: number;
  nickname?: string;
  item_type: string;
  change_amount: number;
  balance_after: number;
  reason: string;
  related_id: string;
  created_at: string;
}

export interface InventoryLedgerParams {
  user_id?: number;
  item_type?: string;
  related_id?: string;
  limit?: number;
}

export interface InventoryItemParams {
  user_id?: number;
  item_type?: string;
  min_quantity?: number;
  limit?: number;
  sort_by?: string;
  sort_desc?: boolean;
}

export interface UserInventoryResponse {
  user_summary: any;
  user: {
    id: number;
    external_id: string;
    telegram_id: number | null;
    telegram_username: string | null;
    nickname: string | null;
  };
  items: Array<{
    item_type: string;
    quantity: number;
    updated_at: string;
  }>;
  ledger: Array<{
    id: number;
    item_type: string;
    change_amount: number;
    balance_after: number;
    reason: string;
    related_id: string;
    created_at: string;
  }>;
}

export const adminInventoryApi = {
  // System-wide Ledger
  fetchLedger: async (params: InventoryLedgerParams): Promise<AdminInventoryLedger[]> => {
    const { data } = await adminApi.get('/api/admin/inventory/ledger', { params });
    return data;
  },

  // System-wide Items (Snapshot)
  fetchItems: async (params: InventoryItemParams): Promise<AdminInventoryItem[]> => {
    const { data } = await adminApi.get('/api/admin/inventory/items', { params });
    return data;
  },

  // Single User Detailed Inventory (Items + Ledger)
  fetchUserInventory: async (userId: number, limit: number = 50): Promise<UserInventoryResponse> => {
    const { data } = await adminApi.get(`/api/admin/inventory/users/${userId}`, { params: { limit } });
    return data;
  },

  // Single User Ledger Only
  fetchUserLedger: async (userId: number, limit: number = 50): Promise<AdminInventoryLedger[]> => {
    const { data } = await adminApi.get(`/api/admin/inventory/users/${userId}/ledger`, { params: { limit } });
    return data;
  },
};

// --- Legacy / Named Exports for Backward Compatibility ---

export const fetchAdminUserInventory = adminInventoryApi.fetchUserInventory;

export const fetchAdminUserInventoryByIdentifier = async (identifier: string, limit: number = 50): Promise<UserInventoryResponse> => {
  const { data } = await adminApi.get(`/api/admin/inventory/users/by-identifier/${encodeURIComponent(identifier)}`, { params: { limit } });
  return data;
};

export interface InventoryAdjustPayload {
  item_type: string;
  delta: number;
  note?: string;
}

export const adjustAdminUserInventory = async (userId: number, payload: InventoryAdjustPayload) => {
  const { data } = await adminApi.post(`/api/admin/inventory/users/${userId}/adjust`, payload);
  return data;
};

export const adjustAdminUserInventoryByIdentifier = async (identifier: string, payload: InventoryAdjustPayload) => {
  const { data } = await adminApi.post(`/api/admin/inventory/users/by-identifier/${encodeURIComponent(identifier)}/adjust`, payload);
  return data;
};

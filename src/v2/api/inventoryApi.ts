// src/v2/api/inventoryApi.ts
import { v2Client } from "./client";

// ============================================================================
// Inventory API
// ============================================================================

export interface InventoryItemDto {
  readonly item_type: string;
  readonly quantity: number;
  readonly metadata?: Record<string, unknown>;
}

export interface WalletBalanceDto {
  readonly token_type: string;
  readonly balance: number;
}

export interface InventoryResponse {
  readonly items: InventoryItemDto[];
  readonly wallet: Record<string, number>;
}

export interface UseInventoryItemRequest {
  readonly item_type: string;
  readonly quantity: number;
}

export interface UseInventoryItemResponse {
  readonly success: boolean;
  readonly item_type: string;
  readonly quantity_used: number;
  readonly reward_type?: string;
  readonly reward_amount?: number;
  readonly message?: string;
}

export const getV2Inventory = async (): Promise<InventoryResponse> => {
  try {
    const response = await v2Client.get<InventoryResponse>("/api/v2/inventory");
    return response.data;
  } catch (error) {
    console.error("[inventoryApi] Failed to fetch V2 inventory", error);
    throw error;
  }
};

export const useV2InventoryItem = async (request: UseInventoryItemRequest): Promise<UseInventoryItemResponse> => {
  try {
    const response = await v2Client.post<UseInventoryItemResponse>("/api/v2/inventory/use", request);
    return response.data;
  } catch (error) {
    console.error("[inventoryApi] Failed to use V2 inventory item", error);
    throw error;
  }
};

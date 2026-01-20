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
  readonly quantity?: number;
  readonly amount?: number;
  readonly idempotency_key?: string;
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

export const useV2InventoryItem = async (
  request: UseInventoryItemRequest,
): Promise<UseInventoryItemResponse> => {
  try {
    const resolvedAmount = request.amount ?? request.quantity ?? 1;
    const resolvedKey =
      request.idempotency_key ||
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

    const response = await v2Client.post<UseInventoryItemResponse>(
      "/api/v2/inventory/use",
      {
        item_type: request.item_type,
        amount: resolvedAmount,
        idempotency_key: resolvedKey,
      },
      {
        headers: {
          "X-Idempotency-Key": resolvedKey,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("[inventoryApi] Failed to use V2 inventory item", error);
    throw error;
  }
};

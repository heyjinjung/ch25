import apiClient from "./apiClient";


export interface InventoryItem {
    item_type: string;
    quantity: number;
    created_at: string;
}

export interface InventoryData {
    items: InventoryItem[];
    wallet: Record<string, number>;
}

export interface ShopProduct {
    sku: string;
    title: string;
    cost: {
        token: string;
        amount: number;
    };
    grant: {
        item_type: string;
        amount: number;
    };
}

export const fetchInventory = async (): Promise<InventoryData> => {
    const response = await apiClient.get("/inventory");
    const raw = response.data as Partial<InventoryData> | null | undefined;

    const items = Array.isArray(raw?.items)
        ? raw.items.map((item) => ({
            item_type: String((item as any)?.item_type ?? ""),
            quantity: Number((item as any)?.quantity ?? 0),
            created_at: String((item as any)?.created_at ?? ""),
        }))
        : [];

    const wallet = raw?.wallet && typeof raw.wallet === "object" && !Array.isArray(raw.wallet)
        ? (raw.wallet as Record<string, number>)
        : {};

    return { items, wallet };
};

export const fetchShopProducts = async (): Promise<ShopProduct[]> => {
    const response = await apiClient.get("/shop/products");
    return response.data;
};

export const purchaseProduct = async (sku: string): Promise<any> => {
    const response = await apiClient.post("/shop/purchase", { sku });
    return response.data;
};

export const useInventoryItem = async (item_type: string, amount: number = 1): Promise<any> => {
    const response = await apiClient.post("/inventory/use", { item_type, amount });
    return response.data;
};

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
    is_active?: boolean;
    source?: string;
}

export const fetchInventory = async (): Promise<InventoryData> => {
    const response = await apiClient.get("/api/inventory");
    const raw = response.data as Partial<InventoryData> | null | undefined;

    // If the frontend router (SPA) returns HTML with 200, fail fast instead of showing an empty inventory.
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error("INVALID_INVENTORY_RESPONSE");
    }

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
    const response = await apiClient.get("/api/shop/products");
    const raw = response.data as any;
    if (!Array.isArray(raw)) {
        throw new Error("INVALID_SHOP_PRODUCTS");
    }

    return raw.map((p) => ({
        sku: String(p?.sku ?? ""),
        title: String(p?.title ?? ""),
        cost: {
            token: String(p?.cost?.token ?? ""),
            amount: Number(p?.cost?.amount ?? 0),
        },
        grant: {
            item_type: String(p?.grant?.item_type ?? ""),
            amount: Number(p?.grant?.amount ?? 0),
        },
        is_active: typeof p?.is_active === "boolean" ? p.is_active : undefined,
        source: typeof p?.source === "string" ? p.source : undefined,
    })).filter((p) => p.sku && p.cost.token);
};

export const purchaseProduct = async (sku: string): Promise<any> => {
    const response = await apiClient.post("/api/shop/purchase", { sku });
    return response.data;
};

export const useInventoryItem = async (item_type: string, amount: number = 1): Promise<any> => {
    const response = await apiClient.post("/api/inventory/use", { item_type, amount });
    return response.data;
};

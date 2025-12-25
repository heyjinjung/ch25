import httpClient from "./httpClient";
import { userApi } from "../../api/httpClient";

export interface VaultProgramResponse {
    key: string;
    name: string;
    duration_hours: number;
    expire_policy: string | null;
    is_active: boolean;
    unlock_rules_json: any;
    ui_copy_json: any;
    config_json: any;
}

export interface VaultStatsResponse {
    today_accrual: Record<string, { count: number; total: number }>;
    today_skips: Record<string, number>;
    expiring_soon_24h: number;
    today_unlock_cash: number;
    timestamp: string;
}

export const getVaultDefaultProgram = async (): Promise<VaultProgramResponse> => {
    const { data } = await userApi.get("/api/admin/vault-programs/default");
    return data;
};

export const updateVaultUnlockRules = async (
    programKey: string,
    unlockRulesJson: any
): Promise<VaultProgramResponse> => {
    const { data } = await userApi.put(`/api/admin/vault-programs/${programKey}/unlock-rules`, {
        unlock_rules_json: unlockRulesJson,
    });
    return data;
};

export const updateVaultUiCopy = async (
    programKey: string,
    uiCopyJson: any
): Promise<VaultProgramResponse> => {
    const { data } = await userApi.put(`/api/admin/vault-programs/${programKey}/ui-copy`, {
        ui_copy_json: uiCopyJson,
    });
    return data;
};

export const updateVaultConfig = async (
    programKey: string,
    configJson: any
): Promise<VaultProgramResponse> => {
    const { data } = await userApi.put(`/api/admin/vault-programs/${programKey}/config`, {
        config_json: configJson,
    });
    return data;
};

export const getVaultStats = async (): Promise<VaultStatsResponse> => {
    const { data } = await userApi.get("/api/admin/vault-programs/stats");
    return data;
};

export const tickVaultTransitions = async (): Promise<{ updated: number }> => {
    // uses /admin/api/vault2 prefix. httpClient base is .../admin/api.
    // So we use relative path /vault2/tick
    const { data } = await httpClient.post("/vault2/tick");
    return data;
};

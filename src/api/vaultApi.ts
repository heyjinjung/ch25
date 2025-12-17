// src/api/vaultApi.ts
import userApi from "./httpClient";

interface BackendVaultStatusResponse {
  readonly eligible: boolean;
  readonly vault_balance: number;
  readonly cash_balance: number;
  readonly vault_fill_used_at?: string | null;
  readonly seeded?: boolean;
  readonly expires_at?: string | null;
}

export interface VaultStatusResponse {
  readonly eligible: boolean;
  readonly vaultBalance: number;
  readonly cashBalance: number;
  readonly vaultFillUsedAt?: string | null;
  readonly seeded?: boolean;
  readonly expiresAt?: string | null;
}

export const getVaultStatus = async (): Promise<VaultStatusResponse> => {
  const response = await userApi.get<BackendVaultStatusResponse>("/api/vault/status");
  const data = response.data;
  return {
    eligible: data.eligible,
    vaultBalance: data.vault_balance ?? 0,
    cashBalance: data.cash_balance ?? 0,
    vaultFillUsedAt: data.vault_fill_used_at ?? null,
    seeded: data.seeded ?? false,
    expiresAt: data.expires_at ?? null,
  };
};

// src/api/vaultApi.ts
import userApi from "./httpClient";

interface BackendVaultStatusResponse {
  readonly eligible: boolean;
  readonly vault_balance: number;
  readonly locked_balance?: number;
  readonly available_balance?: number;
  readonly cash_balance: number;
  readonly vault_fill_used_at?: string | null;
  readonly seeded?: boolean;
  readonly expires_at?: string | null;
  readonly recommended_action?: string | null;
  readonly cta_payload?: Record<string, unknown> | null;
  readonly program_key?: string | null;
  readonly unlock_rules_json?: Record<string, unknown> | null;
  readonly ui_copy_json?: Record<string, unknown> | null;
  readonly accrual_multiplier?: number | null;
}

export interface VaultStatusResponse {
  readonly eligible: boolean;
  readonly vaultBalance: number;
  readonly lockedBalance?: number;
  readonly availableBalance?: number;
  readonly cashBalance: number;
  readonly vaultFillUsedAt?: string | null;
  readonly seeded?: boolean;
  readonly expiresAt?: string | null;
  readonly recommendedAction?: string | null;
  readonly ctaPayload?: Record<string, unknown> | null;

  // Phase 2/3 rollout helpers
  readonly programKey?: string | null;
  readonly unlockRulesJson?: Record<string, unknown> | null;
  readonly uiCopyJson?: Record<string, unknown> | null;

  // Event flags
  readonly accrualMultiplier?: number | null;
}

export const getVaultStatus = async (): Promise<VaultStatusResponse> => {
  const response = await userApi.get<BackendVaultStatusResponse>("/api/vault/status");
  const data = response.data;
  const locked = data.locked_balance ?? data.vault_balance ?? 0;
  const available = data.available_balance ?? 0;
  return {
    eligible: data.eligible,
    // Keep legacy name but prefer source-of-truth locked balance when available
    vaultBalance: locked,
    lockedBalance: data.locked_balance ?? undefined,
    availableBalance: available,
    cashBalance: data.cash_balance ?? 0,
    vaultFillUsedAt: data.vault_fill_used_at ?? null,
    seeded: data.seeded ?? false,
    expiresAt: data.expires_at ?? null,
    recommendedAction: data.recommended_action ?? null,
    ctaPayload: (data.cta_payload as Record<string, unknown> | null) ?? null,

    programKey: data.program_key ?? null,
    unlockRulesJson: (data.unlock_rules_json as Record<string, unknown> | null) ?? null,
    uiCopyJson: (data.ui_copy_json as Record<string, unknown> | null) ?? null,

    accrualMultiplier: data.accrual_multiplier ?? null,
  };
};
// Phase 1 MVP Withdrawal Request
export const requestWithdrawal = async (amount: number): Promise<{ success: boolean; message: string }> => {
  try {
    await userApi.post("/api/vault/withdraw", { amount });
    return { success: true, message: "출금 신청이 완료되었습니다." };
  } catch (err: any) {
    // Handle specific errors like 'insufficient_funds', 'daily_limit', etc.
    const msg = err.response?.data?.detail || "신청 중 오류가 발생했습니다.";
    return { success: false, message: msg };
  }
};

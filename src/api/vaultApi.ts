// src/api/vaultApi.ts
import userApi from "./httpClient";

interface BackendVaultStatusResponse {
  readonly eligible: boolean;
  readonly vault_balance: number;
  readonly locked_balance?: number;
  readonly available_balance?: number;
  readonly vault_amount_total?: number;
  readonly vault_amount_reserved?: number;
  readonly vault_amount_available?: number;
  readonly vault_fill_used_at?: string | null;
  readonly seeded?: boolean;
  readonly expires_at?: string | null;
  readonly recommended_action?: string | null;
  readonly cta_payload?: Record<string, unknown> | null;
  readonly vault_max_limit?: number;
  readonly program_key?: string | null;
  readonly unlock_rules_json?: Record<string, unknown> | null;
  readonly ui_copy_json?: Record<string, unknown> | null;
  readonly accrual_multiplier?: number | null;
  readonly ticket_count?: number;
  readonly total_charge_amount?: number;
  readonly is_golden_hour_active?: boolean;
  readonly golden_hour_multiplier?: number;
  readonly golden_hour_remaining_seconds?: number;
  readonly show_modal_override?: string | null;
  readonly segment?: string | null;
  readonly deposit_status?: string | null;
  readonly benefits_suspended?: boolean;

  // Withdrawal Conditions
  readonly daily_play_count?: number;
  readonly daily_play_target?: number;
  readonly daily_deposit_confirmed?: boolean;
  readonly daily_vault_spent?: number;
  readonly daily_vault_spent_target?: number;
  readonly withdrawal_count?: number;
}

export interface VaultStatusResponse {
  readonly eligible: boolean;
  readonly vaultBalance: number;
  readonly lockedBalance?: number;
  readonly availableBalance?: number;
  readonly vaultAmountTotal?: number;
  readonly vaultAmountReserved?: number;
  readonly vaultAmountAvailable?: number;
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
  readonly ticketCount?: number;
  readonly totalChargeAmount?: number;

  readonly is_golden_hour_active?: boolean;
  readonly golden_hour_multiplier?: number;
  readonly golden_hour_remaining_seconds?: number;
  readonly showModalOverride?: string | null;
  readonly segment?: string | null;
  readonly vaultMaxLimit?: number;
  readonly depositStatus?: string | null;
  readonly benefitsSuspended?: boolean;

  // Withdrawal Conditions
  readonly dailyPlayCount?: number;
  readonly dailyPlayTarget?: number;
  readonly dailyDepositConfirmed?: boolean;
  readonly dailyVaultSpent?: number;
  readonly dailyVaultSpentTarget?: number;
  readonly withdrawalCount?: number;
}

export const getVaultStatus = async (): Promise<VaultStatusResponse> => {
  const response = await userApi.get<BackendVaultStatusResponse>("/api/vault/status");
  const data = response.data;
  const locked = data.vault_amount_total ?? data.locked_balance ?? data.vault_balance ?? 0;
  const available = data.vault_amount_available ?? data.available_balance ?? 0;
  const reserved = data.vault_amount_reserved ?? Math.max(locked - available, 0);
  return {
    eligible: data.eligible,
    // Keep legacy name but prefer source-of-truth locked balance when available
    vaultBalance: locked,
    lockedBalance: data.locked_balance ?? undefined,
    availableBalance: available,
    vaultAmountTotal: locked,
    vaultAmountReserved: reserved,
    vaultAmountAvailable: available,
    vaultFillUsedAt: data.vault_fill_used_at ?? null,
    seeded: data.seeded ?? false,
    expiresAt: data.expires_at ?? null,
    recommendedAction: data.recommended_action ?? null,
    ctaPayload: (data.cta_payload as Record<string, unknown> | null) ?? null,

    programKey: data.program_key ?? null,
    unlockRulesJson: (data.unlock_rules_json as Record<string, unknown> | null) ?? null,
    uiCopyJson: (data.ui_copy_json as Record<string, unknown> | null) ?? null,

    accrualMultiplier: data.accrual_multiplier ?? null,
    ticketCount: data.ticket_count ?? 0,
    totalChargeAmount: data.total_charge_amount ?? 0,

    is_golden_hour_active: data.is_golden_hour_active ?? false,
    golden_hour_multiplier: data.golden_hour_multiplier ?? 1.0,
    golden_hour_remaining_seconds: data.golden_hour_remaining_seconds ?? 0,
    showModalOverride: data.show_modal_override ?? null,
    segment: data.segment ?? null,
    vaultMaxLimit: data.vault_max_limit ?? 0,
    depositStatus: data.deposit_status ?? "ACTIVE",
    benefitsSuspended: data.benefits_suspended ?? false,

    // Withdrawal Conditions
    dailyPlayCount: data.daily_play_count ?? 0,
    dailyPlayTarget: data.daily_play_target ?? 30,
    dailyDepositConfirmed: data.daily_deposit_confirmed ?? false,
    dailyVaultSpent: data.daily_vault_spent ?? 0,
    dailyVaultSpentTarget: data.daily_vault_spent_target ?? 10000,
    withdrawalCount: data.withdrawal_count ?? 0,
  };
};

const mapWithdrawalErrorMessage = (detail: unknown): string | null => {
  if (typeof detail !== "string") return null;

  switch (detail) {
    case "DEPOSIT_REQUIRED_TODAY":
      return "오늘 입금(충전) 내역이 있어야 출금 신청이 가능합니다.";
    case "NO_DEPOSIT_RECORD_TODAY":
      return "오늘 입금(충전) 내역이 확인되지 않아 출금 신청이 불가능합니다.";
    case "MIN_PLAY_COUNT_30_REQUIRED":
        return "최근 3일 이내 게임 플레이 30회 조건을 만족해야 합니다.";
    case "MIN_DAILY_SPEND_10000_REQUIRED":
        return "오늘 금고 사용액이 10,000원 이상이어야 합니다.";
    case "NO_DEPOSIT_HISTORY":
        return "입금 이력이 없는 계정은 출금할 수 없습니다.";
    case "DEPOSIT_REQUIRED_TODAY_SYNC":
        return "오늘 입금(충전) 기록이 확인되지 않았습니다.";
    default:
      return null;
  }
};
// Phase 1 MVP Withdrawal Request
export const requestWithdrawal = async (amount: number): Promise<{ success: boolean; message: string }> => {
  try {
    await userApi.post("/api/vault/withdraw", { amount });
    return { success: true, message: "출금 신청이 완료되었습니다." };
  } catch (err: any) {
    // Handle specific errors like 'insufficient_funds', 'daily_limit', etc.
    const detail = err.response?.data?.detail;
    const msg = mapWithdrawalErrorMessage(detail) ?? detail ?? "신청 중 오류가 발생했습니다.";
    return { success: false, message: msg };
  }
};

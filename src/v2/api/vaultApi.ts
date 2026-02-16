import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { v2Client } from "./client";

export const useVaultBalance = () => {
  return useQuery({
    queryKey: ["vaultStatus"],
    queryFn: vaultApi.getStatus,
  });
};

export const useUpdateVaultBalance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      userId: string;
      amount: number;
      reason: string;
      type: string;
    }) => {
      const response = await v2Client.post(
        "/api/v2/admin/vault/adjustment",
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaultStatus"] });
    },
  });
};

export interface VaultStatusResponse {
  eligible: boolean;
  vaultBalance: number;
  lockedBalance: number;
  availableBalance: number;
  ticketCount: number;
  is_golden_hour_active: boolean;
  golden_hour_multiplier: number;
  golden_hour_remaining_seconds: number;
  showModalOverride: string | null;
  segment: string | null;
  daily_play_count: number;
  daily_play_target: number;
  daily_vault_spent: number;
  daily_vault_spent_target: number;
  daily_deposit_confirmed: boolean;
  daily_deposit_target: number;
  play_requirement_met: boolean;
  spend_requirement_met: boolean;
  withdrawal_count: number;
  today_earnings: number;
  minimum_withdrawal_amount: number;
  grace_period_active: boolean;
  grace_period_ends_at: string | null;
}

export interface WithdrawRequest {
  amount: number;
  protocol_key?: string;
}

export interface WithdrawResponse {
  request_id: number;
  status: string;
  amount: number;
  balance_after: number;
}

export const vaultApi = {
  getStatus: async (): Promise<VaultStatusResponse> => {
    const response = await v2Client.get<any>("/api/v2/vault/status");
    const data = response.data ?? {};

    // NOTE: 백엔드 응답이 camelCase/snake_case 혼재하거나 과거 키가 남아도
    // 출금 조건 모달에 필요한 필드가 항상 채워지도록 정규화한다.
    const lockedBalance = Number(
      data.lockedBalance ?? data.vaultBalance ?? data.vault_locked_balance ?? 0,
    );
    const vaultBalance = Number(data.vaultBalance ?? lockedBalance ?? 0);

    return {
      eligible: Boolean(data.eligible ?? false),
      vaultBalance: Number.isFinite(vaultBalance) ? vaultBalance : 0,
      lockedBalance: Number.isFinite(lockedBalance) ? lockedBalance : 0,
      availableBalance: Number(
        data.availableBalance ??
          data.available_balance ??
          data.vault_available_balance ??
          0,
      ),
      ticketCount: Number(data.ticketCount ?? data.ticket_count ?? 0),
      is_golden_hour_active: Boolean(data.is_golden_hour_active ?? false),
      golden_hour_multiplier: Number(data.golden_hour_multiplier ?? 1.0),
      golden_hour_remaining_seconds: Number(
        data.golden_hour_remaining_seconds ?? 0,
      ),
      showModalOverride: (data.showModalOverride ??
        data.show_modal_override ??
        null) as any,
      segment: (data.segment ?? null) as any,

      // 출금 조건(전체 게임 합산: 최근 3일 플레이 N회)
      daily_play_count: Number(
        data.daily_play_count ?? data.dailyPlayCount ?? 0,
      ),
      daily_play_target: Number(
        data.daily_play_target ?? data.dailyPlayTarget ?? 0,
      ),
      daily_vault_spent: Number(
        data.daily_vault_spent ?? data.dailyVaultSpent ?? 0,
      ),
      daily_vault_spent_target: Number(
        data.daily_vault_spent_target ?? data.dailyVaultSpentTarget ?? 0,
      ),
      daily_deposit_confirmed: Boolean(
        data.daily_deposit_confirmed ?? data.dailyDepositConfirmed ?? false,
      ),
      daily_deposit_target: Number(
        data.daily_deposit_target ?? data.dailyDepositTarget ?? 10000,
      ),
      play_requirement_met: Boolean(
        data.play_requirement_met ?? data.playRequirementMet ?? false,
      ),
      spend_requirement_met: Boolean(
        data.spend_requirement_met ?? data.spendRequirementMet ?? false,
      ),
      withdrawal_count: Number(
        data.withdrawal_count ?? data.withdrawalCount ?? 0,
      ),
      today_earnings: Number(data.today_earnings ?? data.todayEarnings ?? 0),
      minimum_withdrawal_amount: Number(
        data.minimum_withdrawal_amount ?? data.minimumWithdrawalAmount ?? 0,
      ),
      grace_period_active: Boolean(
        data.grace_period_active ?? data.gracePeriodActive ?? false,
      ),
      grace_period_ends_at: (data.grace_period_ends_at ??
        data.gracePeriodEndsAt ??
        null) as string | null,
    };
  },
  withdraw: async (data: WithdrawRequest): Promise<WithdrawResponse> => {
    const response = await v2Client.post<WithdrawResponse>(
      "/api/v2/vault/withdraw",
      data,
    );
    return response.data;
  },
};

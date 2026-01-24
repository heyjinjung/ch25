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
    mutationFn: async (data: { userId: string; amount: number; reason: string; type: string }) => {
       const response = await v2Client.post("/api/v2/admin/vault/adjustment", data);
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
  withdrawal_count: number;
  balances: Record<string, number>;
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
    const response = await v2Client.get<VaultStatusResponse>(
      "/api/v2/vault/status",
    );
    return response.data;
  },
  withdraw: async (data: WithdrawRequest): Promise<WithdrawResponse> => {
    const response = await v2Client.post<WithdrawResponse>(
      "/api/v2/vault/withdraw",
      data,
    );
    return response.data;
  },
};

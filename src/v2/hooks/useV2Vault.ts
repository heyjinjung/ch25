import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vaultApi, WithdrawRequest } from "../api/vaultApi";

export const useV2Vault = () => {
  const queryClient = useQueryClient();

  const useVaultStatus = () => {
    return useQuery({
      queryKey: ["v2-vault-status"],
      queryFn: vaultApi.getStatus,
      staleTime: 30_000,
      refetchInterval: 60_000,
    });
  };

  const useWithdraw = () => {
    return useMutation({
      mutationFn: (data: WithdrawRequest) => vaultApi.withdraw(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["v2-vault-status"] });
        // Also invalidate user balance if necessary
        queryClient.invalidateQueries({ queryKey: ["v2-user-me"] });
      },
    });
  };

  return {
    useVaultStatus,
    useWithdraw,
  };
};

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getAdminDeposits,
  confirmDeposit,
  getAdminProducts,
  updateProductStatus,
  updateProductPrice,
} from "../api/adminApi";
import type { AdminWithdrawalDto } from "../api/adminApi";

// ============================================================================
// Vault Hooks
// ============================================================================

export function useAdminWithdrawals() {
  return useQuery<AdminWithdrawalDto[]>({
    queryKey: ["admin", "withdrawals"],
    queryFn: () => getAdminWithdrawals(),
  });
}

export function useAdminApproveWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => approveWithdrawal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] });
    },
  });
}

export function useAdminRejectWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      rejectWithdrawal(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] });
    },
  });
}

// ============================================================================
// Deposit Hooks
// ============================================================================

export function useAdminDeposits() {
  return useQuery({
    queryKey: ["admin", "deposits"],
    queryFn: getAdminDeposits,
  });
}

export function useAdminConfirmDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => confirmDeposit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "deposits"] });
    },
  });
}

// ============================================================================
// Shop Hooks
// ============================================================================

export function useAdminProducts() {
  return useQuery({
    queryKey: ["admin", "products"],
    queryFn: getAdminProducts,
  });
}

export function useAdminUpdateProductStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isVisible }: { id: number; isVisible: boolean }) =>
      updateProductStatus(id, isVisible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });
}

export function useAdminUpdateProductPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, price }: { id: number; price: number }) =>
      updateProductPrice(id, price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });
}

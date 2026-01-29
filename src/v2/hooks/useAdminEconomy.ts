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
  getAdminLatencyEvidences,
  verifyLatencyEvidence,
  rejectLatencyEvidence,
  getAdminCircuitBreakerStatus,
  resetCircuitBreaker,
  updateCircuitBreakerLimit,
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
// ============================================================================
// Latency Survival Hooks
// ============================================================================

export function useAdminLatencyEvidences(params?: { status?: string }) {
  return useQuery({
    queryKey: ["admin", "latency-evidences", params?.status],
    queryFn: () => getAdminLatencyEvidences(params),
  });
}

export function useAdminVerifyLatencyEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, logId }: { id: number; logId: number }) =>
      verifyLatencyEvidence(id, logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "latency-evidences"] });
    },
  });
}

export function useAdminRejectLatencyEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      rejectLatencyEvidence(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "latency-evidences"] });
    },
  });
}

// ============================================================================
// Circuit Breaker Hooks
// ============================================================================

export function useAdminCircuitBreakerStatus() {
  return useQuery({
    queryKey: ["admin", "circuit-breaker", "status"],
    queryFn: getAdminCircuitBreakerStatus,
    refetchInterval: 10000, // 10초마다 갱신
  });
}

export function useAdminResetCircuitBreaker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      asset_type: string;
      limit_type: "GLOBAL" | "USER";
      user_id?: number | null;
    }) => resetCircuitBreaker(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "circuit-breaker"] });
    },
  });
}

export function useAdminUpdateCircuitBreakerLimit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      asset_type: string;
      global_limit?: number;
      user_limit?: number;
    }) => updateCircuitBreakerLimit(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "circuit-breaker"] });
    },
  });
}

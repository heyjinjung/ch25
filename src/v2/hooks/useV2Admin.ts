import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    runV2SegmentBatch, 
    createV2AdminMessage, 
    AdminMessageDto, 
    getAdminMessages, 
    getAdminWithdrawals, 
    approveWithdrawal, 
    rejectWithdrawal,
    getAdminUserDetail,
    getOpsDashboardStatus,
    AdminUserDetailDto,
    AdminWithdrawalDto,
    OpsDashboardResponse
} from "../api/adminApi";
import { CreateMessageRequest } from "../api/adminApi";

// Keys
export const ADMIN_KEYS = {
    segments: ["admin", "segments"] as const,
    messages: ["admin", "messages"] as const,
    withdrawals: (status: string) => ["admin", "withdrawals", status] as const,
    userDetail: (userId: number) => ["admin", "users", userId] as const,
    opsStatus: ["admin", "ops", "status"] as const,
};

// Segments
export function useRunSegmentBatch() {
    return useMutation({
        mutationFn: runV2SegmentBatch,
    });
}

// Messages
export function useAdminMessages() {
    return useQuery({
        queryKey: ADMIN_KEYS.messages,
        queryFn: getAdminMessages
    });
}

export function useCreateAdminMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateMessageRequest) => createV2AdminMessage(data),
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.messages });
        }
    });
}

// Withdrawals
export function useAdminWithdrawals(status: string = "PENDING") {
    return useQuery<AdminWithdrawalDto[]>({
        queryKey: ADMIN_KEYS.withdrawals(status),
        queryFn: () => getAdminWithdrawals(status),
        staleTime: 1000 * 60, // 1 min
    });
}

export function useAdminApproveWithdrawal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: approveWithdrawal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] });
        }
    });
}

export function useAdminRejectWithdrawal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectWithdrawal(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] });
        }
    });
}

// User Detail
export function useAdminUserDetail(userId: number | null) {
    return useQuery<AdminUserDetailDto>({
        queryKey: ADMIN_KEYS.userDetail(userId || 0),
        queryFn: () => getAdminUserDetail(userId!),
        enabled: !!userId,
        staleTime: 0, // Always fresh
    });
}

// Ops Status
export function useOpsStatus() {
    return useQuery<OpsDashboardResponse>({
        queryKey: ADMIN_KEYS.opsStatus,
        queryFn: getOpsDashboardStatus,
        refetchInterval: 10000, // Poll every 10s
    });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  runV2SegmentBatch,
  createV2AdminMessage,
  getAdminMessages,
  getAdminWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  getAdminUserDetail,
  getOpsDashboardStatus,
  runInterventionAction,
  adjustUserWallet,
  AdminUserDetailDto,
  AdminWithdrawalDto,
  OpsDashboardResponse,
  AdminWalletAdjustmentRequest,
  getAdminUserList,
  UserSearchParams,
  UserListResponse,
  getUserActivityLogs,
  getUserInventory,
  getUserNotes,
  createUserNote,
  getUserMissionHistory,
  forceCompleteMission,
  getUserSegment,
  getTicketLogs,
  UserActivityLogDto,
  UserInventoryItemDto,
  UserNoteDto,
  CreateUserNoteRequest,
  UserMissionHistoryDto,
  getAdminSegmentStats,
  getAdminSegmentRules,
  SegmentStatsResponse,
  SegmentRuleDto,
  TicketLogDto,
} from "../api/adminApi";
import { CreateMessageRequest } from "../api/adminApi";

// Keys
export const ADMIN_KEYS = {
  segments: ["admin", "segments"] as const,
  messages: ["admin", "messages"] as const,
  withdrawals: (status: string) => ["admin", "withdrawals", status] as const,
  userDetail: (userId: number) => ["admin", "users", userId] as const,
  opsStatus: ["admin", "ops", "status"] as const,
  userList: (params: UserSearchParams) => ["admin", "users", "list", params] as const,
  userActivityLogs: (userId: number) => ["admin", "users", userId, "activity-logs"] as const,
  userInventory: (userId: number) => ["admin", "users", userId, "inventory"] as const,
  userNotes: (userId: number) => ["admin", "users", userId, "notes"] as const,
  userMissions: (userId: number) => ["admin", "users", userId, "missions"] as const,
  userSegment: (userId: number) => ["admin", "users", userId, "segment"] as const,
  ticketLogs: (userId: number) => ["admin", "users", userId, "ticket-logs"] as const,
  segmentStats: ["admin", "segments", "stats"] as const,
  segmentRules: ["admin", "segments", "rules"] as const,
};

// Segments
export function useRunSegmentBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runV2SegmentBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.segmentStats });
    },
  });
}

export function useAdminSegmentStats() {
  return useQuery<SegmentStatsResponse>({
    queryKey: ADMIN_KEYS.segmentStats,
    queryFn: getAdminSegmentStats,
  });
}

export function useAdminSegmentRules() {
  return useQuery<SegmentRuleDto[]>({
    queryKey: ADMIN_KEYS.segmentRules,
    queryFn: getAdminSegmentRules,
  });
}

// Messages
export function useAdminMessages() {
  return useQuery({
    queryKey: ADMIN_KEYS.messages,
    queryFn: getAdminMessages,
  });
}

export function useCreateAdminMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMessageRequest) => createV2AdminMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.messages });
    },
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

// Interventions & Actions
export function useRunIntervention() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, actionId }: { userId: number; actionId: string }) =>
      runInterventionAction(userId, actionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.userDetail(variables.userId),
      });
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.opsStatus });
    },
  });
}

export function useAdjustUserWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      request,
    }: {
      userId: number;
      request: AdminWalletAdjustmentRequest;
    }) => adjustUserWallet(userId, request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.userDetail(variables.userId),
      });
    },
  });
}

// User List & Search
export function useAdminUserList(params: UserSearchParams = {}) {
  return useQuery<UserListResponse>({
    queryKey: ADMIN_KEYS.userList(params),
    queryFn: () => getAdminUserList(params),
    staleTime: 1000 * 60, // 1 min
  });
}

export function useUserActivityLogs(userId: number | null) {
  return useQuery<UserActivityLogDto[]>({
    queryKey: ADMIN_KEYS.userActivityLogs(userId || 0),
    queryFn: () => getUserActivityLogs(userId!),
    enabled: !!userId,
  });
}

export function useUserInventory(userId: number | null) {
  return useQuery<UserInventoryItemDto[]>({
    queryKey: ADMIN_KEYS.userInventory(userId || 0),
    queryFn: () => getUserInventory(userId!),
    enabled: !!userId,
  });
}

export function useUserNotes(userId: number | null) {
  return useQuery<UserNoteDto[]>({
    queryKey: ADMIN_KEYS.userNotes(userId || 0),
    queryFn: () => getUserNotes(userId!),
    enabled: !!userId,
  });
}

export function useCreateUserNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserNoteRequest) => createUserNote(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.userNotes(variables.userId),
      });
    },
  });
}

export function useUserMissionHistory(userId: number | null) {
  return useQuery<UserMissionHistoryDto[]>({
    queryKey: ADMIN_KEYS.userMissions(userId || 0),
    queryFn: () => getUserMissionHistory(userId!),
    enabled: !!userId,
  });
}

export function useForceCompleteMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, missionId }: { userId: number; missionId: number }) =>
      forceCompleteMission(userId, missionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.userMissions(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.userDetail(variables.userId),
      });
    },
  });
}

export function useUserSegment(userId: number | null) {
  return useQuery<{ segment: string; label: string }>({
    queryKey: ADMIN_KEYS.userSegment(userId || 0),
    queryFn: () => getUserSegment(userId!),
    enabled: !!userId,
  });
}

export function useUserTicketLogs(userId: number | null) {
  return useQuery<TicketLogDto[]>({
    queryKey: ADMIN_KEYS.ticketLogs(userId || 0),
    queryFn: () => getTicketLogs(userId!),
    enabled: !!userId,
  });
}

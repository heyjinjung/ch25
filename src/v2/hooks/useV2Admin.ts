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
  getAdminOpsCampaigns,
  getAdminOpsPlans,
  getDashboardMetrics,
  runInterventionAction,
  adjustUserWallet,
  adjustUserInventory,
  updateUserNickname,
  updateUserSegment,
  AdminUserDetailDto,
  AdminWithdrawalDto,
  OpsDashboardResponse,
  DashboardMetricsResponse,
  AdminWalletAdjustmentRequest,
  AdminInventoryAdjustmentRequest,
  NicknameUpdateRequest,
  SegmentUpdateRequest,
  getAdminUserList,
  UserSearchParams,
  UserListResponse,
  getUserActivityLogs,
  getUserInventory,
  getUserNotes,
  createUserNote,
  createAdminUser,
  getUserMissionHistory,
  forceCompleteMission,
  getUserSegment,
  getTicketLogs,
  UserActivityLogDto,
  UserInventoryItemDto,
  UserNoteDto,
  CreateUserNoteRequest,
  AdminUserCreateRequest,
  UserMissionHistoryDto,
  getAdminSegmentStats,
  getAdminSegmentRules,
  SegmentStatsResponse,
  SegmentRuleDto,
  TicketLogDto,
  getExchangeRates,
  updateExchangeRate,
  ExchangeRateDto,
  getAdminDeposits,
  confirmDeposit,
  getAdminProducts,
  syncAdminProducts,
  updateProductStatus,
  updateProductPrice,
  AdminDepositDto,
  AdminProductDto,
  getInterventionLogs,
  InterventionLogDto,
  createTicket,
  updateTicket,
  deleteTicket,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  TicketUpdateRequest,
  InventoryItemUpdateRequest,
  getVaultStats,
  getVaultUsers,
  getVaultTrend,
  forceEditVault,
  getWithdrawalDetails,
  createSegmentRule,
  updateSegmentRule,
  deleteSegmentRule,
  VaultStatsDto,
  UserVaultDto,
  VaultDailyTrendDto,
  WithdrawalDetailsResponse,
  AdminDepositLogDto,
  AdminDepositCreateRequest,
  AdminDepositUpdateRequest,
  getAdminDepositLogs,
  createAdminDepositLog,
  updateAdminDepositLog,
  deleteAdminDepositLog,
  getInventoryLogs,
  OpsCampaignOut,
  OpsPlanOut,
} from "../api/adminApi";
import { CreateMessageRequest } from "../api/adminApi";

// Keys
export const ADMIN_KEYS = {
  segments: ["admin", "segments"] as const,
  messages: ["admin", "messages"] as const,
  withdrawals: (status: string) => ["admin", "withdrawals", status] as const,
  userDetail: (userId: number) => ["admin", "users", userId] as const,
  opsStatus: ["admin", "ops", "status"] as const,
  opsCampaigns: (params?: { status?: string }) =>
    ["admin", "ops", "campaigns", params ?? null] as const,
  opsPlans: (params?: {
    days?: number;
    end_date?: string;
    campaign_id?: number;
  }) => ["admin", "ops", "plans", params ?? null] as const,
  userList: (params: UserSearchParams) =>
    ["admin", "users", "list", params] as const,
  userActivityLogs: (userId: number) =>
    ["admin", "users", userId, "activity-logs"] as const,
  userInventory: (userId: number) =>
    ["admin", "users", userId, "inventory"] as const,
  userNotes: (userId: number) => ["admin", "users", userId, "notes"] as const,
  userMissions: (userId: number) =>
    ["admin", "users", userId, "missions"] as const,
  userSegment: (userId: number) =>
    ["admin", "users", userId, "segment"] as const,
  ticketLogs: (userId: number) =>
    ["admin", "users", userId, "ticket-logs"] as const,
  segmentStats: ["admin", "segments", "stats"] as const,
  segmentRules: ["admin", "segments", "rules"] as const,
  exchangeRates: ["admin", "economy", "rates"] as const,
  vaultLedger: (userId: number) =>
    ["admin", "vault", "ledger", userId] as const,
};

// Ops Plan (Campaign/Plan)
export function useAdminOpsCampaigns(params?: { status?: string }) {
  return useQuery<OpsCampaignOut[]>({
    queryKey: ADMIN_KEYS.opsCampaigns(params),
    queryFn: () => getAdminOpsCampaigns(params),
  });
}

export function useAdminOpsPlans(params?: {
  days?: number;
  end_date?: string;
  campaign_id?: number;
}) {
  return useQuery<OpsPlanOut[]>({
    queryKey: ADMIN_KEYS.opsPlans(params),
    queryFn: () => getAdminOpsPlans(params),
  });
}

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

import {
  fetchVaultUserLedger,
  fetchUserGameLogs,
  VaultLedgerResponse,
  UserGameLogsResponse,
} from "../../admin/api/adminUserApi";

// ... existing imports ...

export function useVaultUserLedger(userId: number | null) {
  return useQuery<VaultLedgerResponse>({
    queryKey: userId
      ? ADMIN_KEYS.vaultLedger(userId)
      : ["admin", "vault", "ledger"],
    queryFn: () => fetchVaultUserLedger(userId as number),
    enabled: typeof userId === "number",
  });
}

export function useAdminSegmentRules() {
  return useQuery<SegmentRuleDto[]>({
    queryKey: ["admin", "segment-rules"],
    queryFn: getAdminSegmentRules,
  });
}

export function useCreateSegmentRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSegmentRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "segment-rules"] });
    },
  });
}

export function useUpdateSegmentRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SegmentRuleDto> }) =>
      updateSegmentRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "segment-rules"] });
    },
  });
}

export function useDeleteSegmentRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSegmentRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "segment-rules"] });
    },
  });
}

// CC Deposits CRUD
export function useAdminDepositLogs(search?: string) {
  return useQuery<AdminDepositLogDto[]>({
    queryKey: ["admin", "deposits", "logs", search],
    queryFn: () => getAdminDepositLogs({ search }),
  });
}

export function useCreateDepositLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminDepositCreateRequest) =>
      createAdminDepositLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "deposits", "logs"],
      });
    },
  });
}

export function useUpdateDepositLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: AdminDepositUpdateRequest;
    }) => updateAdminDepositLog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "deposits", "logs"],
      });
    },
  });
}

export function useDeleteDepositLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAdminDepositLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "deposits", "logs"],
      });
    },
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

// Tickets
export function useAdminTicketLogs(
  userId?: number,
  startDate?: string,
  endDate?: string,
  limit: number = 1000,
  options?: { enabled?: boolean },
) {
  return useQuery<TicketLogDto[]>({
    queryKey: ["admin", "ticket-logs", userId, startDate, endDate, limit],
    queryFn: () => getTicketLogs(userId, startDate, endDate, limit),
    enabled: options?.enabled !== undefined ? options.enabled : true,
  });
}

export function useAdminInventoryLogs(
  userId?: number,
  startDate?: string,
  endDate?: string,
  limit: number = 200,
  options?: { enabled?: boolean },
) {
  return useQuery<TicketLogDto[]>({
    queryKey: ["admin", "inventory-logs", userId, startDate, endDate, limit],
    queryFn: () => getInventoryLogs(userId, startDate, endDate, limit),
    enabled: options?.enabled !== undefined ? options.enabled : true,
  });
}

// Ticket & Inventory CRUD
export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ticket-logs"] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TicketUpdateRequest }) =>
      updateTicket(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ticket-logs"] });
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ticket-logs"] });
    },
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ticket-logs"] });
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: InventoryItemUpdateRequest;
    }) => updateInventoryItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ticket-logs"] });
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteInventoryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ticket-logs"] });
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

export function useDashboardMetrics(rangeHours: number = 24) {
  return useQuery<DashboardMetricsResponse>({
    queryKey: ["admin", "dashboard", "metrics", rangeHours],
    queryFn: () => getDashboardMetrics(rangeHours),
    refetchInterval: 60000,
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

export function useUpdateUserNickname() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      request,
    }: {
      userId: number;
      request: NicknameUpdateRequest;
    }) => updateUserNickname(userId, request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.userDetail(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "users", "list"],
      });
    },
  });
}

export function useUpdateUserSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      request,
    }: {
      userId: number;
      request: SegmentUpdateRequest;
    }) => updateUserSegment(userId, request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.userDetail(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "users", "list"],
      });
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.segmentStats,
      });
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
      queryClient.invalidateQueries({
        queryKey: ["admin", "ticket-logs"],
      });
    },
  });
}

export function useAdjustUserInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      request,
    }: {
      userId: number;
      request: AdminInventoryAdjustmentRequest;
    }) => adjustUserInventory(userId, request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.userInventory(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "ticket-logs"],
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

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminUserCreateRequest) => createAdminUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "users", "list"],
      });
    },
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
    mutationFn: ({
      userId,
      missionId,
    }: {
      userId: number;
      missionId: number;
    }) => forceCompleteMission(userId, missionId),
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

// Exchange Rates
export function useExchangeRates() {
  return useQuery<ExchangeRateDto[]>({
    queryKey: ADMIN_KEYS.exchangeRates,
    queryFn: getExchangeRates,
  });
}

export function useUpdateExchangeRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rate }: { id: string; rate: number }) =>
      updateExchangeRate(id, rate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.exchangeRates });
    },
  });
}

// ============================================================================
// Deposit Hooks
// ============================================================================

export function useAdminDeposits() {
  return useQuery<AdminDepositDto[]>({
    queryKey: ["admin", "deposits"], // Simplified key
    queryFn: getAdminDeposits,
    staleTime: 1000 * 60,
  });
}

export function useAdminConfirmDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmDeposit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "deposits"] });
    },
  });
}

// ============================================================================
// Shop / Product Hooks
// ============================================================================

export function useAdminProducts() {
  return useQuery<AdminProductDto[]>({
    queryKey: ["admin", "products"],
    queryFn: getAdminProducts,
    staleTime: 1000 * 60,
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

export function useSyncAdminProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => syncAdminProducts(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });
}

// ============================================================================
// Vault Control Hooks
// ============================================================================

export function useVaultStats() {
  return useQuery<VaultStatsDto>({
    queryKey: ["admin", "vault", "stats"],
    queryFn: getVaultStats,
    refetchInterval: 30000, // 30초마다 자동 새로고침
  });
}

export function useVaultUsers(
  limit: number = 50,
  offset: number = 0,
  sortBy: string = "vault_balance",
) {
  return useQuery<UserVaultDto[]>({
    queryKey: ["admin", "vault", "users", limit, offset, sortBy],
    queryFn: () => getVaultUsers(limit, offset, sortBy),
  });
}

export function useVaultTrend(days: number = 30) {
  return useQuery<VaultDailyTrendDto[]>({
    queryKey: ["admin", "vault", "trend", days],
    queryFn: () => getVaultTrend(days),
  });
}

export function useForceEditVault() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: forceEditVault,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "vault"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useWithdrawalDetails(status: string) {
  return useQuery<WithdrawalDetailsResponse>({
    queryKey: ["admin", "vault", "withdrawals", status],
    queryFn: () => getWithdrawalDetails(status),
    enabled: !!status,
  });
}

// ============================================================================
// Golden Intervention Hooks
// ============================================================================

export function useInterventionLogs(userId: number | null, limit: number = 50) {
  return useQuery<InterventionLogDto[]>({
    queryKey: ["admin", "golden", "interventions", userId, limit],
    queryFn: () => getInterventionLogs(userId!, limit),
    enabled: !!userId && userId > 0,
    refetchInterval: 10000, // 10초마다 자동 새로고침
  });
}

// ============================================================================
// User Vault History Hooks
// ============================================================================
import {
  fetchUserVaultHistory,
  VaultEarnEvent,
} from "../../admin/api/adminUserApi";

export function useAdminUserVaultHistory(userId: number | null) {
  return useQuery<VaultEarnEvent[]>({
    queryKey: ["admin", "users", userId, "vault-history"],
    queryFn: () => fetchUserVaultHistory(userId!),
    enabled: !!userId && userId > 0,
  });
}

export function useUserGameLogs(
  userId: number | null,
  gameType?: "DICE" | "ROULETTE" | "LOTTERY",
  limit: number = 50,
) {
  return useQuery<UserGameLogsResponse>({
    queryKey: ["admin", "users", userId, "game-logs", gameType, limit],
    queryFn: () => fetchUserGameLogs(userId!),
    enabled: !!userId && userId > 0,
  });
}

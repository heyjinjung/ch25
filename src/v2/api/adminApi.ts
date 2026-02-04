import { v2Client } from "./client";

// ============================================================================
// Types
// ============================================================================

export interface AdminWithdrawalDto {
  id: number;
  userId: number;
  nickname: string;
  amount: number;
  requestTime: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "APPROVED" | "REJECTED";
}

export interface AdminDepositDto {
  id: number;
  userId: number;
  nickname?: string;
  amount: number;
  depositCount?: number;
  bankOwner: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  isNew: boolean;
}

export interface AdminProductDto {
  id: number;
  sku: string;
  name: string;
  price: number;
  isVisible: boolean;
  category: string;
}

export interface CreateMessageRequest {
  title: string;
  body: string;
  targetSegment: string;
}

export interface AdminMissionDto {
  id: number;
  category: "DAILY" | "WEEKLY" | "NEW_USER" | "SPECIAL_EVENT";
  title: string;
  condition: string;
  targetValue: number;
  logicKey: string;
  actionType?: string;
  rewardType: string;
  rewardAmount: number;
  isActive: boolean;
}

export interface TicketLogDto {
  id: number;
  userId: number;
  type: "GRANT" | "REVOKE" | "USE" | "EXPIRE";
  itemType: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  timestamp: string;
  adminId?: string;
  nickname?: string;
}

export interface GrantItemRequest {
  userId: number;
  itemType: string;
  amount: number;
  reason: string;
}

export interface InterventionActionDto {
  actionId: string;
  label: string;
  type: string;
  description: string;
}

export interface InterventionPlaybookDto {
  riskLevel: string;
  suggestedActions: InterventionActionDto[];
}

export interface AdminUserDetailDto {
  id: number;
  nickname: string | null;
  telegramId: number | null;
  createdAt: string;
  totalDeposit: number;
  currentAssets: number;
  vaultBalance: number;
  ticketBalance: number;
  level: number;
  vipLevel: string;
  isActive: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskReason: string | null;
  playbook?: InterventionPlaybookDto;
}

export interface AdminUserLevelSnapshotDto {
  userId: number;
  ccId: string;
  level: number;
  xp: number;
  nextLevel?: number | null;
  nextRequiredXp?: number | null;
  updatedAt?: string | null;
}

export interface AdminUserLevelAdjustRequest {
  ccId: string;
  deltaXp: number;
  reason: string;
}

export interface AdminUserLevelSetRequest {
  ccId: string;
  level?: number;
  xp?: number;
  reason: string;
}

export interface AdminWalletAdjustmentRequest {
  amount: number;
  token_type: string;
  reason: string;
}

export interface AdminInventoryAdjustmentRequest {
  itemType: string;
  delta: number;
  note?: string;
}

export interface InterventionExecutionResponse {
  success: boolean;
  action_id: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface OpsDashboardResponse {
  system: {
    db: "OK" | "DEGRADED" | "ERROR";
    redis: "OK" | "DEGRADED" | "ERROR";
    worker: "OK" | "DEGRADED" | "ERROR";
  };
  goldenRadar: {
    highRollers: number;
    churnRisks: number;
    onlineNow: number;
    avgChurnScore?: number | null;
    radarAccuracy?: number | null;
    interventionsToday?: number | null;
    interventionSuccessRate?: number | null;
    riskUsers: OpsRiskUserDto[];
  };
  metrics: {
    todayRevenue: number;
    activeUsers24h: number;
  };
  hqStats?: OpsHQMarginStatsDto | null;
  // CSV 데이터 기반 확장 필드
  revenueStats?: RevenueStatsDto | null;
  riskUsers?: DetailedRiskUserDto[];
  opportunityUsers?: OpportunityUserDto[];
}

export interface RevenueStatsDto {
  todayRevenue: number;
  todayExpenses: number;
  netIncome: number;
  depositCount: number;
  weeklyGrowthRate: number;
  totalCharge: number;
  dataSource: "HQ_MARGIN" | "GAME_LOG";
}

export interface DetailedRiskUserDto {
  userId: number;
  nickname: string;
  riskType: "LOSS_STREAK" | "INACTIVE" | "BALANCE_DROP" | "UNKNOWN";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore: number;
  details: {
    loss_streak?: number;
    total_loss?: number;
    inactive_days?: number;
    total_margin?: number;
    balance_drop_pct?: number;
  };
  lastActivityAt?: string | null;
}

export interface OpportunityUserDto {
  userId: number;
  nickname: string;
  segment: "VIP" | "WHALE";
  totalMargin: number;
  totalCharge: number;
  lastActivityAt?: string | null;
}

export interface OpsHQMarginStatsDto {
  vipCount: number;
  whaleCount: number;
  atRiskCount: number;
  prospectiveVipCount: number;
  lastSyncAt: string | null;
}

export interface OpsRiskUserDto {
  userId: number;
  nickname: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskReason: string | null;
  churnScore: number;
}

export interface DashboardMetricValue {
  value: number;
  diff_percent: number;
}

export interface DashboardMetricsResponse {
  range_hours: number;
  generated_at: string;
  active_users: DashboardMetricValue;
  game_participation: DashboardMetricValue;
  unique_players: DashboardMetricValue;
  ticket_usage: DashboardMetricValue;
  avg_session_time_seconds: DashboardMetricValue;
}

export interface InterventionLogDto {
  id: number;
  userId: number;
  triggerId: string;
  triggerCondition: string | null;
  actionTaken: string;
  userBalanceBefore: number | null;
  sessionBalanceDelta: number | null;
  recentResults: string | null;
  cooldownExpiresAt: string | null;
  createdAt: string;
}

export interface GoldenGameEventDto {
  eventId: string;
  userId: number;
  timestamp: string;
  source: string;
  gameType: string;
  result: string;
  betAmount: number;
  payoutAmount: number;
  currentBalance: number;
  ccId?: string;
  sessionId?: string;
  gameMetadata?: Record<string, any>;
  isHistorical: boolean;
}

// User List & Search Types
export interface AdminUserListDto {
  id: number;
  cc_id: number;
  nickname: string | null;
  telegram_id: number | null;
  telegram_username: string | null;
  level: number;
  vaultBalance: number;
  status: "Active" | "Inactive" | "Suspended";
  tier: string;
  total_deposit: number;
  last_active: string;
  createdAt: string;
  segment: string | null; // NEW, COMMON, VIP, WHALE, AT_RISK
}

export interface UserSearchParams {
  search?: string; // 닉네임, CC_id, telegram_id, telegram_username
  status?: string; // Active, Inactive, Suspended
  minLevel?: number;
  maxLevel?: number;
  startDate?: string; // 가입일 시작
  endDate?: string; // 가입일 종료
  sortBy?:
    | "last_active"
    | "level"
    | "vault_balance"
    | "created_at"
    | "uid"
    | "nickname"
    | "telegram_id";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface UserListResponse {
  users: AdminUserListDto[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUserResolveResponse {
  userId: number;
  nickname: string;
  ccId: string;
}

// User Segment Types
export interface UserSegmentDto {
  name: string;
  label: string;
  count: number;
  color: string;
  bg: string;
  border: string;
  desc: string;
}

export interface SegmentRuleDto {
  id: number;
  label: string;
  rule: string;
  targetSegment: string;
  status: "Active" | "Inactive";
  description?: string;
}

export interface CreateSegmentRuleRequest {
  label: string;
  rule: string;
  targetSegment: string;
  description?: string;
}

export interface SegmentStatsResponse {
  segments: UserSegmentDto[];
  lastBatchTime: string;
}

// Segment User List Types
export interface SegmentUserDto {
  userId: number;
  nickname: string;
  segment: string;
  lastActivityAt: string | null;
  totalMargin: number;
  totalCharge: number;
  createdAt: string | null;
}

export interface SegmentUsersResponse {
  users: SegmentUserDto[];
  total: number;
  page: number;
  limit: number;
}

// User Mission History Types
export interface UserMissionHistoryDto {
  id: number;
  missionId: number;
  missionTitle: string;
  category: "DAILY" | "WEEKLY" | "NEW_USER" | "SPECIAL_EVENT";
  status: "COMPLETED" | "IN_PROGRESS" | "FAILED";
  progress: number;
  maxProgress: number;
  completedAt: string | null;
  updatedAt: string;
  rewardClaimed: boolean;
}

export interface UserMissionProgressUpdateRequest {
  currentValue: number;
}

export interface UserMissionRewardClaimResponse {
  success: boolean;
  message: string;
  rewardType?: string | null;
  rewardAmount?: number | null;
}

// User Activity Log Types
export interface UserActivityLogDto {
  id: number;
  userId: number;
  type: "GAME_PLAY" | "DEPOSIT" | "WITHDRAWAL" | "LOGIN" | "ITEM_USE";
  description: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

// User Inventory Types
export interface UserInventoryItemDto {
  id: number;
  itemType: string;
  itemName: string;
  quantity: number;
  expiresAt: string | null;
  status: "ACTIVE" | "USED" | "EXPIRED";
}

// User Notes Types
export interface UserNoteDto {
  id: number;
  userId: number;
  adminId: string;
  adminNickname: string;
  content: string;
  createdAt: string;
}

export interface CreateUserNoteRequest {
  userId: number;
  content: string;
}

export interface AdminUserCreateRequest {
  ccId: string;
  nickname?: string;
  level?: number;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  xp?: number;
  seasonLevel?: number;
  password?: string;
  userId?: number;
  telegramId?: number;
  telegramUsername?: string;
}

// UI Config Types
export interface AdminUiConfigResponse {
  readonly key: string;
  readonly value: Record<string, any> | null;
  readonly updated_at: string | null;
}

export interface AdminUiConfigUpsertRequest {
  readonly value: Record<string, any> | null;
}

// ============================================================================
// User List & Search API
// ============================================================================

export const getAdminUserList = async (
  params: UserSearchParams = {},
): Promise<UserListResponse> => {
  const response = await v2Client.get<UserListResponse>("/api/v2/admin/users", {
    params,
  });
  return response.data;
};

export const resolveAdminUserIdentifier = async (
  identifier: string,
): Promise<AdminUserResolveResponse> => {
  const response = await v2Client.get<AdminUserResolveResponse>(
    "/api/v2/admin/users/resolve",
    {
      params: { identifier },
    },
  );
  const data: any = response.data as any;
  return {
    userId: data.userId,
    nickname: data.nickname,
    ccId: data.ccId ?? data.cc_id ?? data.externalId ?? data.external_id ?? "",
  };
};

export const getUserActivityLogs = async (
  userId: number,
): Promise<UserActivityLogDto[]> => {
  const response = await v2Client.get<UserActivityLogDto[]>(
    `/api/v2/admin/users/${userId}/activity-logs`,
  );
  return response.data;
};

export const getUserInventory = async (
  userId: number,
): Promise<UserInventoryItemDto[]> => {
  const response = await v2Client.get<UserInventoryItemDto[]>(
    `/api/v2/admin/users/${userId}/inventory`,
  );
  return response.data;
};

export const getUserNotes = async (userId: number): Promise<UserNoteDto[]> => {
  const response = await v2Client.get<UserNoteDto[]>(
    `/api/v2/admin/users/${userId}/notes`,
  );
  return response.data;
};

export const createUserNote = async (
  data: CreateUserNoteRequest,
): Promise<void> => {
  await v2Client.post("/api/v2/admin/users/notes", data);
};

export const createAdminUser = async (
  data: AdminUserCreateRequest,
): Promise<AdminUserListDto> => {
  const ccId = data.ccId;
  const payload: Record<string, unknown> = {
    cc_id: ccId,
  };

  if (data.nickname !== undefined) payload.nickname = data.nickname;
  if (data.level !== undefined) payload.level = data.level;
  if (data.status !== undefined) payload.status = data.status;
  if (data.xp !== undefined) payload.xp = data.xp;
  if (data.seasonLevel !== undefined) payload.season_level = data.seasonLevel;
  if (data.password !== undefined) payload.password = data.password;
  if (data.userId !== undefined) payload.user_id = data.userId;
  if (data.telegramId !== undefined) payload.telegram_id = data.telegramId;
  if (data.telegramUsername !== undefined)
    payload.telegram_username = data.telegramUsername;

  const response = await v2Client.post<AdminUserListDto>(
    "/api/v2/admin/users",
    payload,
  );
  return response.data;
};

export const getUserMissionHistory = async (
  userId: number,
): Promise<UserMissionHistoryDto[]> => {
  const response = await v2Client.get<UserMissionHistoryDto[]>(
    `/api/v2/admin/users/${userId}/missions`,
  );
  return response.data;
};

export const forceCompleteMission = async (
  userId: number,
  missionId: number,
): Promise<void> => {
  await v2Client.post(
    `/api/v2/admin/users/${userId}/missions/${missionId}/complete`,
  );
};

export const updateUserMissionProgress = async (
  userId: number,
  missionId: number,
  payload: UserMissionProgressUpdateRequest,
): Promise<void> => {
  await v2Client.post(
    `/api/v2/admin/users/${userId}/missions/${missionId}/progress`,
    payload,
  );
};

export const resetUserMissionProgress = async (
  userId: number,
  missionId: number,
): Promise<void> => {
  await v2Client.post(
    `/api/v2/admin/users/${userId}/missions/${missionId}/reset`,
  );
};

export const claimUserMissionReward = async (
  userId: number,
  missionId: number,
): Promise<UserMissionRewardClaimResponse> => {
  const response = await v2Client.post<UserMissionRewardClaimResponse>(
    `/api/v2/admin/users/${userId}/missions/${missionId}/claim`,
  );
  return response.data;
};

export const getUserSegment = async (
  userId: number,
): Promise<{ segment: string; label: string }> => {
  const response = await v2Client.get<{ segment: string; label: string }>(
    `/api/v2/admin/users/${userId}/segment`,
  );
  return response.data;
};

// ============================================================================
// Withdrawal API
// ============================================================================

export const getAdminWithdrawals = async (
  status: string = "PENDING",
): Promise<AdminWithdrawalDto[]> => {
  const response = await v2Client.get<AdminWithdrawalDto[]>(
    "/api/v2/admin/withdrawals",
    {
      params: { status },
    },
  );
  return response.data;
};

export const approveWithdrawal = async (id: number): Promise<void> => {
  await v2Client.post(`/api/v2/admin/withdrawals/${id}/approve`);
};

export const rejectWithdrawal = async (
  id: number,
  reason: string,
): Promise<void> => {
  await v2Client.post(`/api/v2/admin/withdrawals/${id}/reject`, { reason });
};

// ============================================================================
// User Detail API
// ============================================================================

export const getAdminUserDetail = async (
  userId: number,
): Promise<AdminUserDetailDto> => {
  const response = await v2Client.get<AdminUserDetailDto>(
    `/api/v2/admin/users/${userId}`,
  );
  return response.data;
};

// ============================================================================
// User Level (Per-User)
// ============================================================================

export const getAdminUserLevel = async (
  ccId: string,
): Promise<AdminUserLevelSnapshotDto> => {
  const response = await v2Client.get<AdminUserLevelSnapshotDto>(
    "/api/v2/admin/users/level",
    { params: { cc_id: ccId } },
  );
  return response.data;
};

export const adjustAdminUserLevelXp = async (
  payload: AdminUserLevelAdjustRequest,
): Promise<AdminUserLevelSnapshotDto> => {
  const response = await v2Client.post<AdminUserLevelSnapshotDto>(
    "/api/v2/admin/users/level/adjust",
    payload,
  );
  return response.data;
};

export const setAdminUserLevel = async (
  payload: AdminUserLevelSetRequest,
): Promise<AdminUserLevelSnapshotDto> => {
  const response = await v2Client.post<AdminUserLevelSnapshotDto>(
    "/api/v2/admin/users/level/set",
    payload,
  );
  return response.data;
};

// ============================================================================
// Ops Dashboard API
// ============================================================================

export const getOpsDashboardStatus =
  async (): Promise<OpsDashboardResponse> => {
    const response = await v2Client.get<OpsDashboardResponse>(
      "/api/v2/admin/ops/status",
    );
    return response.data;
  };

export const getDashboardMetrics = async (
  rangeHours: number = 24,
): Promise<DashboardMetricsResponse> => {
  const response = await v2Client.get<DashboardMetricsResponse>(
    "/api/v2/admin/dashboard/metrics",
    { params: { range_hours: rangeHours } },
  );
  return response.data;
};

export const runInterventionAction = async (
  userId: number,
  actionId: string,
): Promise<InterventionExecutionResponse> => {
  const response = await v2Client.post<InterventionExecutionResponse>(
    `/api/v2/admin/users/${userId}/intervention/${actionId}`,
  );
  return response.data;
};

export interface NicknameUpdateRequest {
  nickname: string;
}

export interface NicknameUpdateResponse {
  success: boolean;
  userId: number;
  oldNickname: string | null;
  newNickname: string;
  message: string;
}

export const updateUserNickname = async (
  userId: number,
  request: NicknameUpdateRequest,
): Promise<NicknameUpdateResponse> => {
  const response = await v2Client.patch<NicknameUpdateResponse>(
    `/api/v2/admin/users/${userId}/nickname`,
    request,
  );
  return response.data;
};

export interface SegmentUpdateRequest {
  segment: string; // NEW, COMMON, VIP, WHALE, AT_RISK
}

export interface SegmentUpdateResponse {
  success: boolean;
  userId: number;
  oldSegment: string | null;
  newSegment: string;
  message: string;
}

export const updateUserSegment = async (
  userId: number,
  request: SegmentUpdateRequest,
): Promise<SegmentUpdateResponse> => {
  const response = await v2Client.patch<SegmentUpdateResponse>(
    `/api/v2/admin/users/${userId}/segment`,
    request,
  );
  return response.data;
};

export const adjustUserWallet = async (
  userId: number,
  request: AdminWalletAdjustmentRequest,
): Promise<InterventionExecutionResponse> => {
  const response = await v2Client.post<InterventionExecutionResponse>(
    `/api/v2/admin/users/${userId}/wallet/adjust`,
    request,
  );
  return response.data;
};

export const getInterventionLogs = async (
  userId: number,
  limit: number = 50,
): Promise<InterventionLogDto[]> => {
  const response = await v2Client.get<InterventionLogDto[]>(
    `/api/v2/admin/ops/interventions`,
    {
      params: { user_id: userId, limit },
    },
  );
  return response.data;
};

// ============================================================================
// UI Config API
// ============================================================================

export const getAdminUiConfig = async (
  key: string,
): Promise<AdminUiConfigResponse> => {
  const response = await v2Client.get<AdminUiConfigResponse>(
    `/api/v2/admin/ui-config/${encodeURIComponent(key)}`,
  );
  return response.data;
};

export const updateAdminUiConfig = async (
  key: string,
  payload: AdminUiConfigUpsertRequest,
): Promise<AdminUiConfigResponse> => {
  const response = await v2Client.put<AdminUiConfigResponse>(
    `/api/v2/admin/ui-config/${encodeURIComponent(key)}`,
    payload,
  );
  return response.data;
};

export const adjustUserInventory = async (
  userId: number,
  request: AdminInventoryAdjustmentRequest,
): Promise<{
  success: boolean;
  user_id: number;
  item_type: string;
  quantity: number;
}> => {
  const response = await v2Client.post<{
    success: boolean;
    user_id: number;
    item_type: string;
    quantity: number;
  }>(`/api/v2/admin/users/${userId}/inventory/adjust`, request);
  return response.data;
};

// Ticket & Inventory CRUD (Modular Backend)
export interface TicketCreateRequest {
  user_id: number;
  ticket_type: string;
  amount: number;
  reason: string;
}

export interface TicketUpdateRequest {
  amount: number;
  reason: string;
}

export interface InventoryItemCreateRequest {
  user_id: number;
  item_type: string;
  item_name: string;
  quantity: number;
  reason: string;
  expires_at?: string | null;
}

export interface InventoryItemUpdateRequest {
  quantity: number;
  reason: string;
  expires_at?: string | null;
}

export const createTicket = async (
  data: TicketCreateRequest,
): Promise<TicketLogDto> => {
  const response = await v2Client.post<TicketLogDto>(
    "/api/v2/admin/inventory/tickets",
    data,
  );
  return response.data;
};

export const updateTicket = async (
  id: number,
  data: TicketUpdateRequest,
): Promise<TicketLogDto> => {
  const response = await v2Client.put<TicketLogDto>(
    `/api/v2/admin/inventory/tickets/${id}`,
    data,
  );
  return response.data;
};

export const deleteTicket = async (id: number): Promise<void> => {
  await v2Client.delete(`/api/v2/admin/inventory/tickets/${id}`);
};

export const createInventoryItem = async (
  data: InventoryItemCreateRequest,
): Promise<TicketLogDto> => {
  const response = await v2Client.post<TicketLogDto>(
    "/api/v2/admin/inventory/items",
    data,
  );
  return response.data;
};

export const updateInventoryItem = async (
  id: number,
  data: InventoryItemUpdateRequest,
): Promise<TicketLogDto> => {
  const response = await v2Client.put<TicketLogDto>(
    `/api/v2/admin/inventory/items/${id}`,
    data,
  );
  return response.data;
};

export const deleteInventoryItem = async (id: number): Promise<void> => {
  await v2Client.delete(`/api/v2/admin/inventory/items/${id}`);
};

export interface WalletTransactionTypeDto {
  value: string;
  label: string;
  group?: string;
}

export const getWalletTransactionTypes = async (): Promise<
  WalletTransactionTypeDto[]
> => {
  const response = await v2Client.get<WalletTransactionTypeDto[]>(
    "/api/v2/admin/economy/transaction-types",
  );
  return response.data;
};

// ============================================================================
// Deposit API
// ============================================================================

export const getAdminDeposits = async (): Promise<AdminDepositDto[]> => {
  const response = await v2Client.get<AdminDepositDto[]>(
    "/api/v2/admin/economy/deposits/pending",
  );
  return response.data;
};

export const confirmDeposit = async (id: number): Promise<void> => {
  await v2Client.post(`/api/v2/admin/economy/deposits/${id}/confirm`);
};

export interface AdminDepositLogDto {
  id: number;
  userId: number;
  nickname: string | null;
  amount: number;
  kstDate: string;
  createdAt: string;
}

export interface AdminDepositCreateRequest {
  user_id: number;
  amount: number;
  kst_date?: string;
}

export interface AdminDepositUpdateRequest {
  amount?: number;
  kst_date?: string;
}

export const getAdminDepositLogs = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<AdminDepositLogDto[]> => {
  const response = await v2Client.get<AdminDepositLogDto[]>(
    "/api/v2/admin/economy/deposits",
    { params },
  );
  return response.data;
};

export const createAdminDepositLog = async (
  data: AdminDepositCreateRequest,
): Promise<AdminDepositLogDto> => {
  const response = await v2Client.post<AdminDepositLogDto>(
    "/api/v2/admin/economy/deposits",
    data,
  );
  return response.data;
};

export const updateAdminDepositLog = async (
  id: number,
  data: AdminDepositUpdateRequest,
): Promise<AdminDepositLogDto> => {
  const response = await v2Client.put<AdminDepositLogDto>(
    `/api/v2/admin/economy/deposits/${id}`,
    data,
  );
  return response.data;
};

export const deleteAdminDepositLog = async (id: number): Promise<void> => {
  await v2Client.delete(`/api/v2/admin/economy/deposits/${id}`);
};

// ============================================================================
// Shop API
// ============================================================================

export interface AdminProductDto {
  id: number;
  sku: string;
  name: string;
  price: number; // Legacy field (= costAmount)
  costType: string;
  costAmount: number;
  rewardType: string;
  rewardAmount: number;
  isVisible: boolean;
  category: string;
  sortOrder: number;
  dailyLimit: number | null;
  description: string | null;
}

export interface AdminProductCreateRequest {
  sku: string;
  name: string;
  cost_type?: string;
  cost_amount: number;
  reward_type: string;
  reward_amount: number;
  is_visible?: boolean;
  sort_order?: number;
  daily_limit?: number | null;
  description?: string | null;
}

export interface AdminProductUpdateRequest {
  name?: string;
  cost_type?: string;
  cost_amount?: number;
  reward_type?: string;
  reward_amount?: number;
  is_visible?: boolean;
  sort_order?: number;
  daily_limit?: number | null;
  description?: string | null;
}

export const getAdminProducts = async (): Promise<AdminProductDto[]> => {
  const response = await v2Client.get<AdminProductDto[]>(
    "/api/v2/admin/shop/products",
  );
  return response.data;
};

export const createAdminProduct = async (
  data: AdminProductCreateRequest,
): Promise<AdminProductDto> => {
  const response = await v2Client.post<AdminProductDto>(
    "/api/v2/admin/shop/products",
    data,
  );
  return response.data;
};

export const updateAdminProduct = async (
  productId: number,
  data: AdminProductUpdateRequest,
): Promise<{ success: boolean }> => {
  const response = await v2Client.put<{ success: boolean }>(
    `/api/v2/admin/shop/products/${productId}`,
    data,
  );
  return response.data;
};

export const deleteAdminProduct = async (
  productId: number,
): Promise<{ success: boolean }> => {
  const response = await v2Client.delete<{ success: boolean }>(
    `/api/v2/admin/shop/products/${productId}`,
  );
  return response.data;
};

export const updateProductStatus = async (
  id: number,
  isVisible: boolean,
): Promise<void> => {
  await v2Client.put(`/api/v2/admin/shop/products/${id}/status`, { isVisible });
};

export const updateProductPrice = async (
  id: number,
  price: number,
): Promise<void> => {
  await v2Client.put(`/api/v2/admin/shop/products/${id}/price`, { price });
};

export const syncAdminProducts = async (): Promise<AdminProductDto[]> => {
  const response = await v2Client.post<AdminProductDto[]>(
    "/api/v2/admin/shop/products/sync",
  );
  return response.data;
};

// ============================================================================
// Inventory/Ticket Logs API
// ============================================================================

export const getInventoryLogs = async (
  userId?: number,
  startDate?: string,
  endDate?: string,
  limit: number = 200,
): Promise<TicketLogDto[]> => {
  const params: Record<string, string | number> = { limit };
  if (userId !== undefined) params.user_id = userId;
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const response = await v2Client.get<TicketLogDto[]>(
    "/api/v2/admin/inventory/logs",
    { params },
  );
  return response.data;
};

// ============================================================================
// User Segment & Message API
// ============================================================================

export const runV2SegmentBatch = async (): Promise<void> => {
  await v2Client.post("/api/v2/admin/segments/batch/run");
};

export const getAdminSegmentStats = async (): Promise<SegmentStatsResponse> => {
  const response = await v2Client.get<SegmentStatsResponse>(
    "/api/v2/admin/segments/stats",
  );
  return response.data;
};

export const getSegmentUsers = async (
  segment: string,
  page: number = 1,
  limit: number = 50,
): Promise<SegmentUsersResponse> => {
  const response = await v2Client.get<SegmentUsersResponse>(
    `/api/v2/admin/segments/${segment}/users`,
    { params: { page, limit } },
  );
  return response.data;
};

export const getAdminSegmentRules = async (): Promise<SegmentRuleDto[]> => {
  const response = await v2Client.get<SegmentRuleDto[]>(
    "/api/v2/admin/segments/rules",
  );
  return response.data;
};

export const createSegmentRule = async (
  data: CreateSegmentRuleRequest,
): Promise<void> => {
  await v2Client.post("/api/v2/admin/segments/rules", data);
};

export const updateSegmentRule = async (
  id: number,
  data: Partial<SegmentRuleDto>,
): Promise<void> => {
  await v2Client.put(`/api/v2/admin/segments/rules/${id}`, data);
};

export const deleteSegmentRule = async (id: number): Promise<void> => {
  await v2Client.delete(`/api/v2/admin/segments/rules/${id}`);
};

export const createV2AdminMessage = async (
  request: CreateMessageRequest,
): Promise<void> => {
  const target_type = request.targetSegment === "ALL" ? "ALL" : "SEGMENT";
  const target_value =
    request.targetSegment === "ALL" ? null : request.targetSegment;
  const channels = ["INBOX"];
  await v2Client.post("/api/v2/admin/marketing/messages", {
    title: request.title,
    content: request.body,
    target_type,
    target_value,
    channels,
  });
};

// ============================================================================
// Game Ops API (Mission, Level)
// ============================================================================

export const getAdminMissions = async (): Promise<AdminMissionDto[]> => {
  const response = await v2Client.get<AdminMissionDto[]>(
    "/api/v2/admin/game/missions",
  );
  return response.data;
};

export const updateMission = async (
  id: number,
  data: Partial<AdminMissionDto>,
): Promise<void> => {
  await v2Client.put(`/api/v2/admin/game/missions/${id}`, data);
};

export const createAdminMission = async (
  data: Omit<AdminMissionDto, "id"> & {
    isActive?: boolean;
  },
): Promise<void> => {
  await v2Client.post("/api/v2/admin/game/missions", data);
};

export const deleteAdminMission = async (id: number): Promise<void> => {
  await v2Client.delete(`/api/v2/admin/game/missions/${id}`);
};

// Level Management
export interface AdminLevelDto {
  level: number;
  requiredXp: number;
  rewardType: string;
  rewardAmount: number;
}

export interface AdminLevelGlobalConfig {
  maxLevel: number;
  maxXp: number;
}

export const getAdminLevels = async (): Promise<AdminLevelDto[]> => {
  const response = await v2Client.get<AdminLevelDto[]>(
    "/api/v2/admin/game/levels",
  );
  return response.data;
};

export const updateAdminLevel = async (
  level: number,
  data: Partial<AdminLevelDto>,
) => {
  const response = await v2Client.put<AdminLevelDto>(
    `/api/v2/admin/game/levels/${level}`,
    data,
  );
  return response.data;
};

export const updateAdminLevelGlobalConfig = async (
  data: AdminLevelGlobalConfig,
) => {
  const response = await v2Client.put("/api/v2/admin/game/levels/config", data);
  return response.data;
};

// ============================================================================
// Team Battle Admin API
// ============================================================================

export interface AdminTeamBattleSeasonDto {
  id: number;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  rewards_schema?: Record<string, any> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminTeamBattleTeamDto {
  id: number;
  name: string;
  icon?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminTeamBattleScoreDto {
  team_id: number;
  season_id: number;
  points: number;
  updated_at?: string | null;
}

export interface AdminTeamBattleCreateSeasonRequest {
  name: string;
  starts_at: string;
  ends_at: string;
  rewards_schema?: Record<string, any> | null;
  is_active?: boolean;
}

export interface AdminTeamBattleCreateTeamRequest {
  name: string;
  icon?: string | null;
}

export interface AdminTeamBattleScoreAdjustRequest {
  team_id: number;
  season_id: number;
  delta: number;
  reason: string;
}

export interface AdminTeamBattleForceJoinRequest {
  user_id: number;
  team_id: number;
  reason?: string;
}

export interface AdminTeamBattleForceLeaveRequest {
  user_id: number;
  reason?: string;
}

export interface AdminTeamBattleMemberDto {
  user_id: number;
  team_id: number;
  role: string;
  joined_at: string | null;
  nickname?: string | null;
  cc_id?: string | null;
  contribution_points: number;
  latest_event_at: string | null;
}

export interface AdminTeamBattleMemberListDto {
  team_id: number;
  season_id: number | null;
  members: AdminTeamBattleMemberDto[];
}

export interface AdminTeamBattleContributionLogDto {
  id: number;
  team_id: number;
  user_id: number | null;
  season_id: number;
  action: string;
  delta: number;
  meta?: Record<string, any> | null;
  created_at: string | null;
  nickname?: string | null;
  cc_id?: string | null;
}

export interface AdminTeamBattleContributionLogListDto {
  team_id: number;
  user_id: number;
  season_id: number | null;
  items: AdminTeamBattleContributionLogDto[];
}

export interface AdminTeamBattleMemberJoinedAtUpdateRequest {
  joined_at: string;
  reason: string;
}

export interface AdminTeamBattleMemberContributionAdjustRequest {
  team_id: number;
  user_id: number;
  delta: number;
  reason: string;
  season_id?: number | null;
  action?: string;
}

export const getAdminTeamBattleSeasons = async (): Promise<
  AdminTeamBattleSeasonDto[]
> => {
  const response = await v2Client.get<AdminTeamBattleSeasonDto[]>(
    "/api/v2/admin/team-battle/seasons",
    {
      params: { include_inactive: true, limit: 50, offset: 0 },
    },
  );
  return response.data;
};

export const createAdminTeamBattleSeason = async (
  data: AdminTeamBattleCreateSeasonRequest,
): Promise<AdminTeamBattleSeasonDto> => {
  const response = await v2Client.post<AdminTeamBattleSeasonDto>(
    "/api/v2/admin/team-battle/seasons",
    data,
  );
  return response.data;
};

export const endAdminTeamBattleSeason = async (
  seasonId: number,
  distribute_rewards: boolean,
): Promise<void> => {
  await v2Client.post(`/api/v2/admin/team-battle/seasons/${seasonId}/end`, {
    distribute_rewards,
  });
};

export const getAdminTeamBattleTeams = async (): Promise<
  AdminTeamBattleTeamDto[]
> => {
  const response = await v2Client.get<AdminTeamBattleTeamDto[]>(
    "/api/v2/admin/team-battle/teams",
    {
      params: { include_inactive: true, limit: 100, offset: 0 },
    },
  );
  return response.data;
};

export const createAdminTeamBattleTeam = async (
  data: AdminTeamBattleCreateTeamRequest,
): Promise<AdminTeamBattleTeamDto> => {
  const response = await v2Client.post<AdminTeamBattleTeamDto>(
    "/api/v2/admin/team-battle/teams",
    data,
  );
  return response.data;
};

export const adjustAdminTeamBattleScore = async (
  data: AdminTeamBattleScoreAdjustRequest,
): Promise<AdminTeamBattleScoreDto> => {
  const response = await v2Client.post<AdminTeamBattleScoreDto>(
    "/api/v2/admin/team-battle/scores/adjust",
    data,
  );
  return response.data;
};

export const forceJoinAdminTeamBattle = async (
  data: AdminTeamBattleForceJoinRequest,
): Promise<void> => {
  await v2Client.post("/api/v2/admin/team-battle/members/force-join", data);
};

export const forceLeaveAdminTeamBattle = async (
  data: AdminTeamBattleForceLeaveRequest,
): Promise<void> => {
  await v2Client.post("/api/v2/admin/team-battle/members/force-leave", data);
};

export const getAdminTeamBattleTeamMembers = async (
  teamId: number,
  seasonId?: number | null,
): Promise<AdminTeamBattleMemberListDto> => {
  const response = await v2Client.get<AdminTeamBattleMemberListDto>(
    `/api/v2/admin/team-battle/teams/${teamId}/members`,
    { params: { season_id: seasonId ?? undefined } },
  );
  return response.data;
};

export const getAdminTeamBattleMemberContributions = async (
  teamId: number,
  userId: number,
  seasonId?: number | null,
  limit?: number,
  offset?: number,
): Promise<AdminTeamBattleContributionLogListDto> => {
  const response = await v2Client.get<AdminTeamBattleContributionLogListDto>(
    `/api/v2/admin/team-battle/teams/${teamId}/members/${userId}/contributions`,
    { params: { season_id: seasonId ?? undefined, limit, offset } },
  );
  return response.data;
};

export const updateAdminTeamBattleMemberJoinedAt = async (
  userId: number,
  data: AdminTeamBattleMemberJoinedAtUpdateRequest,
): Promise<AdminTeamBattleMemberDto> => {
  const response = await v2Client.patch<AdminTeamBattleMemberDto>(
    `/api/v2/admin/team-battle/members/${userId}/joined-at`,
    data,
  );
  return response.data;
};

export const adjustAdminTeamBattleMemberContribution = async (
  data: AdminTeamBattleMemberContributionAdjustRequest,
): Promise<{
  success: boolean;
  team_points: number;
  applied_delta: number;
  log: AdminTeamBattleContributionLogDto;
}> => {
  const response = await v2Client.post(
    "/api/v2/admin/team-battle/members/contributions/adjust",
    data,
  );
  return response.data;
};
// ============================================================================
// Inventory Ops API
// ============================================================================

export const getTicketLogs = async (
  userId?: number,
  startDate?: string,
  endDate?: string,
  limit?: number,
): Promise<TicketLogDto[]> => {
  const params: Record<string, string | number> = {};
  if (userId !== undefined) params.user_id = userId;
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (limit !== undefined) params.limit = limit;

  const response = await v2Client.get<TicketLogDto[]>(
    "/api/v2/admin/inventory/logs",
    { params },
  );
  return response.data;
};

// ============================================================================
// Exchange Rate API
// ============================================================================

export interface ExchangeRateDto {
  id: string; // e.g., "KRW_TO_POINT"
  source: string;
  target: string;
  rate: number;
  updatedAt: string;
}

export const getExchangeRates = async (): Promise<ExchangeRateDto[]> => {
  // Mock Data
  return [
    {
      id: "KRW_TO_POINT",
      source: "KRW",
      target: "POINT",
      rate: 1.0,
      updatedAt: "2024-01-01",
    },
    {
      id: "TICKET_TO_POINT",
      source: "TICKET",
      target: "POINT",
      rate: 500,
      updatedAt: "2024-01-01",
    },
  ];
};

export const updateExchangeRate = async (
  id: string,
  rate: number,
): Promise<void> => {
  await v2Client.put(`/api/admin/economy/exchange-rates/${id}`, { rate });
};

export const grantItem = async (data: GrantItemRequest): Promise<void> => {
  await v2Client.post("/api/admin/inventory/grant", data);
};

export const revokeItem = async (data: GrantItemRequest): Promise<void> => {
  await v2Client.post("/api/admin/inventory/revoke", data);
};

// ============================================================================
// Ticket & Inventory Statistics API
// ============================================================================

export interface TicketStatDto {
  ticketType: string;
  totalIssued: number;
  totalUsed: number;
  currentBalance: number;
}

export interface UserTicketDto {
  userId: number;
  nickname: string;
  telegramUsername: string | null;
  ticketType: string;
  currentBalance: number;
  totalUsed: number;
  lastUsedAt: string | null;
  rewardItems: string[];
}

export interface InventoryStatDto {
  itemType: string;
  totalIssued: number;
  totalUsed: number;
  currentBalance: number;
}

export interface UserInventoryDto {
  userId: number;
  nickname: string;
  telegramUsername: string | null;
  itemType: string;
  itemName: string;
  currentQuantity: number;
  totalUsed: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export const getTicketStats = async (): Promise<TicketStatDto[]> => {
  const response = await v2Client.get<TicketStatDto[]>(
    "/api/v2/admin/inventory/tickets/stats",
  );
  return response.data;
};

export const getUserTickets = async (params?: {
  search?: string;
  ticket_type?: string;
  page?: number;
  limit?: number;
}): Promise<UserTicketDto[]> => {
  const response = await v2Client.get<UserTicketDto[]>(
    "/api/v2/admin/inventory/tickets/users",
    { params },
  );
  return response.data;
};

export const getInventoryStats = async (): Promise<InventoryStatDto[]> => {
  const response = await v2Client.get<InventoryStatDto[]>(
    "/api/v2/admin/inventory/items/stats",
  );
  return response.data;
};

export const getUserInventoryList = async (params?: {
  search?: string;
  item_type?: string;
  page?: number;
  limit?: number;
}): Promise<UserInventoryDto[]> => {
  const response = await v2Client.get<UserInventoryDto[]>(
    "/api/v2/admin/inventory/items/users",
    { params },
  );
  return response.data;
};

// ============================================================================
// Marketing Tools API
// ============================================================================

export interface AdminMessageDto {
  id: number;
  title: string;
  content: string;
  targetSegment: string;
  messageType: "PUSH" | "INBOX" | "BOTH";
  sentCount: number;
  scheduledAt?: string;
  createdAt: string;
  status: "DRAFT" | "SCHEDULED" | "SENT";
}

export interface SendMessageRequest {
  title: string;
  content: string;
  targetSegment: string;
  scheduledAt?: string;
}

export interface SurveyDto {
  id: number;
  title: string;
  description: string;
  questions: SurveyQuestion[];
  isActive: boolean;
  responseCount: number;
  createdAt: string;
}

export interface SurveyQuestion {
  id: number;
  type: "SINGLE" | "MULTIPLE" | "TEXT";
  question: string;
  options?: string[];
}

export interface SurveyResultDto {
  surveyId: number;
  questionId: number;
  question: string;
  responses: { option: string; count: number; percentage: number }[];
}

type V2MessageResponseDto = {
  id: number;
  sender_admin_id: number;
  title: string;
  content: string;
  target_type: "ALL" | "SEGMENT" | "USER" | "TAG";
  target_value: string | null;
  channels: string[] | null;
  recipient_count: number;
  read_count: number;
  created_at: string;
};

type V2AdminSurveyDtoBackend = {
  id: number;
  title: string;
  description: string | null;
  questions: {
    id: number;
    type: "SINGLE" | "MULTIPLE" | "TEXT";
    question: string;
    options?: string[] | null;
  }[];
  is_active: boolean;
  response_count: number;
  created_at: string;
};

type V2AdminSurveyResultDtoBackend = {
  survey_id: number;
  question_id: number;
  question: string;
  responses: { option: string; count: number; percentage: number }[];
};

const mapChannelsToMessageType = (
  channels: string[] | null | undefined,
): "PUSH" | "INBOX" | "BOTH" => {
  const set = new Set((channels ?? []).map((c) => String(c).toUpperCase()));
  const hasInbox = set.has("INBOX");
  const hasPush = set.has("PUSH");
  if (hasInbox && hasPush) return "BOTH";
  if (hasPush) return "PUSH";
  return "INBOX";
};

const mapV2MessageToAdminMessageDto = (
  msg: V2MessageResponseDto,
): AdminMessageDto => {
  const targetSegment =
    msg.target_type === "ALL" ? "ALL" : (msg.target_value ?? msg.target_type);
  return {
    id: msg.id,
    title: msg.title,
    content: msg.content,
    targetSegment,
    messageType: mapChannelsToMessageType(msg.channels),
    sentCount: msg.recipient_count ?? 0,
    createdAt: msg.created_at,
    status: "SENT",
  };
};

export const getAdminMessages = async (): Promise<AdminMessageDto[]> => {
  const response = await v2Client.get<V2MessageResponseDto[]>(
    "/api/v2/admin/marketing/messages",
  );
  return (response.data ?? []).map(mapV2MessageToAdminMessageDto);
};

export const sendAdminMessage = async (
  data: SendMessageRequest,
): Promise<void> => {
  const target_type = data.targetSegment === "ALL" ? "ALL" : "SEGMENT";
  const target_value = data.targetSegment === "ALL" ? null : data.targetSegment;

  // PUSH 기능은 제거됨. 관리자 메시지는 INBOX를 사용한다.
  const channels = ["INBOX"];

  await v2Client.post("/api/v2/admin/marketing/messages", {
    title: data.title,
    content: data.content,
    target_type,
    target_value,
    channels,
  });
};

export const getSurveys = async (): Promise<SurveyDto[]> => {
  const response = await v2Client.get<V2AdminSurveyDtoBackend[]>(
    "/api/v2/admin/marketing/surveys",
  );
  return (response.data ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description ?? "",
    questions: (s.questions ?? []).map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options ?? undefined,
    })),
    isActive: Boolean(s.is_active),
    responseCount: Number(s.response_count ?? 0),
    createdAt: s.created_at,
  }));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getSurveyResults = async (
  _surveyId: number,
): Promise<SurveyResultDto[]> => {
  const response = await v2Client.get<V2AdminSurveyResultDtoBackend[]>(
    `/api/v2/admin/marketing/surveys/${_surveyId}/results`,
  );

  return (response.data ?? []).map((r) => ({
    surveyId: r.survey_id,
    questionId: r.question_id,
    question: r.question,
    responses: r.responses ?? [],
  }));
};

export const toggleSurvey = async (
  surveyId: number,
  isActive: boolean,
): Promise<void> => {
  await v2Client.put(`/api/v2/admin/marketing/surveys/${surveyId}/toggle`, {
    is_active: isActive,
  });
};

// ============================================================================
// Game Config API
// ============================================================================

export type RouletteGrade = "COMMON" | "VIP" | "WHALE" | "AT_RISK";

export interface AdminRouletteConfigDto {
  id: number;
  gameType: "ROULETTE";
  name: string;
  grade: RouletteGrade;
  ticketType: string;
  maxDailySpins: number;
  isActive: boolean;
  segments: AdminRouletteSegmentDto[];
}

export interface AdminRouletteSegmentDto {
  slotIndex: number;
  label: string;
  weight: number;
  rewardType: string;
  rewardAmount: number;
  isJackpot: boolean;
  color: string;
}

export interface AdminDiceConfigDto {
  id: number;
  gameType: "DICE";
  name: string;
  isActive: boolean;
  maxDailyPlays: number;

  // Probabilities
  winProbability: number;
  drawProbability: number;
  loseProbability: number;

  // Rewards
  winRewardType: string;
  winRewardAmount: number;
  drawRewardType: string;
  drawRewardAmount: number;
  loseRewardType: string;
  loseRewardAmount: number;

  // Daily gain cap
  dailyGainCap: number;

  // Golden Hour Multiplier Settings
  enableGoldenHour: boolean;
  goldenHourMultiplier: number;
  goldenHourStartTime: string; // HH:MM:SS format (KST)
  goldenHourEndTime: string; // HH:MM:SS format (KST)
}

export interface AdminLotteryPrizeDto {
  id: number;
  label: string;
  weight: number; // SoT: 가중치
  stock?: number; // SoT: 재고 (Optional)
  rewardType: string;
  rewardAmount: number;
  isActive: boolean; // SoT: 활성 여부
  color: string; // Frontend Only
}

export interface AdminLotteryConfigDto {
  id: number;
  name: string;
  isActive: boolean;
  maxDailyPlays: number;
  ticketType: string;
  puzzlePieceProbability: number; // SoT: 퍼즐 조각 드랍 확률 (0~100%)
  prizes: AdminLotteryPrizeDto[];
}

// Roulette API
// Backend response type
// - SoT(OpenAPI): camelCase (ticketType, maxDailySpins, isActive, slotIndex, rewardType, ...)
// - Fallback(legacy): snake_case (ticket_type, max_daily_spins, is_active, slot_index, reward_type, ...)
interface RouletteConfigBackend {
  id: number;
  name: string;
  grade: RouletteGrade;
  ticketType?: string;
  maxDailySpins?: number;
  isActive?: boolean;
  ticket_type?: string;
  max_daily_spins?: number;
  is_active?: boolean;
  segments: Array<{
    id?: number;
    slotIndex?: number;
    rewardType?: string;
    rewardAmount?: number;
    isJackpot?: boolean;
    slot_index?: number;
    label: string;
    weight: number;
    reward_type?: string;
    reward_amount?: number;
    is_jackpot?: boolean;
  }>;
}

// Color palette for segments (frontend only)
const SEGMENT_COLORS = [
  "#EF4444", // red
  "#E5E7EB", // gray
  "#10B981", // green
  "#F59E0B", // amber
  "#8B5CF6", // purple
  "#3B82F6", // blue
];

const normalizeRouletteTicketType = (raw: string): string => {
  const value = String(raw || "")
    .trim()
    .toUpperCase();
  const mapping: Record<string, string> = {
    ROULETTE_COIN: "ROULETTE_TICKET",
    GOLD_KEY: "GOLD_KEY_TICKET",
    GOLDEN_TICKET: "GOLD_KEY_TICKET", // 레거시 호환
    DIAMOND_KEY: "DIAMOND_TICKET",
    TRIAL_TOKEN: "TRIAL_TICKET",
  };
  return mapping[value] || value || "ROULETTE_TICKET";
};

export const getRouletteConfigs = async (): Promise<
  AdminRouletteConfigDto[]
> => {
  const response = await v2Client.get<RouletteConfigBackend[]>(
    "/api/v2/admin/game/roulette/configs",
  );

  return response.data.map((config) => ({
    id: config.id,
    gameType: "ROULETTE" as const,
    name: config.name,
    grade: config.grade,
    ticketType: normalizeRouletteTicketType(
      config.ticketType ?? config.ticket_type ?? "ROULETTE_TICKET",
    ),
    maxDailySpins: config.maxDailySpins ?? config.max_daily_spins ?? 0,
    isActive: config.isActive ?? config.is_active ?? false,
    segments: config.segments.map((seg) => ({
      slotIndex: seg.slotIndex ?? seg.slot_index ?? 0,
      label: seg.label,
      weight: seg.weight,
      rewardType: seg.rewardType ?? seg.reward_type ?? "NONE",
      rewardAmount: seg.rewardAmount ?? seg.reward_amount ?? 0,
      isJackpot: seg.isJackpot ?? seg.is_jackpot ?? false,
      color:
        SEGMENT_COLORS[
          (((seg.slotIndex ?? seg.slot_index ?? 0) % SEGMENT_COLORS.length) +
            SEGMENT_COLORS.length) %
            SEGMENT_COLORS.length
        ] ?? "#EF4444",
    })),
  }));
};

export const updateRouletteConfig = async (
  data: Partial<AdminRouletteConfigDto>,
): Promise<void> => {
  // Map camelCase to snake_case for backend
  const payload: any = {
    name: data.name,
    ticket_type: data.ticketType,
    max_daily_spins: data.maxDailySpins,
    is_active: data.isActive,
  };

  if (data.segments) {
    payload.segments = data.segments.map((seg) => ({
      slot_index: seg.slotIndex,
      label: seg.label,
      weight: seg.weight,
      reward_type: seg.rewardType,
      reward_amount: seg.rewardAmount,
      is_jackpot: seg.isJackpot,
    }));
  }

  await v2Client.put(`/api/v2/admin/game/roulette/config/${data.id}`, payload);
};

// Dice API
interface DiceConfigBackend {
  id: number;
  name: string;

  // Support both camelCase (v2 DTO) and snake_case (legacy) responses
  isActive?: boolean;
  is_active?: boolean;
  maxDailyPlays?: number;
  max_daily_plays?: number;

  winProbability?: number;
  win_probability?: number;
  drawProbability?: number;
  draw_probability?: number;
  loseProbability?: number;
  lose_probability?: number;

  winRewardType?: string;
  win_reward_type?: string;
  winRewardAmount?: number;
  win_reward_amount?: number;
  drawRewardType?: string;
  draw_reward_type?: string;
  drawRewardAmount?: number;
  draw_reward_amount?: number;
  loseRewardType?: string;
  lose_reward_type?: string;
  loseRewardAmount?: number;
  lose_reward_amount?: number;

  dailyGainCap?: number;
  daily_gain_cap?: number;

  enableGoldenHour?: boolean;
  enable_golden_hour?: boolean;
  goldenHourMultiplier?: number;
  golden_hour_multiplier?: number;
  goldenHourStartTime?: string;
  golden_hour_start_time?: string;
  goldenHourEndTime?: string;
  golden_hour_end_time?: string;
}

export const getDiceConfig = async (): Promise<AdminDiceConfigDto> => {
  const response = await v2Client.get<DiceConfigBackend>(
    "/api/v2/admin/game/dice/config",
  );
  const config = response.data;

  return {
    id: config.id,
    gameType: "DICE",
    name: config.name,
    isActive: config.isActive ?? config.is_active ?? false,
    maxDailyPlays: config.maxDailyPlays ?? config.max_daily_plays ?? 0,
    winProbability:
      (config.winProbability ?? config.win_probability ?? 0) * 100,
    drawProbability:
      (config.drawProbability ?? config.draw_probability ?? 0) * 100,
    loseProbability:
      (config.loseProbability ?? config.lose_probability ?? 0) * 100,
    winRewardType: config.winRewardType ?? config.win_reward_type ?? "NONE",
    winRewardAmount: config.winRewardAmount ?? config.win_reward_amount ?? 0,
    drawRewardType: config.drawRewardType ?? config.draw_reward_type ?? "NONE",
    drawRewardAmount: config.drawRewardAmount ?? config.draw_reward_amount ?? 0,
    loseRewardType: config.loseRewardType ?? config.lose_reward_type ?? "NONE",
    loseRewardAmount: config.loseRewardAmount ?? config.lose_reward_amount ?? 0,
    dailyGainCap: config.dailyGainCap ?? config.daily_gain_cap ?? 0,
    enableGoldenHour:
      config.enableGoldenHour ?? config.enable_golden_hour ?? true,
    goldenHourMultiplier:
      config.goldenHourMultiplier ?? config.golden_hour_multiplier ?? 2.0,
    goldenHourStartTime:
      config.goldenHourStartTime ?? config.golden_hour_start_time ?? "21:30:00",
    goldenHourEndTime:
      config.goldenHourEndTime ?? config.golden_hour_end_time ?? "22:30:00",
  };
};

export const updateDiceConfig = async (
  data: Partial<AdminDiceConfigDto>,
): Promise<void> => {
  const payload: Record<string, any> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.isActive !== undefined) payload.is_active = data.isActive;
  if (data.maxDailyPlays !== undefined)
    payload.max_daily_plays = data.maxDailyPlays;
  if (data.winProbability !== undefined)
    payload.win_probability = data.winProbability / 100;
  if (data.drawProbability !== undefined)
    payload.draw_probability = data.drawProbability / 100;
  if (data.loseProbability !== undefined)
    payload.lose_probability = data.loseProbability / 100;
  if (data.winRewardType !== undefined)
    payload.win_reward_type = data.winRewardType;
  if (data.winRewardAmount !== undefined)
    payload.win_reward_amount = data.winRewardAmount;
  if (data.drawRewardType !== undefined)
    payload.draw_reward_type = data.drawRewardType;
  if (data.drawRewardAmount !== undefined)
    payload.draw_reward_amount = data.drawRewardAmount;
  if (data.loseRewardType !== undefined)
    payload.lose_reward_type = data.loseRewardType;
  if (data.loseRewardAmount !== undefined)
    payload.lose_reward_amount = data.loseRewardAmount;
  if (data.dailyGainCap !== undefined)
    payload.daily_gain_cap = data.dailyGainCap;
  if (data.enableGoldenHour !== undefined)
    payload.enable_golden_hour = data.enableGoldenHour;
  if (data.goldenHourMultiplier !== undefined)
    payload.golden_hour_multiplier = data.goldenHourMultiplier;
  if (data.goldenHourStartTime !== undefined)
    payload.golden_hour_start_time = data.goldenHourStartTime;
  if (data.goldenHourEndTime !== undefined)
    payload.golden_hour_end_time = data.goldenHourEndTime;

  await v2Client.put(`/api/v2/admin/game/dice/config/${data.id}`, payload);
};

// Lottery API
// Backend response type (camelCase - Pydantic serialization_alias)
interface LotteryConfigBackend {
  id: number;
  name: string;
  isActive?: boolean;
  is_active?: boolean;
  maxDailyPlays?: number;
  max_daily_plays?: number;
  ticketType?: string;
  ticket_type?: string;
  puzzlePieceProbability?: number;
  puzzle_piece_probability?: number;
  prizes: Array<{
    id: number;
    label: string;
    weight: number;
    stock: number | null;
    rewardType?: string;
    reward_type?: string;
    rewardAmount?: number;
    reward_amount?: number;
    isActive?: boolean;
    is_active?: boolean;
  }>;
}

// Color palette for prizes (frontend only)
const PRIZE_COLORS = [
  "#FDBA74", // Orange - 1st
  "#FCD34D", // Yellow - 2nd
  "#86EFAC", // Green - 3rd
  "#A78BFA", // Purple - 4th
  "#E5E7EB", // Gray - Miss
];

export const getLotteryConfig = async (): Promise<AdminLotteryConfigDto> => {
  const response = await v2Client.get<LotteryConfigBackend[]>(
    "/api/v2/admin/game/lottery/configs",
  );

  const preferred = response.data.find(
    (item) => (item.ticketType ?? item.ticket_type) === "LOTTERY_TICKET",
  );
  const config = preferred ?? response.data[0];
  if (!config) {
    throw new Error("No lottery config found");
  }

  return {
    id: config.id,
    name: config.name,
    isActive: config.isActive ?? config.is_active ?? false,
    maxDailyPlays: config.maxDailyPlays ?? config.max_daily_plays ?? 0,
    ticketType: config.ticketType ?? config.ticket_type ?? "LOTTERY_TICKET",
    puzzlePieceProbability:
      config.puzzlePieceProbability ?? config.puzzle_piece_probability ?? 0,
    prizes: config.prizes.map((prize, index) => ({
      id: prize.id,
      label: prize.label ?? "",
      weight: prize.weight ?? 0,
      stock: prize.stock ?? undefined,
      rewardType: prize.rewardType ?? prize.reward_type ?? "NONE",
      rewardAmount: prize.rewardAmount ?? prize.reward_amount ?? 0,
      isActive: prize.isActive ?? prize.is_active ?? false,
      color: PRIZE_COLORS[index % PRIZE_COLORS.length] ?? "#FDBA74",
    })),
  };
};

export const updateLotteryConfig = async (
  data: Partial<AdminLotteryConfigDto>,
): Promise<void> => {
  const payload: Record<string, any> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.isActive !== undefined) payload.is_active = data.isActive;
  if (data.maxDailyPlays !== undefined)
    payload.max_daily_plays = data.maxDailyPlays;
  if (data.puzzlePieceProbability !== undefined)
    payload.puzzle_piece_probability = data.puzzlePieceProbability;

  await v2Client.put(`/api/v2/admin/game/lottery/config/${data.id}`, payload);
};

export const updateLotteryPrize = async (
  configId: number,
  prizeId: number,
  data: Partial<AdminLotteryPrizeDto>,
): Promise<void> => {
  // 백엔드는 이제 부분 업데이트를 지원하지만, 안전을 위해 전달된 필드만 전송
  // 단, 전체 prize 객체가 전달되는 경우 모든 필드가 포함됨
  const payload: Record<string, any> = {};

  // 필수 필드들 - undefined가 아니면 항상 포함
  if (data.label !== undefined) payload.label = data.label;
  if (data.weight !== undefined) payload.weight = data.weight;
  if (data.rewardType !== undefined) payload.reward_type = data.rewardType;
  if (data.rewardAmount !== undefined)
    payload.reward_amount = data.rewardAmount;
  if (data.isActive !== undefined) payload.is_active = data.isActive;

  // Optional 필드 - stock은 undefined일 때 null로 전송 (무제한)
  if (data.stock !== undefined) {
    payload.stock = data.stock ?? null;
  } else if ("stock" in data) {
    // 명시적으로 stock 키가 있으면 null 전송
    payload.stock = null;
  }

  await v2Client.put(
    `/api/v2/admin/game/lottery/config/${configId}/prize/${prizeId}`,
    payload,
  );
};

export const createLotteryPrize = async (
  configId: number,
  data: Partial<AdminLotteryPrizeDto>,
): Promise<AdminLotteryPrizeDto> => {
  const payload: Record<string, any> = {
    label: data.label || "New Prize",
    weight: data.weight || 0,
    stock: data.stock === undefined ? null : data.stock,
    reward_type: data.rewardType || "NONE",
    reward_amount: data.rewardAmount || 0,
    is_active: data.isActive !== undefined ? data.isActive : true,
  };
  const response = await v2Client.post<AdminLotteryPrizeDto>(
    `/api/v2/admin/game/lottery/config/${configId}/prize`,
    payload,
  );
  return response.data;
};

export const deleteLotteryPrize = async (
  configId: number,
  prizeId: number,
): Promise<void> => {
  await v2Client.delete(
    `/api/v2/admin/game/lottery/config/${configId}/prize/${prizeId}`,
  );
};

// ============================================================================
// Vault Control API
// ============================================================================

export interface VaultStatsDto {
  today_total_vault: number;
  today_withdrawal_pending: number;
  today_withdrawal_approved: number;
  today_withdrawal_rejected: number;
  total_pending_count: number;
}

export interface UserVaultDto {
  user_id: number;
  nickname: string;
  telegram_username: string | null;
  vault_balance: number;
  total_deposit: number;
  total_withdrawal: number;
  last_activity: string | null;
  tier: string;
}

export interface VaultDailyTrendDto {
  date: string;
  total_vault: number;
  deposit_count: number;
  withdrawal_count: number;
  deposit_amount: number;
  withdrawal_amount: number;
}

export interface VaultForceEditRequest {
  user_id: number;
  amount: number;
  reason: string;
}

export interface VaultLedgerItemDto {
  id: number;
  user_id: number;
  amount: number;
  balance_after: number;
  reason?: string | null;
  ref_type?: string | null;
  created_at: string;
}

export interface VaultLedgerResponseDto {
  user_id: number;
  nickname: string;
  total_in: number;
  total_out: number;
  net_change: number;
  current_balance: number;
  items: VaultLedgerItemDto[];
}

export const getVaultStats = async (): Promise<VaultStatsDto> => {
  const response = await v2Client.get<VaultStatsDto>(
    "/api/v2/admin/vault/stats",
  );
  return response.data;
};

export const getVaultUsers = async (
  limit: number = 50,
  offset: number = 0,
  sortBy: string = "vault_balance",
): Promise<UserVaultDto[]> => {
  const response = await v2Client.get<UserVaultDto[]>(
    "/api/v2/admin/vault/users",
    {
      params: { limit, offset, sort_by: sortBy },
    },
  );
  return response.data;
};

export const getVaultUserLedger = async (
  userId: number,
  limit: number = 50,
  offset: number = 0,
): Promise<VaultLedgerResponseDto> => {
  const response = await v2Client.get<VaultLedgerResponseDto>(
    `/api/v2/admin/vault/users/${userId}/ledger`,
    { params: { limit, offset } },
  );
  return response.data;
};

export const getVaultTrend = async (
  days: number = 30,
): Promise<VaultDailyTrendDto[]> => {
  const response = await v2Client.get<VaultDailyTrendDto[]>(
    "/api/v2/admin/vault/trend",
    {
      params: { days },
    },
  );
  return response.data;
};

export const forceEditVault = async (
  request: VaultForceEditRequest,
): Promise<any> => {
  const response = await v2Client.post(
    "/api/v2/admin/vault/force-edit",
    request,
  );
  return response.data;
};

export interface WithdrawalDetailDto {
  id: number;
  user_id: number;
  nickname: string;
  telegram_username: string | null;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
}

export interface WithdrawalDetailsResponse {
  status: string;
  count: number;
  total_amount: number;
  withdrawals: WithdrawalDetailDto[];
}

export const getWithdrawalDetails = async (
  status: string,
): Promise<WithdrawalDetailsResponse> => {
  const response = await v2Client.get<WithdrawalDetailsResponse>(
    `/api/v2/admin/vault/withdrawals/${status}`,
  );
  return response.data;
};

// ============================================================================
// Latency Survival API
// ============================================================================

export interface AdminLatencyEvidenceDto {
  id: number;
  userId: number;
  nickname?: string;
  txId: string;
  claimedAmount: number;
  status: "PENDING" | "PROVISIONAL" | "VERIFIED" | "REJECTED";
  rewardJson: Record<string, any>;
  adminMemo?: string;
  matchedLogId?: number;
  createdAt: string;
}

export const getAdminLatencyEvidences = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AdminLatencyEvidenceDto[]> => {
  const response = await v2Client.get<AdminLatencyEvidenceDto[]>(
    "/api/v2/admin/economy/latency-evidences",
    { params },
  );
  return response.data;
};

export const verifyLatencyEvidence = async (
  id: number,
  logId: number,
): Promise<void> => {
  await v2Client.post(`/api/v2/admin/economy/latency-evidences/${id}/verify`, {
    log_id: logId,
  });
};

export const rejectLatencyEvidence = async (
  id: number,
  reason: string,
): Promise<void> => {
  await v2Client.post(`/api/v2/admin/economy/latency-evidences/${id}/reject`, {
    reason,
  });
};

export interface UnmatchedDepositDto {
  id: number;
  user_id: number;
  amount: number;
  created_at: string | null;
  label: string | null;
}

export const getUnmatchedDeposits = async (
  hours: number = 24,
): Promise<UnmatchedDepositDto[]> => {
  const response = await v2Client.get<UnmatchedDepositDto[]>(
    "/api/v2/admin/economy/deposits/unmatched",
    { params: { hours } },
  );
  return response.data;
};

// ============================================================================
// Circuit Breaker API
// ============================================================================

export interface AdminCircuitBreakerStatusDto {
  assetType: string;
  global: {
    current: number;
    limit: number;
    isBreached: boolean;
  };
  config: {
    globalLimit: number;
    userLimit: number;
  };
}

export const getAdminCircuitBreakerStatus = async (): Promise<
  AdminCircuitBreakerStatusDto[]
> => {
  const response = await v2Client.get<AdminCircuitBreakerStatusDto[]>(
    "/api/v2/admin/economy/circuit-breaker/status",
  );
  return response.data;
};

export const resetCircuitBreaker = async (params: {
  asset_type: string;
  limit_type: "GLOBAL" | "USER";
  user_id?: number | null;
}): Promise<void> => {
  await v2Client.post("/api/v2/admin/economy/circuit-breaker/reset", params);
};

export const updateCircuitBreakerLimit = async (params: {
  asset_type: string;
  global_limit?: number;
  user_limit?: number;
}): Promise<void> => {
  await v2Client.put("/api/v2/admin/economy/circuit-breaker/limits", params);
};
// ============================================================================
// CSV Import API
// ============================================================================

export interface CSVImportValidateResponse {
  is_valid: boolean;
  error: string | null;
  filename: string;
  file_size_bytes: number;
  total_rows?: number;
  estimated_minutes?: number;
}

export interface CSVImportUploadResponse {
  file_id: string;
  file_path: string;
  message: string;
}

export interface CSVImportRequest {
  file_path: string;
  batch_size?: number;
  emit_to_redis?: boolean;
  save_to_db?: boolean;
  historical_mode?: boolean;
  skip_duplicate_check?: boolean;
  import_type?: string;
}

export interface CSVImportResult {
  job_id?: string;
  total_rows: number;
  successful_rows?: number;
  failed_rows?: number;
  skipped_rows?: number;
  duration_seconds?: number;
  // Analysis (GAME_LOG type)
  total_bet?: number;
  total_payout?: number;
  win_count?: number;
  loss_count?: number;
  jackpot_count?: number;
  unique_user_count?: number;
  // HQ_DAILY type
  processed_count?: number;
  duplicate_count?: number;
  not_found_count?: number;
  ambiguous_count?: number;
  total_amount?: number;
  unique_users?: number;
  matched_details?: Array<{
    row: number;
    nickname: string;
    amount: number;
    reason: string;
  }>;
  unmatched_details?: Array<{
    row: number;
    nickname: string;
    amount: number;
    reason: string;
  }>;
  // HQ_MARGIN type
  updated_count?: number;
  created_count?: number;
  prospective_count?: number;
  skipped_count?: number;
  success?: boolean;
  // Common
  errors?: string[];
  warnings?: string[];
}

export const validateCSVFile = async (
  file: File,
  import_type: string = "GAME_LOG",
): Promise<CSVImportValidateResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("import_type", import_type);
  const response = await v2Client.post<CSVImportValidateResponse>(
    "/api/v2/admin/csv-import/validate",
    formData,
  );
  return response.data;
};

export const uploadCSVFile = async (
  file: File,
): Promise<CSVImportUploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await v2Client.post<CSVImportUploadResponse>(
    "/api/v2/admin/csv-import/upload",
    formData,
  );
  return response.data;
};

export const startCSVImport = async (
  request: CSVImportRequest,
): Promise<CSVImportResult> => {
  const response = await v2Client.post<CSVImportResult>(
    "/api/v2/admin/csv-import/import",
    request,
  );
  return response.data;
};

export const getCSVImportEstimate = async (
  filePath: string,
): Promise<{ total_rows: number; estimated_minutes: number }> => {
  const response = await v2Client.get<{
    total_rows: number;
    estimated_minutes: number;
  }>("/api/v2/admin/csv-import/estimate", { params: { file_path: filePath } });
  return response.data;
};

// ============================================================================
// Paste Import API (클립보드 붙여넣기 Import)
// ============================================================================

export interface PasteImportRequest {
  text: string;
  import_type: "DAILY_DEPOSIT" | "GAME_LOG";
  selected_indices?: number[] | null; // 선택된 행 인덱스 (null이면 전체)
}

export type DepositStatus =
  | "MATCHED"
  | "NOT_FOUND"
  | "DUPLICATE"
  | "SKIPPED_OLD";

export interface PreviewItem {
  index: number;
  nickname?: string;
  amount?: number;
  deposit_at?: string | null;
  depositor?: string;
  cc_id?: string;
  log_type?: string;
  bet_at?: string | null;
  game_type?: string;
  status: DepositStatus;
  user_id?: number | null;
}

export interface PasteImportPreviewResponse {
  success: boolean;
  import_type: string;
  total_parsed: number;
  new_records_count: number;
  matched_count?: number;
  not_found_count?: number;
  duplicate_count?: number;
  skipped_old_count?: number;
  latest_in_db: string | null;
  preview: PreviewItem[];
}

export interface PasteImportResult {
  success: boolean;
  batch_id?: string;
  total_parsed: number;
  processed_count: number;
  skipped_old_count: number;
  duplicate_count?: number;
  not_found_count: number;
  total_amount?: number;
  unique_users?: number;
  latest_deposit_at_in_db?: string | null;
  latest_bet_at_in_db?: string | null;
  matched_details?: Array<{
    nickname: string;
    user_id: number;
    amount: number;
    deposit_at?: string | null;
  }>;
  error?: string;
}

export const previewPasteImport = async (
  request: PasteImportRequest,
): Promise<PasteImportPreviewResponse> => {
  const response = await v2Client.post<PasteImportPreviewResponse>(
    "/api/v2/admin/csv-import/paste-import/preview",
    request,
  );
  return response.data;
};

export const executePasteImport = async (
  request: PasteImportRequest,
): Promise<PasteImportResult> => {
  const response = await v2Client.post<PasteImportResult>(
    "/api/v2/admin/csv-import/paste-import",
    request,
  );
  return response.data;
};

// ============================================================================
// Admin Streak & Milestone API
// ============================================================================

export interface UserStreakAdminDto {
  user_id: number;
  streak_days: number;
  last_play_date: string | null;
  is_hot: boolean;
  is_legend: boolean;
  next_milestone: number | null;
  claimable_day: number | null;
  current_multiplier: number;
}

export interface MilestoneProgressDto {
  day: number;
  achieved: boolean;
  claimed: boolean;
  claim_date: string | null;
  rewards: { type: string; amount: number }[] | null;
}

export interface UserMilestoneProgressResponse {
  user_id: number;
  streak_days: number;
  milestones: MilestoneProgressDto[];
}

export interface SetStreakCountRequest {
  streak_days: number;
  adjust_last_play_date?: boolean;
}

export interface ForceGrantMilestoneRequest {
  milestone_day: number;
  reason: string;
}

export interface ForceGrantMilestoneResponse {
  success: boolean;
  user_id: number;
  milestone_day: number;
  grants: { type: string; amount: number }[];
  message: string;
}

export interface DistributeMilestoneRequest {
  milestone_day: number;
  user_ids?: number[] | null;
  segment?: string | null;
  reason: string;
}

export interface DistributeMilestoneResponse {
  success: boolean;
  milestone_day: number;
  total_users: number;
  success_count: number;
  failed_count: number;
  details: {
    user_id: number;
    status: string;
    grants?: { type: string; amount: number }[];
    message?: string;
  }[];
}

export const getAdminUserStreak = async (
  userId: number,
): Promise<UserStreakAdminDto> => {
  const response = await v2Client.get<UserStreakAdminDto>(
    `/api/v2/admin/streak-rewards/users/${userId}`,
  );
  return response.data;
};

export const resetAdminUserStreak = async (
  userId: number,
): Promise<{
  success: boolean;
  user_id: number;
  old_streak: number;
  new_streak: number;
}> => {
  const response = await v2Client.post<{
    success: boolean;
    user_id: number;
    old_streak: number;
    new_streak: number;
  }>(`/api/v2/admin/streak-rewards/users/${userId}/reset`);
  return response.data;
};

export const setAdminUserStreakCount = async (
  userId: number,
  payload: SetStreakCountRequest,
): Promise<{
  success: boolean;
  user_id: number;
  old_streak: number;
  new_streak: number;
}> => {
  const response = await v2Client.post<{
    success: boolean;
    user_id: number;
    old_streak: number;
    new_streak: number;
  }>(`/api/v2/admin/streak-rewards/users/${userId}/set-count`, payload);
  return response.data;
};

export const getAdminUserMilestoneProgress = async (
  userId: number,
): Promise<UserMilestoneProgressResponse> => {
  const response = await v2Client.get<UserMilestoneProgressResponse>(
    `/api/v2/admin/streak-rewards/users/${userId}/milestone-progress`,
  );
  return response.data;
};

export const forceGrantAdminMilestone = async (
  userId: number,
  payload: ForceGrantMilestoneRequest,
): Promise<ForceGrantMilestoneResponse> => {
  const response = await v2Client.post<ForceGrantMilestoneResponse>(
    `/api/v2/admin/streak-rewards/users/${userId}/force-grant-milestone`,
    payload,
  );
  return response.data;
};

export const distributeAdminMilestoneReward = async (
  payload: DistributeMilestoneRequest,
): Promise<DistributeMilestoneResponse> => {
  const response = await v2Client.post<DistributeMilestoneResponse>(
    "/api/v2/admin/streak-rewards/distribute-milestone-reward",
    payload,
  );
  return response.data;
};

// ============================================================================
// Admin Mission Stats & Validation API
// ============================================================================

export interface MissionResetRequest {
  mission_id?: number | null;
  reason: string;
}

export interface MissionResetResponse {
  user_id: number;
  reset_count: number;
  missions_reset: number[];
}

export interface LoginMissionStatusDto {
  user_id: number;
  nickname: string;
  today_login_completed: boolean;
  last_login_at: string | null;
  login_streak: number;
  reset_hour_kst: number;
  current_operational_date: string;
}

export interface LoginMissionVerifyResponse {
  total_users: number;
  completed_today: number;
  not_completed_today: number;
  completion_rate: number;
  users: LoginMissionStatusDto[];
}

export interface MissionCompletionStatsDto {
  mission_id: number;
  title: string;
  category: string;
  total_attempts: number;
  completed_count: number;
  claimed_count: number;
  completion_rate: number;
}

export interface MissionStatsResponse {
  total_missions: number;
  active_missions: number;
  stats: MissionCompletionStatsDto[];
}

export const resetAdminUserMissions = async (
  userId: number,
  payload: MissionResetRequest,
): Promise<MissionResetResponse> => {
  const response = await v2Client.post<MissionResetResponse>(
    `/api/v2/admin/game/missions/reset-user/${userId}`,
    payload,
  );
  return response.data;
};

export const verifyAdminLoginMissions = async (params?: {
  limit?: number;
  completed_only?: boolean;
}): Promise<LoginMissionVerifyResponse> => {
  const response = await v2Client.get<LoginMissionVerifyResponse>(
    "/api/v2/admin/game/missions/login-verify",
    { params },
  );
  return response.data;
};

export const getAdminMissionStats = async (): Promise<MissionStatsResponse> => {
  const response = await v2Client.get<MissionStatsResponse>(
    "/api/v2/admin/game/missions/stats",
  );
  return response.data;
};

// ============================================================================
// Admin Active User Stats API
// ============================================================================

export interface ActiveUserStatsDto {
  dau: number;
  wau: number;
  mau: number;
  dau_change: number;
  wau_change: number;
  new_users_today: number;
  new_users_this_week: number;
  avg_session_count: number;
}

export interface ActiveUserTrendDto {
  date: string;
  dau: number;
  new_users: number;
}

export interface ActiveUserStatsResponse {
  stats: ActiveUserStatsDto;
  trend: ActiveUserTrendDto[];
}

export const getAdminActiveUserStats = async (
  days: number = 7,
): Promise<ActiveUserStatsResponse> => {
  const response = await v2Client.get<ActiveUserStatsResponse>(
    "/api/v2/admin/ops/active-users",
    { params: { days } },
  );
  return response.data;
};

// ============================================================================
// Admin Daily Finance API (일간 수익/지출)
// ============================================================================

export interface DailyRevenueStatsDto {
  date: string;
  total_deposits: number;
  deposit_count: number;
  unique_depositors: number;
}

export interface DailySpendingStatsDto {
  date: string;
  total_withdrawals: number;
  withdrawal_count: number;
  pending_withdrawals: number;
}

export interface DailyFinanceResponse {
  date: string;
  revenue: DailyRevenueStatsDto;
  spending: DailySpendingStatsDto;
  net_income: number;
}

export const getAdminDailyRevenue = async (
  targetDate?: string,
): Promise<DailyRevenueStatsDto> => {
  const response = await v2Client.get<DailyRevenueStatsDto>(
    "/api/v2/admin/ops/daily-revenue",
    { params: targetDate ? { target_date: targetDate } : undefined },
  );
  return response.data;
};

export const getAdminDailySpending = async (
  targetDate?: string,
): Promise<DailySpendingStatsDto> => {
  const response = await v2Client.get<DailySpendingStatsDto>(
    "/api/v2/admin/ops/daily-spending",
    { params: targetDate ? { target_date: targetDate } : undefined },
  );
  return response.data;
};

export const getAdminDailyFinance = async (
  targetDate?: string,
): Promise<DailyFinanceResponse> => {
  const response = await v2Client.get<DailyFinanceResponse>(
    "/api/v2/admin/ops/daily-finance",
    { params: targetDate ? { target_date: targetDate } : undefined },
  );
  return response.data;
};

// ============================================================================
// Admin Audit Logs API (감사 로그)
// ============================================================================

export interface AuditLogDto {
  id: number;
  admin_id: number;
  action: string;
  category: string;
  target_id: string | null;
  before_data: Record<string, any> | null;
  after_data: Record<string, any> | null;
  created_at: string;
}

export interface AuditLogResponse {
  total: number;
  logs: AuditLogDto[];
}

export const getAdminAuditLogs = async (params?: {
  action_filter?: string;
  category_filter?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLogResponse> => {
  const response = await v2Client.get<AuditLogResponse>(
    "/api/v2/admin/ops/audit-logs",
    { params },
  );
  return response.data;
};

export const logAdminAction = async (params: {
  action: string;
  category?: string;
  target_id?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; action: string }> => {
  const response = await v2Client.post<{ success: boolean; action: string }>(
    "/api/v2/admin/ops/log-action",
    params.metadata,
    {
      params: {
        action: params.action,
        category: params.category ?? "GOLDEN",
        target_id: params.target_id,
      },
    },
  );
  return response.data;
};

// ============================================================================
// Admin Vault Aggregate & Spend Limits API (금고 집계 및 지출 한도)
// ============================================================================

export interface VaultAggregateDto {
  total_users: number;
  total_locked_balance: number;
  total_available_balance: number;
  suspended_users_count: number;
  suspended_users_balance: number;
  average_balance: number;
  median_balance: number;
  max_balance: number;
}

export interface VaultSpendLimitDto {
  user_id: number;
  nickname: string;
  daily_spent: number;
  daily_limit: number;
  usage_rate: number;
  is_limit_reached: boolean;
  reset_date: string | null;
}

export interface VaultSpendLimitSummaryDto {
  total_users: number;
  users_at_limit: number;
  users_above_80_percent: number;
  total_daily_spent: number;
  average_usage_rate: number;
}

export const getAdminVaultAggregate = async (): Promise<VaultAggregateDto> => {
  const response = await v2Client.get<VaultAggregateDto>(
    "/api/v2/admin/vault/aggregate",
  );
  return response.data;
};

export const getAdminVaultSpendLimits = async (params?: {
  min_usage_rate?: number;
  limit?: number;
}): Promise<VaultSpendLimitDto[]> => {
  const response = await v2Client.get<VaultSpendLimitDto[]>(
    "/api/v2/admin/vault/spend-limits",
    { params },
  );
  return response.data;
};

export const getAdminVaultSpendLimitSummary =
  async (): Promise<VaultSpendLimitSummaryDto> => {
    const response = await v2Client.get<VaultSpendLimitSummaryDto>(
      "/api/v2/admin/vault/spend-limits/summary",
    );
    return response.data;
  };

// ============================================================================
// Admin Analytics API (보유율/수익/마케팅)
// ============================================================================

export interface RetentionRateDto {
  cohort_date: string;
  total_users: number;
  d1_retained: number;
  d1_rate: number;
  d7_retained: number;
  d7_rate: number;
  d30_retained: number;
  d30_rate: number;
}

export interface RetentionSummaryDto {
  period_start: string;
  period_end: string;
  total_cohort_users: number;
  avg_d1_rate: number;
  avg_d7_rate: number;
  avg_d30_rate: number;
}

export interface RetentionAnalysisResponse {
  summary: RetentionSummaryDto;
  daily_retention: RetentionRateDto[];
}

export interface RetentionTrendDto {
  date: string;
  d1_rate: number;
  d7_rate: number;
  d30_rate: number;
  new_users: number;
}

export interface RetentionTrendResponse {
  trend: RetentionTrendDto[];
  period_start: string;
  period_end: string;
}

export interface DailyRevenueDto {
  date: string;
  total_deposits: number;
  total_withdrawals: number;
  net_revenue: number;
  deposit_count: number;
  withdrawal_count: number;
  active_depositors: number;
}

export interface RevenueBreakdownDto {
  period: string;
  start_date: string;
  end_date: string;
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  avg_daily_revenue: number;
  avg_daily_expenses: number;
  data: DailyRevenueDto[];
}

export interface RevenueSummaryDto {
  today_revenue: number;
  today_expenses: number;
  this_week_revenue: number;
  this_week_expenses: number;
  this_month_revenue: number;
  this_month_expenses: number;
  revenue_growth_rate: number;
}

export interface ChannelPerformanceDto {
  channel: string;
  new_users: number;
  active_users: number;
  total_deposits: number;
  avg_deposit_per_user: number;
  conversion_rate: number;
  cac: number;
  ltv: number;
  roi: number;
}

export interface MarketingEfficiencyResponse {
  period_start: string;
  period_end: string;
  channels: ChannelPerformanceDto[];
  total_new_users: number;
  total_marketing_cost: number;
  overall_cac: number;
  overall_roi: number;
}

export const getAdminRetentionAnalysis = async (params?: {
  start_date?: string;
  end_date?: string;
}): Promise<RetentionAnalysisResponse> => {
  const response = await v2Client.get<RetentionAnalysisResponse>(
    "/api/v2/admin/analytics/retention",
    { params },
  );
  return response.data;
};

export const getAdminRetentionTrend = async (
  days: number = 30,
): Promise<RetentionTrendResponse> => {
  const response = await v2Client.get<RetentionTrendResponse>(
    "/api/v2/admin/analytics/retention/trend",
    { params: { days } },
  );
  return response.data;
};

export const getAdminRevenueBreakdown = async (params?: {
  period?: "daily" | "weekly" | "monthly";
  start_date?: string;
  end_date?: string;
}): Promise<RevenueBreakdownDto> => {
  const response = await v2Client.get<RevenueBreakdownDto>(
    "/api/v2/admin/analytics/revenue/breakdown",
    { params },
  );
  return response.data;
};

export const getAdminRevenueSummary = async (): Promise<RevenueSummaryDto> => {
  const response = await v2Client.get<RevenueSummaryDto>(
    "/api/v2/admin/analytics/revenue/summary",
  );
  return response.data;
};

export const getAdminMarketingChannelPerformance = async (params?: {
  start_date?: string;
  end_date?: string;
}): Promise<MarketingEfficiencyResponse> => {
  const response = await v2Client.get<MarketingEfficiencyResponse>(
    "/api/v2/admin/analytics/marketing/channel-performance",
    { params },
  );
  return response.data;
};

// ============================================================================
// Admin Inventory Stock API (재고 관리)
// ============================================================================

export interface StockAdjustRequest {
  user_id: number;
  item_type: string;
  delta: number;
  reason: string;
}

export interface StockAdjustResponse {
  success: boolean;
  user_id: number;
  item_type: string;
  old_quantity: number;
  new_quantity: number;
  delta: number;
  message: string;
}

export interface GifticonDeliveryDto {
  id: number;
  user_id: number;
  nickname: string;
  item_type: string;
  item_name: string;
  status: "PENDING" | "DELIVERED" | "FAILED";
  created_at: string;
  delivered_at: string | null;
  delivery_code: string | null;
  error_message: string | null;
}

export interface GifticonDeliveryListResponse {
  total: number;
  pending: number;
  delivered: number;
  failed: number;
  items: GifticonDeliveryDto[];
}

export interface StockAlertDto {
  item_type: string;
  current_stock: number;
  threshold: number;
  is_critical: boolean;
  last_updated: string | null;
}

export interface StockAlertListResponse {
  total_alerts: number;
  critical_count: number;
  alerts: StockAlertDto[];
}

export const adjustAdminStock = async (
  payload: StockAdjustRequest,
): Promise<StockAdjustResponse> => {
  const response = await v2Client.post<StockAdjustResponse>(
    "/api/v2/admin/inventory/adjust-stock",
    payload,
  );
  return response.data;
};

export const getAdminGifticonDeliveries = async (params?: {
  status?: "PENDING" | "DELIVERED" | "FAILED";
  user_id?: number;
  limit?: number;
}): Promise<GifticonDeliveryListResponse> => {
  const response = await v2Client.get<GifticonDeliveryListResponse>(
    "/api/v2/admin/inventory/gifticon/deliveries",
    { params },
  );
  return response.data;
};

export const getAdminStockAlerts = async (
  threshold: number = 10,
): Promise<StockAlertListResponse> => {
  const response = await v2Client.get<StockAlertListResponse>(
    "/api/v2/admin/inventory/stock-alerts",
    { params: { threshold } },
  );
  return response.data;
};

// ─────────────────────────────────────────────────────────────────
// 게임 로그 조회 API (다이스/룰렛/복권)
// ─────────────────────────────────────────────────────────────────

export interface GameLogItemDto {
  id: number;
  game_type: "DICE" | "ROULETTE" | "LOTTERY";
  result: string | null;
  reward_type: string | null;
  reward_amount: number | null;
  vault_earn: number | null;
  created_at: string;
}

export interface UserGameLogsResponse {
  user_id: number;
  total_count: number;
  logs: GameLogItemDto[];
}

export const getUserGameLogs = async (
  userId: number,
  gameType?: "DICE" | "ROULETTE" | "LOTTERY",
  limit: number = 50,
): Promise<UserGameLogsResponse> => {
  const response = await v2Client.get<UserGameLogsResponse>(
    `/api/v2/admin/users/${userId}/game-logs`,
    { params: { game_type: gameType, limit } },
  );
  return response.data;
};

// ============================================================================
// ROI Analysis API
// ============================================================================

export interface RoiCampaignDto {
  event_type: string;
  user_count: number;
  avg_roi: number;
  total_cost: number;
  total_return: number;
}

export const getAdminMarketingCampaignPerformance = async (params?: {
  start_date?: string;
  end_date?: string;
  limit?: number;
}): Promise<RoiCampaignDto[]> => {
  const response = await v2Client.get<RoiCampaignDto[]>(
    "/api/v2/admin/analytics/marketing/campaign-performance",
    { params },
  );
  return response.data;
};

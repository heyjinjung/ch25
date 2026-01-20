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
    riskUsers: OpsRiskUserDto[];
  };
  metrics: {
    todayRevenue: number;
    activeUsers24h: number;
  };
}

export interface OpsRiskUserDto {
  userId: number;
  nickname: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskReason: string | null;
  churnScore: number;
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
}

export interface UserSearchParams {
  search?: string; // 닉네임, CC_id, telegram_id, telegram_username
  status?: string; // Active, Inactive, Suspended
  minLevel?: number;
  maxLevel?: number;
  startDate?: string; // 가입일 시작
  endDate?: string; // 가입일 종료
  sortBy?: "last_active" | "level" | "vault_balance" | "created_at";
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
  await v2Client.post(`/api/v2/admin/withdrawals/${id}/approve`); // Note: Assuming approved endpoint structure
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
// Ops Dashboard API
// ============================================================================

export const getOpsDashboardStatus =
  async (): Promise<OpsDashboardResponse> => {
    const response = await v2Client.get<OpsDashboardResponse>(
      "/api/v2/admin/ops/status",
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
  await v2Client.post(`/admin/api/economy/deposits/${id}/confirm`);
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
  const response = await v2Client.post<AdminProductDto>("/api/v2/admin/shop/products", data);
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
  await v2Client.post("/api/v2/admin/messages", request);
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
// Inventory Ops API
// ============================================================================

const toKstIso = (dateStr: string, isEnd: boolean) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const end = isEnd
    ? { h: 23, min: 59, s: 59, ms: 999 }
    : { h: 0, min: 0, s: 0, ms: 0 };
  const kst = new Date(
    Date.UTC(y, m - 1, d, end.h, end.min, end.s, end.ms) - 9 * 60 * 60 * 1000,
  );
  return kst.toISOString();
};

export const getTicketLogs = async (
  userId?: number,
  startDate?: string,
  endDate?: string,
  limit?: number,
): Promise<TicketLogDto[]> => {
  const params: any = {};
  if (userId) params.userId = userId;
  if (startDate) params.startDate = toKstIso(startDate, false);
  if (endDate) params.endDate = toKstIso(endDate, true);
  if (limit) params.limit = limit;

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
  await v2Client.put(`/admin/api/economy/exchange-rates/${id}`, { rate });
};

export const grantItem = async (data: GrantItemRequest): Promise<void> => {
  await v2Client.post("/api/v2/admin/inventory/grant", data);
};

export const revokeItem = async (data: GrantItemRequest): Promise<void> => {
  await v2Client.post("/api/v2/admin/inventory/revoke", data);
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

  // PUSH 기능은 제거됨: 관리자 메시지는 INBOX만 사용한다.
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
}

export interface AdminLotteryPrizeDto {
  id: number;
  label: string;
  weight: number; // SoT: 가중치
  stock?: number; // SoT: 재고 (Optional)
  rewardType: string;
  rewardAmount: number;
  isActive: boolean; // SoT: 활성화 여부
  color: string; // Frontend Only
}

export interface AdminLotteryConfigDto {
  id: number;
  name: string;
  isActive: boolean;
  maxDailyPlays: number;
  puzzlePieceProbability: number; // SoT: 퍼즐 조각 드랍 확률 (0~100%)
  prizes: AdminLotteryPrizeDto[];
}

// Roulette API
// Backend response type (snake_case)
interface RouletteConfigBackend {
  id: number;
  name: string;
  grade: RouletteGrade;
  ticket_type: string;
  max_daily_spins: number;
  is_active: boolean;
  segments: Array<{
    id?: number;
    slot_index: number;
    label: string;
    weight: number;
    reward_type: string;
    reward_amount: number;
    is_jackpot: boolean;
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
    ticketType: config.ticket_type,
    maxDailySpins: config.max_daily_spins,
    isActive: config.is_active,
    segments: config.segments.map((seg) => ({
      slotIndex: seg.slot_index,
      label: seg.label,
      weight: seg.weight,
      rewardType: seg.reward_type,
      rewardAmount: seg.reward_amount,
      isJackpot: seg.is_jackpot,
      color: SEGMENT_COLORS[seg.slot_index % SEGMENT_COLORS.length],
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
  is_active: boolean;
  max_daily_plays: number;
  win_probability: number;
  draw_probability: number;
  lose_probability: number;
  win_reward_type: string;
  win_reward_amount: number;
  draw_reward_type: string;
  draw_reward_amount: number;
  lose_reward_type: string;
  lose_reward_amount: number;
  daily_gain_cap: number;
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
    isActive: config.is_active,
    maxDailyPlays: config.max_daily_plays,
    winProbability: config.win_probability,
    drawProbability: config.draw_probability,
    loseProbability: config.lose_probability,
    winRewardType: config.win_reward_type,
    winRewardAmount: config.win_reward_amount,
    drawRewardType: config.draw_reward_type,
    drawRewardAmount: config.draw_reward_amount,
    loseRewardType: config.lose_reward_type,
    loseRewardAmount: config.lose_reward_amount,
    dailyGainCap: config.daily_gain_cap,
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
    payload.win_probability = data.winProbability;
  if (data.drawProbability !== undefined)
    payload.draw_probability = data.drawProbability;
  if (data.loseProbability !== undefined)
    payload.lose_probability = data.loseProbability;
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

  await v2Client.put(`/api/v2/admin/game/dice/config/${data.id}`, payload);
};

// Lottery API
// Backend response type (snake_case)
interface LotteryConfigBackend {
  id: number;
  name: string;
  is_active: boolean;
  max_daily_plays: number;
  puzzle_piece_probability: number;
  prizes: Array<{
    id: number;
    label: string;
    weight: number;
    stock: number | null;
    reward_type: string;
    reward_amount: number;
    is_active: boolean;
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

  // Get first config (usually only one)
  const config = response.data[0];
  if (!config) {
    throw new Error("No lottery config found");
  }

  return {
    id: config.id,
    name: config.name,
    isActive: config.is_active,
    maxDailyPlays: config.max_daily_plays,
    puzzlePieceProbability: config.puzzle_piece_probability,
    prizes: config.prizes.map((prize, index) => ({
      id: prize.id,
      label: prize.label,
      weight: prize.weight,
      stock: prize.stock ?? undefined,
      rewardType: prize.reward_type,
      rewardAmount: prize.reward_amount,
      isActive: prize.is_active,
      color: PRIZE_COLORS[index % PRIZE_COLORS.length],
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
  const payload: Record<string, any> = {};

  if (data.label !== undefined) payload.label = data.label;
  if (data.weight !== undefined) payload.weight = data.weight;
  if (data.stock !== undefined) payload.stock = data.stock ?? null;
  if (data.rewardType !== undefined) payload.reward_type = data.rewardType;
  if (data.rewardAmount !== undefined)
    payload.reward_amount = data.rewardAmount;
  if (data.isActive !== undefined) payload.is_active = data.isActive;

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



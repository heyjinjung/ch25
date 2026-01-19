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
  amount: number;
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
  rewardType: "TICKET" | "POINT" | "BUNDLE";
  rewardAmount: number;
  isActive: boolean;
}

export interface AdminLevelDto {
  level: number;
  requiredXp: number;
  rewardTicket: number;
  rewardPoint: number;
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
}

export interface GrantItemRequest {
  userId: number;
  itemType: string;
  amount: number;
  reason: string;
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
  };
  metrics: {
    todayRevenue: number;
    activeUsers24h: number;
  };
}

// ============================================================================
// Withdrawal API
// ============================================================================

export const getAdminWithdrawals = async (status: string = "PENDING"): Promise<AdminWithdrawalDto[]> => {
  const response = await v2Client.get<AdminWithdrawalDto[]>("/api/v2/admin/withdrawals", {
    params: { status }
  });
  return response.data;
};

export const approveWithdrawal = async (id: number): Promise<void> => {
   await v2Client.post(`/api/v2/admin/withdrawals/${id}/approve`); // Note: Assuming approved endpoint structure
};

export const rejectWithdrawal = async (id: number, reason: string): Promise<void> => {
   await v2Client.post(`/api/v2/admin/withdrawals/${id}/reject`, { reason });
};

// ============================================================================
// User Detail API
// ============================================================================

export const getAdminUserDetail = async (userId: number): Promise<AdminUserDetailDto> => {
  const response = await v2Client.get<AdminUserDetailDto>(`/api/v2/admin/users/${userId}`);
  return response.data;
};

// ============================================================================
// Ops Dashboard API
// ============================================================================

export const getOpsDashboardStatus = async (): Promise<OpsDashboardResponse> => {
  const response = await v2Client.get<OpsDashboardResponse>("/api/v2/admin/ops/status");
  return response.data;
};

// ============================================================================
// Deposit API
// ============================================================================

export const getAdminDeposits = async (): Promise<AdminDepositDto[]> => {
    // TODO: Replace with actual endpoint
    // const response = await v2Client.get<AdminDepositDto[]>("/admin/api/economy/deposits/pending");
    // return response.data;

    return [
        { id: 201, userId: 1042, amount: 300000, bankOwner: "김철수", status: "PENDING", requestedAt: "10 min ago", isNew: true },
        { id: 202, userId: 1001, amount: 1000000, bankOwner: "이영희", status: "PENDING", requestedAt: "30 min ago", isNew: false },
        { id: 203, userId: 999, amount: 50000, bankOwner: "박민수", status: "APPROVED", requestedAt: "2 hours ago", isNew: false },
    ];
};

export const confirmDeposit = async (id: number): Promise<void> => {
    await v2Client.post(`/admin/api/economy/deposits/${id}/confirm`);
};

// ============================================================================
// Shop API
// ============================================================================

export const getAdminProducts = async (): Promise<AdminProductDto[]> => {
    // TODO: Replace with actual endpoint
    // const response = await v2Client.get<AdminProductDto[]>("/admin/api/shop/products");
    // return response.data;

    return [
        { id: 1, sku: "TICKET_10", name: "Premium Ticket Pack", price: 10000, isVisible: true, category: "TICKET" },
        { id: 2, sku: "GOLD_KEY", name: "Golden Key", price: 50000, isVisible: false, category: "KEY" },
    ];
};

export const updateProductStatus = async (id: number, isVisible: boolean): Promise<void> => {
    await v2Client.put(`/admin/api/shop/products/${id}/status`, { isVisible });
};

export const updateProductPrice = async (id: number, price: number): Promise<void> => {
    await v2Client.put(`/admin/api/shop/products/${id}/price`, { price });
};

// ============================================================================
// User Segment & Message API
// ============================================================================

export const runV2SegmentBatch = async (): Promise<void> => {
    await v2Client.post("/admin/api/segments/batch/run");
};

export const createV2AdminMessage = async (request: CreateMessageRequest): Promise<void> => {
    await v2Client.post("/admin/api/messages", request);
};

// ============================================================================
// Game Ops API (Mission, Level)
// ============================================================================

export const getAdminMissions = async (): Promise<AdminMissionDto[]> => {
    // Mock Data
    return [
        { id: 1, category: "DAILY", title: "출석체크", condition: "로그인 1회", rewardType: "TICKET", rewardAmount: 1, isActive: true },
        { id: 2, category: "DAILY", title: "룰렛 돌리기", condition: "룰렛 3회 참여", rewardType: "POINT", rewardAmount: 100, isActive: true },
        { id: 3, category: "NEW_USER", title: "첫 입금", condition: "1만원 이상 충전", rewardType: "BUNDLE", rewardAmount: 1, isActive: true },
    ];
};

export const updateMission = async (id: number, data: Partial<AdminMissionDto>): Promise<void> => {
    await v2Client.put(`/admin/api/game/missions/${id}`, data);
};

export const getAdminLevels = async (): Promise<AdminLevelDto[]> => {
    // Mock Data
    const levels = [];
    for(let i=1; i<=20; i++) {
        levels.push({
            level: i,
            requiredXp: i * 1000,
            rewardTicket: Math.floor(i / 5) + 1,
            rewardPoint: i * 500
        });
    }
    return levels;
};

export const updateLevelConfig = async (level: number, data: Partial<AdminLevelDto>): Promise<void> => {
    await v2Client.put(`/admin/api/game/levels/${level}`, data);
};

// ============================================================================
// Inventory Ops API
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getTicketLogs = async (_userId?: number): Promise<TicketLogDto[]> => {
    // Mock Data
    return [
        { id: 501, userId: 1001, type: "USE", itemType: "L_TICKET", amount: 1, balanceAfter: 4, reason: "룰렛 참여", timestamp: "2024-01-19 14:30:00" },
        { id: 502, userId: 1001, type: "GRANT", itemType: "L_TICKET", amount: 5, balanceAfter: 5, reason: "이벤트 보상", timestamp: "2024-01-19 14:00:00", adminId: "admin" },
        { id: 503, userId: 1042, type: "REVOKE", itemType: "G_TICKET", amount: 1, balanceAfter: 0, reason: "오지급 회수", timestamp: "2024-01-19 13:00:00", adminId: "admin" },
    ];
};

export const grantItem = async (data: GrantItemRequest): Promise<void> => {
    await v2Client.post("/admin/api/inventory/grant", data);
};

export const revokeItem = async (data: GrantItemRequest): Promise<void> => {
    await v2Client.post("/admin/api/inventory/revoke", data);
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
    messageType: "PUSH" | "INBOX" | "BOTH";
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

export const getAdminMessages = async (): Promise<AdminMessageDto[]> => {
    // Mock Data
    return [
        {
            id: 1,
            title: "신규 이벤트 안내",
            content: "골든 타임 2배 보상 이벤트가 시작됩니다!",
            targetSegment: "ALL",
            messageType: "BOTH",
            sentCount: 1240,
            createdAt: "2024-01-19 10:00:00",
            status: "SENT"
        },
        {
            id: 2,
            title: "휴면 유저 복귀 혜택",
            content: "7일 이상 미접속 유저 대상 특별 보상",
            targetSegment: "DORMANT",
            messageType: "PUSH",
            sentCount: 320,
            scheduledAt: "2024-01-20 09:00:00",
            createdAt: "2024-01-19 14:00:00",
            status: "SCHEDULED"
        }
    ];
};

export const sendAdminMessage = async (data: SendMessageRequest): Promise<void> => {
    await v2Client.post("/admin/api/marketing/messages", data);
};

export const getSurveys = async (): Promise<SurveyDto[]> => {
    // Mock Data
    return [
        {
            id: 1,
            title: "게임 만족도 조사",
            description: "서비스 개선을 위한 유저 설문",
            questions: [
                { id: 1, type: "SINGLE", question: "전반적인 만족도는?", options: ["매우 만족", "만족", "보통", "불만족"] },
                { id: 2, type: "MULTIPLE", question: "선호하는 게임은? (복수 선택)", options: ["룰렛", "주사위", "복권"] }
            ],
            isActive: true,
            responseCount: 450,
            createdAt: "2024-01-15 10:00:00"
        }
    ];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getSurveyResults = async (_surveyId: number): Promise<SurveyResultDto[]> => {
    // Mock Data
    return [
        {
            surveyId: 1,
            questionId: 1,
            question: "전반적인 만족도는?",
            responses: [
                { option: "매우 만족", count: 180, percentage: 40 },
                { option: "만족", count: 135, percentage: 30 },
                { option: "보통", count: 90, percentage: 20 },
                { option: "불만족", count: 45, percentage: 10 }
            ]
        }
    ];
};

export const toggleSurvey = async (surveyId: number, isActive: boolean): Promise<void> => {
    await v2Client.put(`/admin/api/marketing/surveys/${surveyId}`, { isActive });
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
    
    // Win/Draw/Lose Rewards
    winRewardType: string;
    winRewardAmount: number;
    drawRewardType: string;
    drawRewardAmount: number;
    loseRewardType: string;
    loseRewardAmount: number;
}


export interface AdminLotteryPrizeDto {
    id: number;
    label: string;
    weight: number;      // SoT: 가중치
    stock?: number;      // SoT: 재고 (Optional)
    rewardType: string;
    rewardAmount: number;
    isActive: boolean;   // SoT: 활성화 여부
    color: string;       // Frontend Only
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
export const getRouletteConfigs = async (): Promise<AdminRouletteConfigDto[]> => {
    const createMockConfig = (grade: RouletteGrade, id: number, ticket: string): AdminRouletteConfigDto => ({
        id,
        gameType: "ROULETTE",
        name: `${grade} Roulette`,
        grade,
        ticketType: ticket,
        maxDailySpins: grade === "VIP" ? 10 : grade === "WHALE" ? 999 : 3,
        isActive: true,
        segments: Array.from({ length: 6 }).map((_, idx) => ({
            slotIndex: idx,
            label: idx % 2 === 0 ? "100 P" : "꽝",
            weight: 10,
            rewardType: idx % 2 === 0 ? "POINT" : "NONE",
            rewardAmount: idx % 2 === 0 ? 100 : 0,
            isJackpot: false,
            color: idx % 2 === 0 ? "#EF4444" : "#E5E7EB"
        }))
    });

    return [
        createMockConfig("COMMON", 1, "ROULETTE_TICKET"),
        createMockConfig("VIP", 2, "GOLD_KEY_TICKET"),
        createMockConfig("WHALE", 3, "DIAMOND_TICKET"),
        createMockConfig("AT_RISK", 4, "TRIAL_TICKET"),
    ];
};

export const updateRouletteConfig = async (data: Partial<AdminRouletteConfigDto>): Promise<void> => {
    await v2Client.put(`/admin/api/game/roulette/config/${data.id}`, data);
};

// Dice API
export const getDiceConfig = async (): Promise<AdminDiceConfigDto> => {
    // Mock Data
    return {
        id: 1,
        gameType: "DICE",
        name: "Basic Dice",
        isActive: true,
        maxDailyPlays: 10,
        winRewardType: "POINT",
        winRewardAmount: 1000,
        drawRewardType: "NONE",
        drawRewardAmount: 0,
        loseRewardType: "POINT",   // Example: Lose gives negative or small consolation? SoT says negative allowed.
        loseRewardAmount: -100
    };
};

export const updateDiceConfig = async (data: Partial<AdminDiceConfigDto>): Promise<void> => {
    await v2Client.put("/admin/api/game/dice/config", data);
};

// Lottery API
export const getLotteryConfig = async (): Promise<AdminLotteryConfigDto> => {
    // Mock Data
    return {
        id: 1,
        name: "Instant Lottery",
        isActive: true,
        maxDailyPlays: 5,
        puzzlePieceProbability: 5.0, // 5% base drop rate
        prizes: [
            { id: 1, label: "1등 (100만 P)", weight: 1, stock: 1, rewardType: "POINT", rewardAmount: 1000000, isActive: true, color: "#FDBA74" },
            { id: 2, label: "2등 (10만 P)", weight: 10, stock: 10, rewardType: "POINT", rewardAmount: 100000, isActive: true, color: "#FCD34D" },
            { id: 3, label: "3등 (1만 P)", weight: 100, stock: 100, rewardType: "POINT", rewardAmount: 10000, isActive: true, color: "#86EFAC" },
            { id: 4, label: "꽝", weight: 500, stock: undefined, rewardType: "NONE", rewardAmount: 0, isActive: true, color: "#E5E7EB" },
        ]
    };
};

export const updateLotteryConfig = async (data: Partial<AdminLotteryConfigDto>): Promise<void> => {
    await v2Client.put("/admin/api/game/lottery/config", data);
};

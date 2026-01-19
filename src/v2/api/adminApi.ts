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

// ============================================================================
// Withdrawal API
// ============================================================================

export const getAdminWithdrawals = async (): Promise<AdminWithdrawalDto[]> => {
  // TODO: Replace with actual endpoint when available on backend
  // const response = await v2Client.get<AdminWithdrawalDto[]>("/admin/api/economy/withdrawals/pending");
  // return response.data;
  
  // Return Mock Data for now as backend endpoint might not be fully ready for GET list
  return [
    { id: 101, userId: 1001, nickname: "HighRoller99", amount: 150000, requestTime: "10:30 AM", riskLevel: "LOW", status: "PENDING" },
    { id: 102, userId: 1005, nickname: "Tester01", amount: 50000, requestTime: "10:45 AM", riskLevel: "LOW", status: "PENDING" },
    { id: 103, userId: 1042, nickname: "UnknownUser", amount: 5000000, requestTime: "11:00 AM", riskLevel: "HIGH", status: "PENDING" },
  ];
};

export const approveWithdrawal = async (id: number): Promise<void> => {
   await v2Client.post(`/admin/api/economy/withdrawals/${id}/approve`);
};

export const rejectWithdrawal = async (id: number, reason: string): Promise<void> => {
   await v2Client.post(`/admin/api/economy/withdrawals/${id}/reject`, { reason });
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

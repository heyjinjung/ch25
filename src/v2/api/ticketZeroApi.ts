// src/v2/api/ticketZeroApi.ts
import userApi from "../../api/httpClient";

// ============================================================================
// Ticket Zero (Bailout) API
// ============================================================================

export interface TicketZeroStatusResponse {
  readonly eligible: boolean;
  readonly reason?: string;
  readonly cooldown_remaining_seconds?: number;
  readonly last_bailout_at?: string;
}

export interface TicketZeroBailoutResponse {
  readonly success: boolean;
  readonly ticket_type: string;
  readonly ticket_amount: number;
  readonly message: string;
  readonly next_bailout_available_at: string;
}

export const getV2TicketZeroStatus = async (): Promise<TicketZeroStatusResponse> => {
  try {
    const response = await userApi.get<TicketZeroStatusResponse>("/api/v2/ticket-zero/status");
    return response.data;
  } catch (error) {
    console.error("[ticketZeroApi] Failed to fetch V2 ticket zero status", error);
    throw error;
  }
};

export const requestV2TicketZeroBailout = async (): Promise<TicketZeroBailoutResponse> => {
  try {
    const response = await userApi.post<TicketZeroBailoutResponse>("/api/v2/ticket-zero/bailout");
    return response.data;
  } catch (error) {
    console.error("[ticketZeroApi] Failed to request V2 ticket zero bailout", error);
    throw error;
  }
};

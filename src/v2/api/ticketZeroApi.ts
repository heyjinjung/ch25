// src/api/ticketZeroApi.ts
import { v2Client } from "./client";

// ============================================================================
// Ticket Zero (Bailout) API
// ============================================================================

export interface TicketZeroStatusResponse {
  readonly bailout_available: boolean;
}

export interface TicketZeroBailoutResponse {
  readonly granted: boolean;
  readonly ticket_type: string;
  readonly ticket_amount: number;
}

export const getV2TicketZeroStatus = async (): Promise<TicketZeroStatusResponse> => {
  try {
    const response = await v2Client.get<TicketZeroStatusResponse>("/api/ticket-zero/status");
    return response.data;
  } catch (error) {
    console.error("[ticketZeroApi] Failed to fetch V2 ticket zero status", error);
    throw error;
  }
};

export const requestV2TicketZeroBailout = async (): Promise<TicketZeroBailoutResponse> => {
  try {
    const response = await v2Client.post<TicketZeroBailoutResponse>("/api/ticket-zero/bailout");
    return response.data;
  } catch (error) {
    console.error("[ticketZeroApi] Failed to request V2 ticket zero bailout", error);
    throw error;
  }
};

// src/v2/api/inboxApi.ts
import { v2Client } from "./client";

// ============================================================================
// Inbox API
// ============================================================================

export interface InboxMessageDto {
  readonly id: number;
  readonly message_id: number;
  readonly title: string;
  readonly content: string;
  readonly is_read: boolean;
  readonly read_at: string | null;
  readonly created_at: string;
}

export interface InboxListResponse {
  readonly messages: InboxMessageDto[];
  readonly unread_count: number;
}

export interface MarkInboxReadRequest {
  readonly inbox_ids: number[];
}

export interface MarkInboxReadResponse {
  readonly marked_count: number;
  readonly remaining_unread: number;
}

export const getV2Inbox = async (): Promise<InboxListResponse> => {
  try {
    const response = await v2Client.get<InboxListResponse>("/api/v2/inbox");
    return response.data;
  } catch (error) {
    console.error("[inboxApi] Failed to fetch V2 inbox", error);
    throw error;
  }
};

export const markV2InboxRead = async (request: MarkInboxReadRequest): Promise<MarkInboxReadResponse> => {
  try {
    const response = await v2Client.patch<MarkInboxReadResponse>("/api/v2/inbox/read", request);
    return response.data;
  } catch (error) {
    console.error("[inboxApi] Failed to mark V2 inbox messages as read", error);
    throw error;
  }
};

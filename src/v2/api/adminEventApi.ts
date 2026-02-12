// src/v2/api/adminEventApi.ts
import { v2Client } from "./client";

// ============================================================================
// Admin Event API — Valentine & Seol Event Management
// ============================================================================

export interface SecretCodeStats {
  readonly id: number;
  readonly code: string;
  readonly event_date: string;
  readonly reward_type: string;
  readonly reward_amount: number;
  readonly is_active: boolean;
  readonly claim_count: number;
  readonly expires_at: string;
}

export interface MissionStats {
  readonly mission_id: number;
  readonly title: string;
  readonly logic_key: string | null;
  readonly total_participants: number;
  readonly completed_count: number;
  readonly claimed_count: number;
  readonly completion_rate: number;
}

export interface EventStatsResponse {
  readonly secret_codes: SecretCodeStats[];
  readonly missions: MissionStats[];
  readonly total_participants: number;
  readonly streak_completed_count: number;
}

export interface SyncResponse {
  readonly success: boolean;
  readonly message: string;
  readonly synced_at: string;
}

export const getEventStats = async (): Promise<EventStatsResponse> => {
  const response = await v2Client.get<EventStatsResponse>(
    "/api/admin/events/valentine-seol/stats",
  );
  return response.data;
};

export const toggleSecretCode = async (
  codeId: number,
  isActive: boolean,
): Promise<{ id: number; code: string; is_active: boolean; message: string }> => {
  const response = await v2Client.patch(
    `/api/admin/events/secret-codes/${codeId}`,
    { is_active: isActive },
  );
  return response.data;
};

export const syncEvent = async (): Promise<SyncResponse> => {
  const response = await v2Client.post<SyncResponse>(
    "/api/admin/events/valentine-seol/sync",
  );
  return response.data;
};

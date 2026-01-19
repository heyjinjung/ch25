// src/v2/api/goldenApi.ts
import userApi from "../../api/httpClient";

// ============================================================================
// Golden (Retention/Intervention) API
// ============================================================================

export interface RetentionInterventionRequest {
  readonly event_type: string;
  readonly data?: Record<string, unknown>;
}

export interface RetentionInterventionResponse {
  readonly eligible: boolean;
  readonly experiment_group?: string;
  readonly reward_type?: string;
  readonly reward_amount?: number;
  readonly capped_amount?: number;
  readonly cmax?: number;
  readonly predicted_ltv?: number;
  readonly roi_percent?: number;
  readonly message?: string;
}

export interface ReengagementQueueRequest {
  readonly reason: string;
  readonly channel: string;
}

export interface ReengagementQueueResponse {
  readonly queued: boolean;
  readonly reason: string;
  readonly channel: string;
  readonly scheduled_at?: string;
}

export const resolveV2Intervention = async (request: RetentionInterventionRequest): Promise<RetentionInterventionResponse> => {
  try {
    const response = await userApi.post<RetentionInterventionResponse>("/api/v2/golden/intervention/resolve", request);
    return response.data;
  } catch (error) {
    console.error("[goldenApi] Failed to resolve V2 intervention", error);
    throw error;
  }
};

export const queueV2Reengagement = async (request: ReengagementQueueRequest): Promise<ReengagementQueueResponse> => {
  try {
    const response = await userApi.post<ReengagementQueueResponse>("/api/v2/golden/reengagement/queue", request);
    return response.data;
  } catch (error) {
    console.error("[goldenApi] Failed to queue V2 reengagement", error);
    throw error;
  }
};

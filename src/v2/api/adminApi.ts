// src/v2/api/adminApi.ts
import userApi from "../../api/httpClient";

// ============================================================================
// Admin/Ops API (세그먼트/메시지 관리용)
// ============================================================================

export type TargetType = "ALL" | "SEGMENT" | "USER" | "TAG";

export interface SegmentBatchResponse {
  readonly processed: number;
  readonly changed: number;
}

export interface CreateMessageRequest {
  readonly title: string;
  readonly content: string;
  readonly target_type: TargetType;
  readonly target_value?: string;
  readonly channels?: string[];
}

export interface AdminMessageResponse {
  readonly id: number;
  readonly sender_admin_id: number;
  readonly title: string;
  readonly content: string;
  readonly target_type: TargetType;
  readonly target_value?: string;
  readonly channels?: string[];
  readonly recipient_count: number;
  readonly read_count: number;
  readonly created_at: string;
}

export interface OpsExecutionResult {
  readonly id: number;
  readonly task_id: string;
  readonly kind: string;
  readonly payload_json: Record<string, unknown>;
  readonly created_at: string;
}

export interface OpsExecutionListResponse {
  readonly results: OpsExecutionResult[];
  readonly total_count: number;
}

export const runV2SegmentBatch = async (): Promise<SegmentBatchResponse> => {
  try {
    const response = await userApi.post<SegmentBatchResponse>("/api/v2/segments/run");
    return response.data;
  } catch (error) {
    console.error("[adminApi] Failed to run V2 segment batch", error);
    throw error;
  }
};

export const createV2AdminMessage = async (request: CreateMessageRequest): Promise<AdminMessageResponse> => {
  try {
    const response = await userApi.post<AdminMessageResponse>("/api/v2/messages", request);
    return response.data;
  } catch (error) {
    console.error("[adminApi] Failed to create V2 admin message", error);
    throw error;
  }
};

// Ops 실행 결과 조회는 향후 API가 추가되면 구현
// export const getV2OpsExecutionResults = async (params?: { limit?: number; offset?: number }): Promise<OpsExecutionListResponse> => {
//   try {
//     const response = await userApi.get<OpsExecutionListResponse>("/api/v2/ops/executions", { params });
//     return response.data;
//   } catch (error) {
//     console.error("[adminApi] Failed to fetch V2 ops execution results", error);
//     throw error;
//   }
// };

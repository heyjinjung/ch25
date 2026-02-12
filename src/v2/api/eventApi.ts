// src/v2/api/eventApi.ts
import { v2Client } from "./client";

// ============================================================================
// Event API — 2026 Valentine & Seol Event
// ============================================================================

export interface EventMissionStatus {
  readonly mission_id: number;
  readonly title: string;
  readonly logic_key: string | null;
  readonly target_value: number;
  readonly current_value: number;
  readonly is_completed: boolean;
  readonly is_claimed: boolean;
  readonly reward_type: string | null;
  readonly reward_amount: number | null;
}

export interface EventStatusResponse {
  readonly missions: EventMissionStatus[];
  readonly streak_completed: boolean;
  readonly streak_current: number;
  readonly streak_target: number;
  readonly secret_codes_claimed: string[];
}

export interface SecretCodeClaimResponse {
  readonly success: boolean;
  readonly reward_type: string | null;
  readonly reward_amount: number | null;
  readonly message: string | null;
}

export const getValentineSeolStatus =
  async (): Promise<EventStatusResponse> => {
    try {
      const response = await v2Client.get<EventStatusResponse>(
        "/api/events/valentine-seol/status",
      );
      return response.data;
    } catch (error) {
      console.error("[eventApi] Failed to fetch valentine-seol status", error);
      throw error;
    }
  };

export const claimSecretCode = async (
  code: string,
): Promise<SecretCodeClaimResponse> => {
  try {
    const response = await v2Client.post<SecretCodeClaimResponse>(
      "/api/events/secret-code/claim",
      { code: code.trim().toUpperCase() },
    );
    return response.data;
  } catch (error) {
    console.error("[eventApi] Failed to claim secret code", error);
    throw error;
  }
};

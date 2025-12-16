// src/api/activityApi.ts
import userApi from "./httpClient";

export type ActivityEventType = "ROULETTE_PLAY" | "DICE_PLAY" | "LOTTERY_PLAY" | "BONUS_USED" | "PLAY_DURATION";

const generateEventId = (): string => {
  const cryptoObj = (globalThis as any).crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }
  // RFC4122-ish fallback (sufficient for idempotency keys)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export interface ActivityRecordRequest {
  readonly event_type: ActivityEventType;
  readonly event_id?: string;
  readonly value?: number | string | null;
}

export interface ActivityRecordResponse {
  readonly user_id: number;
  readonly updated_at: string;
}

export const recordActivity = async (payload: ActivityRecordRequest): Promise<ActivityRecordResponse> => {
  const requestPayload: ActivityRecordRequest = {
    event_id: payload.event_id ?? generateEventId(),
    ...payload,
  };
  const { data } = await userApi.post<ActivityRecordResponse>("/api/activity/record", requestPayload);
  return data;
};

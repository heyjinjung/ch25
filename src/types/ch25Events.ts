export type Ch25EventType = "LOSS_STREAK" | "ASSET_DEPLETION" | "SESSION_END";

export interface Ch25EventPayload {
  event_type: Ch25EventType;
  timestamp?: number;
  data: Record<string, any>;
}

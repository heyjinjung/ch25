// src/api/admin/opsLogKeys.ts

export const OpsLogCategory = {
  ROUTINE: "ROUTINE",
  EVENT: "EVENT",
  ISSUE: "ISSUE",
  PAYOUT: "PAYOUT",
  SYSTEM: "SYSTEM",
  AUDIT: "AUDIT",
  CS: "CS",
  MARKETING: "MARKETING",
  NOTIFICATION: "NOTIFICATION",
  EXPERIMENT: "EXPERIMENT",
  ANALYTICS: "ANALYTICS",
  // Add others if missed
  GAME_PLAY: "GAME_PLAY",
  ECONOMY: "ECONOMY",
  SECURITY: "SECURITY",
  USER_MANAGEMENT: "USER_MANAGEMENT",
} as const;

export type OpsLogCategory = typeof OpsLogCategory[keyof typeof OpsLogCategory];

export type OpsLogTargetModel =
  | "USER"
  | "TEAM"
  | "SEASON"
  | "ITEM"
  | "VAULT"
  | "MISSION"
  | "SYSTEM"
  | "NONE";

export type OpsLogListFilters = {
  category?: OpsLogCategory;
  action_code?: string;
  actor_id?: number;
};

export const opsLogKeys = {
  all: ["admin", "ops-log"] as const,
  lists: () => ["admin", "ops-log", "list"] as const,
  list: (date: string, filters?: OpsLogListFilters) =>
    ["admin", "ops-log", "list", date, filters ?? null] as const,
  detail: (id: number) => ["admin", "ops-log", "detail", id] as const,
};

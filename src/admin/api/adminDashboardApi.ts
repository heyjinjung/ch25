import { adminApi as httpClient } from "./httpClient";

// --- Existing Metrics ---

export type MetricValue = {
  value: number | null;
  diff_percent: number | null;
};

export type DashboardMetricsResponse = {
  range_hours: number;
  generated_at: string;
  active_users: MetricValue;
  game_participation: MetricValue;
  unique_players: MetricValue;
  ticket_usage: MetricValue;
  avg_session_time_seconds: MetricValue;
};

export type StreakDailyMetric = {
  day: string;
  promote: number;
  reset: number;
  ticket_bonus_grant: number;
  vault_bonus_applied: number;
  vault_base_plays: number;
  vault_bonus_applied_via_earn_event: number;
  excluded_by_dice_mode: number;
  excluded_by_token_type: number;
};

export type StreakMetricsResponse = {
  days: number;
  generated_at: string;
  timezone: string;
  calendar_bucket: string;
  operational_reset_hour_kst: number;
  streak_trigger: string;
  notes: string[];
  items: StreakDailyMetric[];
};

export async function fetchDashboardMetrics(rangeHours = 24): Promise<DashboardMetricsResponse> {
  const res = await httpClient.get<DashboardMetricsResponse>("/admin/api/dashboard/metrics", {
    params: { range_hours: rangeHours },
  });
  return res.data;
}

export async function fetchStreakMetrics(days = 7): Promise<StreakMetricsResponse> {
  const res = await httpClient.get<StreakMetricsResponse>("/admin/api/dashboard/streak", {
    params: { days },
  });
  return res.data;
}

// --- New Ops Dashboard Metrics ---

export interface DailyOverviewResponse {
  risk_count: number;
  streak_risk_count: number;
  mission_percent: number;
  vault_payout_ratio: number | null;
  total_vault_paid: number;
  total_deposit_estimated: number;
}

export interface EventMetric {
  label: string;
  value: string | number;
  trend?: string; // "UP" | "DOWN" | "STABLE"
  status?: string; // "ON" | "OFF"
}

export interface EventsStatusResponse {
  welcome_metrics: EventMetric[];
  streak_counts: Record<string, number>;
  golden_hour_peak: number;
  is_golden_hour_active: boolean;
}

export interface ComprehensiveOverviewResponse {
  welcome_retention_rate: number;
  churn_risk_count: number;
  external_ranking_deposit: number;
  external_ranking_play_count: number;
  today_deposit_sum: number;
  today_deposit_count: number;
  total_vault_balance: number;
  total_inventory_liability: number;
  today_active_users: number;
  today_game_plays: number;
  streak_counts: Record<string, number>;
}

export const fetchComprehensiveOverview = async (): Promise<ComprehensiveOverviewResponse> => {
  const response = await httpClient.get<ComprehensiveOverviewResponse>("/admin/api/dashboard/comprehensive");
  return response.data;
};

export const getDailyOverview = async (): Promise<DailyOverviewResponse> => {
  const response = await httpClient.get("/admin/api/dashboard/daily-overview");
  return response.data;
};

export const getEventsStatus = async (): Promise<EventsStatusResponse> => {
  const response = await httpClient.get("/admin/api/dashboard/events-status");
  return response.data;
};

export const nudgeRiskGroup = async (): Promise<{ status: string; nudged_count: number }> => {
  const response = await httpClient.post("/admin/api/dashboard/notifications/nudge");
  return response.data;
};

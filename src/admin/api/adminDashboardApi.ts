// src/admin/api/adminDashboardApi.ts
import adminApi from "./httpClient";

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

export async function fetchDashboardMetrics(rangeHours = 24): Promise<DashboardMetricsResponse> {
  const res = await adminApi.get<DashboardMetricsResponse>("/dashboard/metrics", {
    params: { range_hours: rangeHours },
  });
  return res.data;
}

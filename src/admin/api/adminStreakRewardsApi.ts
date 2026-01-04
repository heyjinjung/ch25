import { adminApi as httpClient } from "./httpClient";

export type StreakRewardDailyCountsResponse = {
  day: string;
  grant_day3: number;
  grant_day7: number;
  skip_day3: number;
  skip_day7: number;
};

export type StreakRewardUserInfo = {
  id: number;
  external_id: string;
  nickname?: string | null;
};

export type StreakRewardUserEvent = {
  id: number;
  user_id: number;
  feature_type: string;
  event_name: string;
  meta_json: Record<string, any> | null;
  created_at: string;
};

export type StreakRewardUserEventsResponse = {
  user: StreakRewardUserInfo;
  items: StreakRewardUserEvent[];
};

export async function fetchStreakRewardDailyCounts(day: string): Promise<StreakRewardDailyCountsResponse> {
  const res = await httpClient.get<StreakRewardDailyCountsResponse>("/admin/api/streak-rewards/daily-counts", {
    params: { day },
  });
  return res.data;
}

export async function fetchStreakRewardUserEvents(params: {
  user_id?: number;
  external_id?: string;
  day?: string;
  limit?: number;
}): Promise<StreakRewardUserEventsResponse> {
  const res = await httpClient.get<StreakRewardUserEventsResponse>("/admin/api/streak-rewards/user-events", {
    params,
  });
  return res.data;
}

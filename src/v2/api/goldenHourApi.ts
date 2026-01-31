/**
 * 골든아워 전용 API
 */
import { v2Client } from "./client";

export interface GoldenHourStatus {
  isActive: boolean;
  isUpcoming: boolean;
  minutesUntilStart: number | null;
  multiplier: number;
  startTimeKst: string;
  endTimeKst: string;
  enabled: boolean;
}

interface EventStatusResponse {
  is_golden_hour: boolean;
  multiplier: number;
  next_event_time: string | null;
  active_events: any[];
  golden_hour?: {
    is_golden_hour: boolean;
    is_upcoming: boolean;
    minutes_until_start: number | null;
    multiplier: number;
    start_time_kst: string;
    end_time_kst: string;
    enabled: boolean;
  };
}

export const getGoldenHourStatus = async (): Promise<GoldenHourStatus> => {
  const response =
    await v2Client.get<EventStatusResponse>("/api/events/status");
  const data = response.data;
  const gh = data.golden_hour;

  return {
    isActive: gh?.is_golden_hour ?? data.is_golden_hour ?? false,
    isUpcoming: gh?.is_upcoming ?? false,
    minutesUntilStart: gh?.minutes_until_start ?? null,
    multiplier: gh?.multiplier ?? data.multiplier ?? 1.0,
    startTimeKst: gh?.start_time_kst ?? "21:30:00",
    endTimeKst: gh?.end_time_kst ?? "22:30:00",
    enabled: gh?.enabled ?? false,
  };
};

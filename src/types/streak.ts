export interface StreakInfo {
  streak_days: number;
  current_multiplier: number;
  is_hot: boolean;
  is_legend: boolean;
  next_milestone: number;
  claimable_day?: number | null;
}

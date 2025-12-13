export interface TeamSeason {
  id: number;
  name: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  rewards_schema?: Record<string, unknown> | null;
}

export interface Team {
  id: number;
  name: string;
  icon?: string | null;
  is_active: boolean;
}

export interface LeaderboardEntry {
  team_id: number;
  team_name: string;
  points: number;
  member_count?: number;
  latest_event_at?: string | null;
}

export interface ContributorEntry {
  user_id: number;
  points: number;
  latest_event_at?: string | null;
}

export interface TeamJoinResponse {
  team_id: number;
  user_id: number;
  role: string;
}

export interface TeamMembership {
  team_id: number;
  role: string;
  joined_at: string;
}

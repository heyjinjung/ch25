// src/api/teamBattleApi.ts
import { v2Client } from "./client";

// ============================================================================
// Team Battle API
// ============================================================================

export interface TeamBattleSeasonDto {
  readonly id: number;
  readonly name: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly is_active: boolean;
}

export interface TeamDto {
  readonly id: number;
  readonly name: string;
  readonly description?: string;
  readonly member_count: number;
  readonly max_members: number;
  readonly total_score: number;
  readonly rank?: number;
}

export interface TeamMemberDto {
  readonly team_id: number;
  readonly user_id: number;
  readonly role: string;
  readonly joined_at: string;
  readonly contribution_score: number;
}

export interface TeamMembershipResponse {
  readonly team?: TeamDto;
  readonly membership?: TeamMemberDto;
  readonly has_team: boolean;
}

export interface JoinTeamRequest {
  readonly team_id: number;
}

export interface JoinTeamResponse {
  readonly team_id: number;
  readonly user_id: number;
  readonly role: string;
}

export interface LeaveTeamResponse {
  readonly left: boolean;
}

export interface LeaderboardEntry {
  readonly team: TeamDto;
  readonly rank: number;
  readonly season_score: number;
}

export interface LeaderboardResponse {
  readonly entries: LeaderboardEntry[];
  readonly season_id: number;
  readonly total_count: number;
}

export const getV2ActiveSeason = async (): Promise<TeamBattleSeasonDto> => {
  try {
    const response = await v2Client.get<TeamBattleSeasonDto>("/api/team-battle/seasons/active");
    return response.data;
  } catch (error) {
    console.error("[teamBattleApi] Failed to fetch V2 active season", error);
    throw error;
  }
};

export const getV2JoinableTeams = async (): Promise<TeamDto[]> => {
  try {
    const response = await v2Client.get<TeamDto[]>("/api/team-battle/teams");
    return response.data;
  } catch (error) {
    console.error("[teamBattleApi] Failed to fetch V2 joinable teams", error);
    throw error;
  }
};

export const joinV2Team = async (request: JoinTeamRequest): Promise<JoinTeamResponse> => {
  try {
    const response = await v2Client.post<JoinTeamResponse>("/api/team-battle/teams/join", request);
    return response.data;
  } catch (error) {
    console.error("[teamBattleApi] Failed to join V2 team", error);
    throw error;
  }
};

export const leaveV2Team = async (): Promise<LeaveTeamResponse> => {
  try {
    const response = await v2Client.post<LeaveTeamResponse>("/api/team-battle/teams/leave");
    return response.data;
  } catch (error) {
    console.error("[teamBattleApi] Failed to leave V2 team", error);
    throw error;
  }
};

export const getV2MyTeamMembership = async (): Promise<TeamMembershipResponse> => {
  try {
    const response = await v2Client.get<TeamMembershipResponse>("/api/team-battle/teams/me");
    return response.data;
  } catch (error) {
    console.error("[teamBattleApi] Failed to fetch V2 team membership", error);
    throw error;
  }
};

export interface LeaderboardParams {
  readonly season_id?: number;
  readonly limit?: number;
  readonly offset?: number;
}

export const getV2TeamLeaderboard = async (params?: LeaderboardParams): Promise<LeaderboardResponse> => {
  try {
    const response = await v2Client.get<LeaderboardResponse>("/api/team-battle/teams/leaderboard", {
      params: {
        season_id: params?.season_id,
        limit: params?.limit || 20,
        offset: params?.offset || 0,
      },
    });
    return response.data;
  } catch (error) {
    console.error("[teamBattleApi] Failed to fetch V2 team leaderboard", error);
    throw error;
  }
};

export const autoAssignV2Team = async (): Promise<JoinTeamResponse> => {
  try {
    const response = await v2Client.post<JoinTeamResponse>("/api/team-battle/teams/auto-assign");
    return response.data;
  } catch (error) {
    console.error("[teamBattleApi] Failed to auto-assign V2 team", error);
    throw error;
  }
};


import apiClient from "./apiClient";
import { TeamSeason, Team, LeaderboardEntry, ContributorEntry, TeamJoinResponse } from "../types/teamBattle";

export const getActiveSeason = async (): Promise<TeamSeason | null> => {
  const res = await apiClient.get("/team-battle/seasons/active");
  return res.data || null;
};

export const listTeams = async (): Promise<Team[]> => {
  const res = await apiClient.get("/team-battle/teams");
  return res.data;
};

export const joinTeam = async (teamId: number): Promise<TeamJoinResponse> => {
  const res = await apiClient.post("/team-battle/teams/join", { team_id: teamId });
  return res.data;
};

export const leaveTeam = async (): Promise<{ left: boolean }> => {
  const res = await apiClient.post("/team-battle/teams/leave");
  return res.data;
};

export const getLeaderboard = async (seasonId?: number, limit = 20, offset = 0): Promise<LeaderboardEntry[]> => {
  const res = await apiClient.get("/team-battle/teams/leaderboard", { params: { season_id: seasonId, limit, offset } });
  return res.data;
};

export const getContributors = async (teamId: number, seasonId?: number, limit = 10, offset = 0): Promise<ContributorEntry[]> => {
  const res = await apiClient.get(`/team-battle/teams/${teamId}/contributors`, { params: { season_id: seasonId, limit, offset } });
  return res.data;
};

// Admin APIs
export const createSeason = async (payload: { name: string; starts_at: string; ends_at: string; is_active: boolean; rewards_schema?: Record<string, unknown> }) => {
  const res = await apiClient.post("/admin/api/team-battle/seasons", payload);
  return res.data as TeamSeason;
};

export const setSeasonActive = async (seasonId: number, isActive: boolean) => {
  const res = await apiClient.post(`/admin/api/team-battle/seasons/${seasonId}/active`, null, { params: { is_active: isActive } });
  return res.data as TeamSeason;
};

export const createTeam = async (payload: { name: string; icon?: string | null }, leaderUserId?: number) => {
  const res = await apiClient.post("/admin/api/team-battle/teams", payload, { params: { leader_user_id: leaderUserId } });
  return res.data as Team;
};

export const settleSeason = async (seasonId: number) => {
  const res = await apiClient.post(`/admin/api/team-battle/seasons/${seasonId}/settle`);
  return res.data;
};

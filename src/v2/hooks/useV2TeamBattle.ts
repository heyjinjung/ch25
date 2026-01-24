// src/hooks/useV2TeamBattle.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getV2ActiveSeason,
  getV2JoinableTeams,
  joinV2Team,
  leaveV2Team,
  getV2MyTeamMembership,
  getV2TeamLeaderboard,
  autoAssignV2Team,
  type JoinTeamRequest,
  type LeaderboardParams,
} from "../api/teamBattleApi";

// ============================================================================
// Team Battle Hooks
// ============================================================================

export function useV2ActiveSeason() {
  return useQuery({
    queryKey: ["v2", "team-battle", "season", "active"],
    queryFn: () => getV2ActiveSeason(),
    staleTime: 300000, // 5 minutes (season rarely changes)
  });
}

export function useV2JoinableTeams() {
  return useQuery({
    queryKey: ["v2", "team-battle", "teams", "joinable"],
    queryFn: () => getV2JoinableTeams(),
    staleTime: 60000, // 1 minute
  });
}

export function useV2MyTeamMembership() {
  return useQuery({
    queryKey: ["v2", "team-battle", "membership", "me"],
    queryFn: () => getV2MyTeamMembership(),
    staleTime: 30000, // 30 seconds
  });
}

export function useV2TeamLeaderboard(params?: LeaderboardParams) {
  return useQuery({
    queryKey: ["v2", "team-battle", "leaderboard", params?.season_id, params?.limit, params?.offset],
    queryFn: () => getV2TeamLeaderboard(params),
    staleTime: 30000, // 30 seconds
  });
}

export function useV2JoinTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: JoinTeamRequest) => joinV2Team(request),
    onSuccess: () => {
      // Invalidate team membership
      queryClient.invalidateQueries({ queryKey: ["v2", "team-battle", "membership", "me"] });
      // Invalidate joinable teams list
      queryClient.invalidateQueries({ queryKey: ["v2", "team-battle", "teams", "joinable"] });
      // Invalidate leaderboard
      queryClient.invalidateQueries({ queryKey: ["v2", "team-battle", "leaderboard"] });
    },
  });
}

export function useV2LeaveTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => leaveV2Team(),
    onSuccess: () => {
      // Invalidate team membership
      queryClient.invalidateQueries({ queryKey: ["v2", "team-battle", "membership", "me"] });
      // Invalidate joinable teams list
      queryClient.invalidateQueries({ queryKey: ["v2", "team-battle", "teams", "joinable"] });
      // Invalidate leaderboard
      queryClient.invalidateQueries({ queryKey: ["v2", "team-battle", "leaderboard"] });
    },
  });
}

export function useV2AutoAssignTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => autoAssignV2Team(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "team-battle", "membership", "me"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "team-battle", "teams", "joinable"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "team-battle", "leaderboard"] });
    },
  });
}


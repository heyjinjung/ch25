import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminMissions,
  updateMission,
  createAdminMission,
  deleteAdminMission,
  getAdminLevels,
  updateAdminLevel,
  updateAdminLevelGlobalConfig,
  getUserMissionHistory,
  forceCompleteMission,
  updateUserMissionProgress,
  resetUserMissionProgress,
  claimUserMissionReward,
  type AdminMissionDto,
  type AdminLevelDto,
  type AdminLevelGlobalConfig,
  type UserMissionProgressUpdateRequest,
  type AdminUserLevelAdjustRequest,
  type AdminUserLevelSetRequest,
  getAdminUserLevel,
  adjustAdminUserLevelXp,
  setAdminUserLevel,
  getAdminTeamBattleSeasons,
  createAdminTeamBattleSeason,
  endAdminTeamBattleSeason,
  getAdminTeamBattleTeams,
  createAdminTeamBattleTeam,
  adjustAdminTeamBattleScore,
  forceJoinAdminTeamBattle,
  forceLeaveAdminTeamBattle,
  getAdminTeamBattleTeamMembers,
  getAdminTeamBattleMemberContributions,
  updateAdminTeamBattleMemberJoinedAt,
  adjustAdminTeamBattleMemberContribution,
  type AdminTeamBattleCreateSeasonRequest,
  type AdminTeamBattleCreateTeamRequest,
  type AdminTeamBattleScoreAdjustRequest,
  type AdminTeamBattleForceJoinRequest,
  type AdminTeamBattleForceLeaveRequest,
  type AdminTeamBattleMemberJoinedAtUpdateRequest,
  type AdminTeamBattleMemberContributionAdjustRequest,
} from "../api/adminApi";

// ============================================================================
// Mission Hooks
// ============================================================================

export function useAdminMissions() {
  return useQuery({
    queryKey: ["admin", "game", "missions"],
    queryFn: getAdminMissions,
  });
}

export function useAdminUpdateMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<AdminMissionDto>;
    }) => updateMission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "game", "missions"],
      });
    },
  });
}

export function useAdminCreateMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createAdminMission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "game", "missions"],
      });
    },
  });
}

export function useAdminDeleteMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAdminMission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "game", "missions"],
      });
    },
  });
}

export function useAdminUserMissionHistory(userId?: number) {
  return useQuery({
    queryKey: ["admin", "users", userId, "missions"],
    queryFn: () => getUserMissionHistory(userId as number),
    enabled: !!userId,
  });
}

export function useAdminForceCompleteMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      missionId,
    }: {
      userId: number;
      missionId: number;
    }) => forceCompleteMission(userId, missionId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "users", vars.userId, "missions"],
      });
    },
  });
}

export function useAdminUpdateUserMissionProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      missionId,
      payload,
    }: {
      userId: number;
      missionId: number;
      payload: UserMissionProgressUpdateRequest;
    }) => updateUserMissionProgress(userId, missionId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "users", vars.userId, "missions"],
      });
    },
  });
}

export function useAdminResetUserMissionProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      missionId,
    }: {
      userId: number;
      missionId: number;
    }) => resetUserMissionProgress(userId, missionId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "users", vars.userId, "missions"],
      });
    },
  });
}

export function useAdminClaimUserMissionReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      missionId,
    }: {
      userId: number;
      missionId: number;
    }) => claimUserMissionReward(userId, missionId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "users", vars.userId, "missions"],
      });
    },
  });
}

// ============================================================================
// Level Hooks
// ============================================================================

export function useAdminLevels() {
  return useQuery({
    queryKey: ["admin", "game", "levels"],
    queryFn: getAdminLevels,
  });
}

export function useAdminUpdateLevel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { level: number; data: Partial<AdminLevelDto> }) =>
      updateAdminLevel(vars.level, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "game", "levels"] });
    },
  });
}

export const useAdminUpdateLevelGlobalConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminLevelGlobalConfig) =>
      updateAdminLevelGlobalConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "game", "levels"] });
    },
  });
};

// ============================================================================
// Team Battle Admin Hooks
// ============================================================================

export function useAdminTeamBattleSeasons() {
  return useQuery({
    queryKey: ["admin", "team-battle", "seasons"],
    queryFn: getAdminTeamBattleSeasons,
  });
}

export function useAdminCreateTeamBattleSeason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminTeamBattleCreateSeasonRequest) =>
      createAdminTeamBattleSeason(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "team-battle", "seasons"],
      });
    },
  });
}

export function useAdminEndTeamBattleSeason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      seasonId,
      distributeRewards,
    }: {
      seasonId: number;
      distributeRewards: boolean;
    }) => endAdminTeamBattleSeason(seasonId, distributeRewards),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "team-battle", "seasons"],
      });
    },
  });
}

export function useAdminTeamBattleTeams() {
  return useQuery({
    queryKey: ["admin", "team-battle", "teams"],
    queryFn: getAdminTeamBattleTeams,
  });
}

export function useAdminCreateTeamBattleTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminTeamBattleCreateTeamRequest) =>
      createAdminTeamBattleTeam(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "team-battle", "teams"],
      });
    },
  });
}

export function useAdminAdjustTeamBattleScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminTeamBattleScoreAdjustRequest) =>
      adjustAdminTeamBattleScore(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "team-battle", "teams"],
      });
    },
  });
}

export function useAdminForceJoinTeamBattle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminTeamBattleForceJoinRequest) =>
      forceJoinAdminTeamBattle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "team-battle", "teams"],
      });
    },
  });
}

export function useAdminForceLeaveTeamBattle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminTeamBattleForceLeaveRequest) =>
      forceLeaveAdminTeamBattle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "team-battle", "teams"],
      });
    },
  });
}

export function useAdminTeamBattleTeamMembers(
  teamId?: number,
  seasonId?: number | null,
) {
  return useQuery({
    queryKey: ["admin", "team-battle", "teams", teamId, "members", seasonId],
    queryFn: () => getAdminTeamBattleTeamMembers(teamId as number, seasonId),
    enabled: !!teamId,
  });
}

export function useAdminTeamBattleMemberContributions(
  teamId?: number,
  userId?: number,
  seasonId?: number | null,
) {
  return useQuery({
    queryKey: [
      "admin",
      "team-battle",
      "teams",
      teamId,
      "members",
      userId,
      "contributions",
      seasonId,
    ],
    queryFn: () =>
      getAdminTeamBattleMemberContributions(
        teamId as number,
        userId as number,
        seasonId,
      ),
    enabled: !!teamId && !!userId,
  });
}

export function useAdminUpdateTeamBattleMemberJoinedAt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: number;
      payload: AdminTeamBattleMemberJoinedAtUpdateRequest;
    }) => updateAdminTeamBattleMemberJoinedAt(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "team-battle"],
      });
    },
  });
}

export function useAdminAdjustTeamBattleMemberContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminTeamBattleMemberContributionAdjustRequest) =>
      adjustAdminTeamBattleMemberContribution(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "team-battle"],
      });
    },
  });
}

// ============================================================================
// User Level (Per-User)
// ============================================================================

export function useAdminUserLevel(ccId?: string) {
  return useQuery({
    queryKey: ["admin", "users", "level", ccId],
    queryFn: () => getAdminUserLevel(ccId as string),
    enabled: false,
  });
}

export function useAdminAdjustUserLevelXp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminUserLevelAdjustRequest) =>
      adjustAdminUserLevelXp(payload),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "users", "level", vars.ccId],
      });
    },
  });
}

export function useAdminSetUserLevel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminUserLevelSetRequest) =>
      setAdminUserLevel(payload),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "users", "level", vars.ccId],
      });
    },
  });
}

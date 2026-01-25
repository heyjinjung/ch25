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

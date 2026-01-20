import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminMissions,
  updateMission,
  createAdminMission,
  deleteAdminMission,
  getAdminLevels,
  updateAdminLevel,
  updateAdminLevelGlobalConfig,
  type AdminMissionDto,
  type AdminLevelDto,
  type AdminLevelGlobalConfig,
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
    mutationFn: ({ id, data }: { id: number; data: Partial<AdminMissionDto> }) =>
      updateMission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "game", "missions"] });
    },
  });
}

export function useAdminCreateMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createAdminMission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "game", "missions"] });
    },
  });
}

export function useAdminDeleteMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAdminMission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "game", "missions"] });
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
};

export const useAdminUpdateLevelGlobalConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminLevelGlobalConfig) => updateAdminLevelGlobalConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "game", "levels"] });
    },
  });
};

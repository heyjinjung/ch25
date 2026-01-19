import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminMissions,
  updateMission,
  getAdminLevels,
  updateLevelConfig,
  type AdminMissionDto,
  type AdminLevelDto
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
    mutationFn: ({ level, data }: { level: number; data: Partial<AdminLevelDto> }) =>
      updateLevelConfig(level, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "game", "levels"] });
    },
  });
}

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
  // Streak & Milestone API
  getAdminUserStreak,
  resetAdminUserStreak,
  setAdminUserStreakCount,
  getAdminUserMilestoneProgress,
  forceGrantAdminMilestone,
  distributeAdminMilestoneReward,
  type SetStreakCountRequest,
  type ForceGrantMilestoneRequest,
  type DistributeMilestoneRequest,
  // Mission Stats & Validation API
  resetAdminUserMissions,
  verifyAdminLoginMissions,
  getAdminMissionStats,
  type MissionResetRequest,
  // Active User Stats API
  getAdminActiveUserStats,
  // Daily Finance API
  getAdminDailyRevenue,
  getAdminDailySpending,
  getAdminDailyFinance,
  // Audit Logs API
  getAdminAuditLogs,
  logAdminAction,
  // Vault Aggregate & Spend Limits API
  getAdminVaultAggregate,
  getAdminVaultSpendLimits,
  getAdminVaultSpendLimitSummary,
  // Analytics API
  getAdminRetentionAnalysis,
  getAdminRetentionTrend,
  getAdminRevenueBreakdown,
  getAdminRevenueSummary,
  getAdminMarketingChannelPerformance,
  getAdminMarketingCampaignPerformance,
  getAdminFunnelDaily,
  // Inventory Stock API
  adjustAdminStock,
  getAdminGifticonDeliveries,
  getAdminStockAlerts,
  type StockAdjustRequest,
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

// ============================================================================
// Streak & Milestone Hooks
// ============================================================================

export function useAdminUserStreak(userId?: number) {
  return useQuery({
    queryKey: ["admin", "streak", "user", userId],
    queryFn: () => getAdminUserStreak(userId as number),
    enabled: !!userId,
  });
}

export function useAdminResetUserStreak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => resetAdminUserStreak(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "streak", "user", userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "streak", "milestone", userId],
      });
    },
  });
}

export function useAdminSetUserStreakCount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: number;
      payload: SetStreakCountRequest;
    }) => setAdminUserStreakCount(userId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "streak", "user", vars.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "streak", "milestone", vars.userId],
      });
    },
  });
}

export function useAdminUserMilestoneProgress(userId?: number) {
  return useQuery({
    queryKey: ["admin", "streak", "milestone", userId],
    queryFn: () => getAdminUserMilestoneProgress(userId as number),
    enabled: !!userId,
  });
}

export function useAdminForceGrantMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: number;
      payload: ForceGrantMilestoneRequest;
    }) => forceGrantAdminMilestone(userId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "streak", "milestone", vars.userId],
      });
    },
  });
}

export function useAdminDistributeMilestoneReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DistributeMilestoneRequest) =>
      distributeAdminMilestoneReward(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "streak"],
      });
    },
  });
}

// ============================================================================
// Mission Stats & Validation Hooks
// ============================================================================

export function useAdminResetUserMissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: number;
      payload: MissionResetRequest;
    }) => resetAdminUserMissions(userId, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "users", vars.userId, "missions"],
      });
    },
  });
}

export function useAdminLoginMissionVerify(params?: {
  limit?: number;
  completed_only?: boolean;
}) {
  return useQuery({
    queryKey: ["admin", "game", "missions", "login-verify", params],
    queryFn: () => verifyAdminLoginMissions(params),
  });
}

export function useAdminMissionStats() {
  return useQuery({
    queryKey: ["admin", "game", "missions", "stats"],
    queryFn: getAdminMissionStats,
  });
}

// ============================================================================
// Active User Stats Hooks
// ============================================================================

export function useAdminActiveUserStats(days: number = 7) {
  return useQuery({
    queryKey: ["admin", "ops", "active-users", days],
    queryFn: () => getAdminActiveUserStats(days),
  });
}

// ============================================================================
// Daily Finance Hooks (일간 수익/지출)
// ============================================================================

export function useAdminDailyRevenue(targetDate?: string) {
  return useQuery({
    queryKey: ["admin", "ops", "daily-revenue", targetDate],
    queryFn: () => getAdminDailyRevenue(targetDate),
  });
}

export function useAdminDailySpending(targetDate?: string) {
  return useQuery({
    queryKey: ["admin", "ops", "daily-spending", targetDate],
    queryFn: () => getAdminDailySpending(targetDate),
  });
}

export function useAdminDailyFinance(targetDate?: string) {
  return useQuery({
    queryKey: ["admin", "ops", "daily-finance", targetDate],
    queryFn: () => getAdminDailyFinance(targetDate),
  });
}

// ============================================================================
// Audit Logs Hooks (감사 로그)
// ============================================================================

export function useAdminAuditLogs(params?: {
  action_filter?: string;
  category_filter?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["admin", "ops", "audit-logs", params],
    queryFn: () => getAdminAuditLogs(params),
  });
}

export function useAdminLogAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      action: string;
      category?: string;
      target_id?: string;
      metadata?: Record<string, any>;
    }) => logAdminAction(params),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "ops", "audit-logs"],
      });
    },
  });
}

// ============================================================================
// Vault Aggregate & Spend Limits Hooks (금고 집계 및 지출 한도)
// ============================================================================

export function useAdminVaultAggregate() {
  return useQuery({
    queryKey: ["admin", "vault", "aggregate"],
    queryFn: getAdminVaultAggregate,
  });
}

export function useAdminVaultSpendLimits(params?: {
  min_usage_rate?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["admin", "vault", "spend-limits", params],
    queryFn: () => getAdminVaultSpendLimits(params),
  });
}

export function useAdminVaultSpendLimitSummary() {
  return useQuery({
    queryKey: ["admin", "vault", "spend-limits", "summary"],
    queryFn: getAdminVaultSpendLimitSummary,
  });
}

// ============================================================================
// Analytics Hooks (보유율/수익/마케팅)
// ============================================================================

export function useAdminRetentionAnalysis(params?: {
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["admin", "analytics", "retention", params],
    queryFn: () => getAdminRetentionAnalysis(params),
  });
}

export function useAdminRetentionTrend(days: number = 30) {
  return useQuery({
    queryKey: ["admin", "analytics", "retention", "trend", days],
    queryFn: () => getAdminRetentionTrend(days),
  });
}

export function useAdminRevenueBreakdown(params?: {
  period?: "daily" | "weekly" | "monthly";
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["admin", "analytics", "revenue", "breakdown", params],
    queryFn: () => getAdminRevenueBreakdown(params),
  });
}

export function useAdminRevenueSummary() {
  return useQuery({
    queryKey: ["admin", "analytics", "revenue", "summary"],
    queryFn: getAdminRevenueSummary,
  });
}

export function useAdminMarketingChannelPerformance(params?: {
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: [
      "admin",
      "analytics",
      "marketing",
      "channel-performance",
      params,
    ],
    queryFn: () => getAdminMarketingChannelPerformance(params),
  });
}

export function useAdminMarketingCampaignPerformance(params?: {
  start_date?: string;
  end_date?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: [
      "admin",
      "analytics",
      "marketing",
      "campaign-performance",
      params,
    ],
    queryFn: () => getAdminMarketingCampaignPerformance(params),
  });
}

export function useAdminFunnelDaily(params?: {
  days?: number;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["admin", "analytics", "funnel", "daily", params],
    queryFn: () => getAdminFunnelDaily(params),
  });
}

// ============================================================================
// Inventory Stock Hooks (재고 관리)
// ============================================================================

export function useAdminAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StockAdjustRequest) => adjustAdminStock(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "inventory"],
      });
    },
  });
}

export function useAdminGifticonDeliveries(params?: {
  status?: "PENDING" | "DELIVERED" | "FAILED";
  user_id?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["admin", "inventory", "gifticon", "deliveries", params],
    queryFn: () => getAdminGifticonDeliveries(params),
  });
}

export function useAdminStockAlerts(threshold: number = 10) {
  return useQuery({
    queryKey: ["admin", "inventory", "stock-alerts", threshold],
    queryFn: () => getAdminStockAlerts(threshold),
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { opsPlanKeys } from "../api/opsPlanKeys";
import {
  createOpsCampaign,
  createOpsPlanTask,
  deleteOpsPlan,
  deleteOpsPlanTask,
  ensureOpsPlan,
  executeOpsPlanTask,
  fetchOpsCampaigns,
  fetchOpsTargetLists,
  fetchOpsPlanTasks,
  updateOpsCampaign,
  updateOpsPlanTask,
} from "../api/adminOpsPlanApi";

export function useOpsCampaigns(status?: string) {
  return useQuery({
    queryKey: [...opsPlanKeys.campaigns(), status ?? null],
    queryFn: () => fetchOpsCampaigns(status ? { status } : undefined),
    staleTime: 10_000,
  });
}

export function useCreateOpsCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createOpsCampaign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: opsPlanKeys.campaigns() });
    },
  });
}

export function useUpdateOpsCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { campaignId: number; patch: Parameters<typeof updateOpsCampaign>[1] }) =>
      updateOpsCampaign(args.campaignId, args.patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: opsPlanKeys.campaigns() });
    },
  });
}

export function useEnsureOpsPlan(campaignId: number | null, planDate: string) {
  return useQuery({
    queryKey: campaignId ? opsPlanKeys.plan(campaignId, planDate) : ["admin", "ops-plan", "plan", null, planDate],
    queryFn: () => ensureOpsPlan({ campaign_id: campaignId as number, plan_date: planDate }),
    enabled: Boolean(campaignId) && Boolean(planDate),
    staleTime: 5_000,
  });
}

export function useDeleteOpsPlan(campaignId: number | null, planDate: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (planId: number) => {
      await deleteOpsPlan(planId);
    },
    onSuccess: (_, planId) => {
      if (campaignId) {
        qc.removeQueries({ queryKey: opsPlanKeys.plan(campaignId, planDate) });
      } else {
        qc.removeQueries({ queryKey: ["admin", "ops-plan", "plan"], exact: false });
      }
      qc.removeQueries({ queryKey: opsPlanKeys.tasks(planId) });
      qc.invalidateQueries({ queryKey: opsPlanKeys.campaigns() });
    },
  });
}

export function useOpsPlanTasks(planId: number | null) {
  return useQuery({
    queryKey: planId ? opsPlanKeys.tasks(planId) : ["admin", "ops-plan", "tasks", null],
    queryFn: () => fetchOpsPlanTasks(planId as number),
    enabled: Boolean(planId),
    staleTime: 2_000,
  });
}

export function useCreateOpsPlanTask(planId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Parameters<typeof createOpsPlanTask>[1]) => {
      if (!planId) throw new Error("planId is required");
      return createOpsPlanTask(planId, payload);
    },
    onSuccess: () => {
      if (planId) {
        qc.invalidateQueries({ queryKey: opsPlanKeys.tasks(planId) });
      } else {
        qc.invalidateQueries({ queryKey: ["admin", "ops-plan", "tasks"], exact: false });
      }
    },
  });
}

export function useUpdateOpsPlanTask(planId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { taskId: number; patch: Parameters<typeof updateOpsPlanTask>[1] }) =>
      updateOpsPlanTask(args.taskId, args.patch),
    onSuccess: () => {
      if (planId) {
        qc.invalidateQueries({ queryKey: opsPlanKeys.tasks(planId) });
      } else {
        qc.invalidateQueries({ queryKey: ["admin", "ops-plan", "tasks"], exact: false });
      }
    },
  });
}

export function useExecuteOpsPlanTask(planId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { taskId: number; status?: string }) => executeOpsPlanTask(args.taskId, { status: args.status }),
    onSuccess: () => {
      if (planId) {
        qc.invalidateQueries({ queryKey: opsPlanKeys.tasks(planId) });
      } else {
        qc.invalidateQueries({ queryKey: ["admin", "ops-plan", "tasks"], exact: false });
      }
    },
  });
}

export function useDeleteOpsPlanTask(planId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: number) => {
      await deleteOpsPlanTask(taskId);
    },
    onSuccess: () => {
      if (planId) {
        qc.invalidateQueries({ queryKey: opsPlanKeys.tasks(planId) });
      } else {
        qc.invalidateQueries({ queryKey: ["admin", "ops-plan", "tasks"], exact: false });
      }
    },
  });
}

export function useOpsTargetLists(planId: number | null) {
  return useQuery({
    queryKey: planId ? ["admin", "ops-plan", "target-lists", planId] : ["admin", "ops-plan", "target-lists", null],
    queryFn: () => fetchOpsTargetLists(planId as number),
    enabled: Boolean(planId),
    staleTime: 5_000,
  });
}

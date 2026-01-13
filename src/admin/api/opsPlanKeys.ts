export const opsPlanKeys = {
  campaigns: () => ["admin", "ops-plan", "campaigns"] as const,
  plan: (campaignId: number, planDate: string) => ["admin", "ops-plan", "plan", campaignId, planDate] as const,
  tasks: (planId: number) => ["admin", "ops-plan", "tasks", planId] as const,
};

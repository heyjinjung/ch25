import { z } from "zod";

import { rewardTypeEnum } from "./enums";

export const levelRewardSchema = z.object({
  level: z.number().int(),
  reward_type: rewardTypeEnum,
  reward_payload: z.record(z.unknown()).nullable().optional(),
  auto_granted: z.boolean(),
  granted_at: z.string(),
});

export const levelStatusResponseSchema = z.object({
  current_level: z.number().int(),
  current_level_point: z.number().int(),
  next_level: z.number().int().nullable().optional(),
  next_required_point: z.number().int().nullable().optional(),
  point_to_next: z.number().int().nullable().optional(),
  rewards: z.array(levelRewardSchema),
});

export type LevelReward = z.infer<typeof levelRewardSchema>;
export type LevelStatusResponse = z.infer<typeof levelStatusResponseSchema>;

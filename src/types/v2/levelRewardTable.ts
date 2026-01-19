import { z } from "zod";

import { rewardTypeEnum } from "./enums";

export const levelRewardRowSchema = z.object({
  level: z.number().int(),
  required_xp: z.number().int(),
  reward_type: rewardTypeEnum,
  reward_amount: z.number().int(),
  reward_payload: z.record(z.unknown()).nullable().optional(),
});

export const levelRewardTableResponseSchema = z.object({
  rows: z.array(levelRewardRowSchema),
});

export type LevelRewardRow = z.infer<typeof levelRewardRowSchema>;
export type LevelRewardTableResponse = z.infer<
  typeof levelRewardTableResponseSchema
>;

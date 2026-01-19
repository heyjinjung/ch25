import { z } from "zod";

export const opsExecutionErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.string().optional().nullable(),
});

export const opsExecutionEnvelopeSchema = z.object({
  kind: z.enum([
    "INVENTORY_GRANT_ALL",
    "TARGETED_ITEM_GRANT",
    "TARGETLIST_BROADCAST",
    "GOLDEN_HOUR",
    "MESSAGE_TEMPLATE",
    "SURVEY_DM",
  ]),
  timestamp: z.number().int(),
  worker_id: z.string().optional().nullable(),
  execution_error: opsExecutionErrorSchema.optional().nullable(),
});

export const opsGrantedItemSchema = z.object({
  item_type: z.string(),
  amount: z.number().int(),
});

export const opsInventoryGrantAllSchema = opsExecutionEnvelopeSchema.extend({
  kind: z.literal("INVENTORY_GRANT_ALL"),
  reason: z.string(),
  items: z.array(opsGrantedItemSchema),
  target: z.literal("ALL_USERS"),
  granted_users: z.number().int(),
  async_task_id: z.string().optional().nullable(),
});

export const opsTargetedItemGrantSchema = opsExecutionEnvelopeSchema.extend({
  kind: z.literal("TARGETED_ITEM_GRANT"),
  granted_users: z.number().int(),
  items: z.array(opsGrantedItemSchema),
});

export const opsGoldenHourResultSchema = opsExecutionEnvelopeSchema.extend({
  kind: z.literal("GOLDEN_HOUR"),
  action: z.string(),
  multiplier: z.number(),
  enabled: z.boolean(),
  manual_override: z.string().optional().nullable(),
  propagated_to_redis: z.boolean(),
});

export const opsExecutionResultRecordSchema = z.object({
  id: z.number().int(),
  task_id: z.number().int(),
  kind: z.string(),
  payload_json: z.record(z.unknown()),
});

export type OpsExecutionError = z.infer<typeof opsExecutionErrorSchema>;
export type OpsExecutionEnvelope = z.infer<typeof opsExecutionEnvelopeSchema>;
export type OpsGrantedItem = z.infer<typeof opsGrantedItemSchema>;
export type OpsInventoryGrantAll = z.infer<typeof opsInventoryGrantAllSchema>;
export type OpsTargetedItemGrant = z.infer<typeof opsTargetedItemGrantSchema>;
export type OpsGoldenHourResult = z.infer<typeof opsGoldenHourResultSchema>;
export type OpsExecutionResultRecord = z.infer<
  typeof opsExecutionResultRecordSchema
>;

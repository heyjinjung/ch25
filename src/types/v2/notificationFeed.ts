import { z } from "zod";

import { gameTypeEnum } from "./enums";

export const feedTypeEnum = z.enum([
  "JACKPOT_WIN",
  "GUERRILLA_DROP",
  "SYSTEM_NOTICE",
  "USER_ASSET_UPDATE",
]);

export const jackpotWinPayloadSchema = z.object({
  nickname: z.string(),
  game_type: gameTypeEnum,
  reward_amount: z.number().int(),
  is_mega: z.boolean(),
});

export const guerrillaDropPayloadSchema = z.object({
  game_type: gameTypeEnum,
  event_name: z.string(),
  multiplier: z.number(),
  duration_sec: z.number().int(),
  message: z.string(),
});

export const systemNoticePayloadSchema = z.object({
  severity: z.string(),
  title: z.string(),
  content: z.string(),
  link_url: z.string().nullable().optional(),
});

export const userAssetUpdatePayloadSchema = z.object({
  asset_type: z.string(),
  delta: z.number().int(),
  current_balance: z.number().int(),
  reason: z.string(),
});

export const feedEnvelopeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("JACKPOT_WIN"),
    timestamp: z.number().int(),
    id: z.string(),
    payload: jackpotWinPayloadSchema,
  }),
  z.object({
    type: z.literal("GUERRILLA_DROP"),
    timestamp: z.number().int(),
    id: z.string(),
    payload: guerrillaDropPayloadSchema,
  }),
  z.object({
    type: z.literal("SYSTEM_NOTICE"),
    timestamp: z.number().int(),
    id: z.string(),
    payload: systemNoticePayloadSchema,
  }),
  z.object({
    type: z.literal("USER_ASSET_UPDATE"),
    timestamp: z.number().int(),
    id: z.string(),
    payload: userAssetUpdatePayloadSchema,
  }),
]);

export type FeedEnvelope = z.infer<typeof feedEnvelopeSchema>;
export type JackpotWinPayload = z.infer<typeof jackpotWinPayloadSchema>;
export type GuerrillaDropPayload = z.infer<typeof guerrillaDropPayloadSchema>;
export type SystemNoticePayload = z.infer<typeof systemNoticePayloadSchema>;
export type UserAssetUpdatePayload = z.infer<
  typeof userAssetUpdatePayloadSchema
>;

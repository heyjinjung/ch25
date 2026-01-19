import { z } from "zod";

export const shopOrderSchema = z.object({
  user_id: z.number().int(),
  sku: z.string(),
  name: z.string(),
  cost_type: z.literal("VAULT"),
  cost_amount: z.number().int().min(0),
  reward_type: z.string(),
  reward_amount: z.number().int().min(0),
});

export const shopOrderResponseSchema = shopOrderSchema.extend({
  id: z.number().int(),
  created_at: z.string().datetime(),
});

export const exchangeLogSchema = z.object({
  user_id: z.number().int(),
  input_type: z.string(),
  input_amount: z.number().int().min(0),
  output_type: z.string(),
  output_amount: z.number().int().min(0),
});

export const exchangeLogResponseSchema = exchangeLogSchema.extend({
  id: z.number().int(),
  created_at: z.string().datetime(),
});

export type ShopOrder = z.infer<typeof shopOrderSchema>;
export type ShopOrderResponse = z.infer<typeof shopOrderResponseSchema>;
export type ExchangeLog = z.infer<typeof exchangeLogSchema>;
export type ExchangeLogResponse = z.infer<typeof exchangeLogResponseSchema>;

import { z } from "zod";

import { ticketTypeEnum } from "./enums";

export const ticketConversionPolicySchema = z.object({
  target_ticket_type: ticketTypeEnum,
  ratio_numerator: z.literal(1),
  ratio_denominator: z.literal(1),
  is_active: z.boolean().default(true),
});

export const ticketConversionPolicyResponseSchema =
  ticketConversionPolicySchema.extend({
    id: z.number().int(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  });

export type TicketConversionPolicy = z.infer<
  typeof ticketConversionPolicySchema
>;
export type TicketConversionPolicyResponse = z.infer<
  typeof ticketConversionPolicyResponseSchema
>;

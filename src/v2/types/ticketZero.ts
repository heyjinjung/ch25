import { z } from "zod";

import { ticketTypeEnum } from "./enums";

export const ticketZeroLogSchema = z.object({
  user_id: z.number().int(),
  ticket_type: ticketTypeEnum.default("ROULETTE_TICKET"),
  ticket_amount: z.number().int().min(1).default(1),
  reason: z.literal("BAILOUT_GRANT"),
  granted_at: z.string().datetime(),
});

export const ticketZeroLogResponseSchema = ticketZeroLogSchema.extend({
  id: z.number().int(),
  created_at: z.string().datetime(),
});

export type TicketZeroLog = z.infer<typeof ticketZeroLogSchema>;
export type TicketZeroLogResponse = z.infer<typeof ticketZeroLogResponseSchema>;

// src/hooks/useV2TicketZero.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getV2TicketZeroStatus,
  requestV2TicketZeroBailout,
} from "../api/ticketZeroApi";

// ============================================================================
// Ticket Zero (Bailout) Hooks
// ============================================================================

export function useV2TicketZeroStatus() {
  return useQuery({
    queryKey: ["v2", "ticket-zero", "status"],
    queryFn: () => getV2TicketZeroStatus(),
    staleTime: 5000, // 5 seconds
  });
}

export function useV2TicketZeroBailout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => requestV2TicketZeroBailout(),
    onSuccess: () => {
      // Invalidate ticket zero status (cooldown updated)
      queryClient.invalidateQueries({ queryKey: ["v2", "ticket-zero", "status"] });
      // Invalidate inventory/wallet (ticket granted)
      queryClient.invalidateQueries({ queryKey: ["v2", "inventory"] });
    },
  });
}

// src/v2/hooks/useV2Inbox.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getV2Inbox,
  markV2InboxRead,
  type MarkInboxReadRequest,
} from "../api/inboxApi";

// ============================================================================
// Inbox Hooks
// ============================================================================

export function useV2Inbox() {
  return useQuery({
    queryKey: ["v2", "inbox"],
    queryFn: () => getV2Inbox(),
    staleTime: 30000, // 30 seconds
  });
}

export function useV2MarkInboxRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: MarkInboxReadRequest) => markV2InboxRead(request),
    onSuccess: () => {
      // Invalidate inbox queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["v2", "inbox"] });
    },
  });
}

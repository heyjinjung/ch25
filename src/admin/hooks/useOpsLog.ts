// src/admin/hooks/useOpsLog.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { opsLogKeys, OpsLogListFilters } from "../api/opsLogKeys";
import {
  createOpsLogEntryWithOptions,
  fetchOpsLogEntries,
  CreateOpsLogEntryOptions,
  fetchOpsDailyLog,
  upsertOpsDailyLog,
  OpsDailyLog,
  OpsDailyLogUpsert,
  OpsLogCreate,
  OpsLogEntry,
} from "../api/adminOpsLogApi";

export type CreateOpsLogEntryRequest = {
  payload: OpsLogCreate;
  options?: CreateOpsLogEntryOptions;
};

export function useOpsLogList(date: string, filters?: OpsLogListFilters) {
  return useQuery({
    queryKey: opsLogKeys.list(date, filters),
    queryFn: () => fetchOpsLogEntries({ date, ...filters }),
    enabled: Boolean(date),
    staleTime: 5_000,
  });
}

export function useOpsDailyLog(date: string) {
  return useQuery({
    queryKey: ["opsDailyLog", date],
    queryFn: () => fetchOpsDailyLog(date),
    enabled: Boolean(date),
    staleTime: 5_000,
  });
}

export function useUpsertOpsDailyLog(date: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: OpsDailyLogUpsert) => upsertOpsDailyLog(date, payload),
    onSuccess: (saved: OpsDailyLog) => {
      queryClient.setQueryData(["opsDailyLog", date], saved);
    },
  });
}

export function useCreateOpsLogEntry(dateForListUpdate?: string, filtersForListUpdate?: OpsLogListFilters) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: CreateOpsLogEntryRequest) => createOpsLogEntryWithOptions(req.payload, req.options),
    onMutate: async (req) => {
      const payload = req.payload;
      const shouldUpdateList = (() => {
        if (!filtersForListUpdate) return true;
        if (filtersForListUpdate.category && payload.category !== filtersForListUpdate.category) return false;
        if (filtersForListUpdate.action_code && payload.action_code !== filtersForListUpdate.action_code) return false;
        // actor_id ?ÑÌÑ∞???ùÏÑ± ?úÏ†ê???ïÏ†ï Î∂àÍ?(?úÎ≤Ñ?êÏÑú Ï±ÑÏ?) ???àÏ†Ñ?òÍ≤å Í∞±Ïã† ?ùÎûµ
        if (filtersForListUpdate.actor_id != null) return false;
        return true;
      })();
      if (!shouldUpdateList) return undefined;

      const date = dateForListUpdate ?? payload.date;
      const key = opsLogKeys.list(date, filtersForListUpdate);

      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<OpsLogEntry[] | undefined>(key);

      const refId = payload.ref_id ?? `OPT-${date}-${Date.now()}`;
      const optimisticId = -Date.now();

      const optimistic: OpsLogEntry = {
        id: optimisticId,
        daily_log_date: date,
        timestamp: new Date().toISOString(),
        category: payload.category,
        action_code: payload.action_code,
        target_model: payload.target_model,
        target_id: payload.target_id,
        meta_data: payload.meta_data ?? {},
        is_automated: Boolean(payload.is_automated),
        actor_id: 0,
        ref_id: refId,
      };

      queryClient.setQueryData<OpsLogEntry[] | undefined>(key, (prev) => {
        const prevList = prev ?? [];
        return [optimistic, ...prevList].slice(0, 200);
      });

      return { key, previous, optimisticId, refId, date };
    },
    onError: (_err, _req, ctx) => {
      if (!ctx) return;
      queryClient.setQueryData<OpsLogEntry[] | undefined>(ctx.key, ctx.previous);
    },
    onSuccess: (created, _req, ctx) => {
      if (!ctx) return;
      const date = ctx?.date ?? dateForListUpdate ?? created.daily_log_date;
      const key = ctx?.key ?? opsLogKeys.list(date, filtersForListUpdate);

      queryClient.setQueryData<OpsLogEntry[] | undefined>(key, (prev) => {
        const prevList = prev ?? [];

        // Remove optimistic placeholder (by id or ref_id)
        const cleaned = prevList.filter((x) => {
          if (ctx?.optimisticId != null && x.id === ctx.optimisticId) return false;
          if (ctx?.refId && x.ref_id && x.ref_id === ctx.refId) return false;
          return true;
        });

        // De-dupe by id (idempotent ref_id may return existing)
        if (cleaned.some((x) => x.id === created.id)) return cleaned;
        return [created, ...cleaned].slice(0, 200);
      });
    },
  });
}

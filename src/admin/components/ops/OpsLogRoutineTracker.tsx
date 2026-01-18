import React from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, RotateCw } from "lucide-react";
import { fetchOpsLogEntries } from "../../api/adminOpsLogApi";
import { OpsLogCategory } from "../../api/opsLogKeys";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const OpsLogRoutineTracker: React.FC = () => {
  const today = dayjs().format("YYYY-MM-DD");
  // Fetch recent routine logs
  const { data: routineLogs } = useQuery({
    queryKey: ["admin", "ops-logs", "routine", today],
    queryFn: () => fetchOpsLogEntries({
      date: today,
      category: OpsLogCategory.ROUTINE,
      limit: 5 // Get last 5 routines for today
    }),
  });

  return (
    <div className="admin-card-premium p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-admin-border pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-admin-brand/20 text-admin-brand">
            <RotateCw className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-admin-text-primary uppercase tracking-wider">루틴 점검</h3>
        </div>
      </div>

      <div className="space-y-2">
        {!routineLogs || routineLogs.length === 0 ? (
          <div className="text-xs text-admin-text-muted text-center py-4">
            오늘 기록된 루틴 점검이 없습니다.
          </div>
        ) : (
          routineLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-2 rounded bg-admin-sidebar border border-admin-border/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-admin-success" />
                <span className="text-xs font-medium text-admin-text-secondary">{log.action_code}</span>
              </div>
              <span className="text-[10px] font-mono text-admin-text-muted">
                {dayjs(log.timestamp).fromNow()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OpsLogRoutineTracker;

import { InterventionLogDto } from "../../../api/adminApi";

interface InterventionLogTableProps {
  logs: InterventionLogDto[];
  isLoading?: boolean;
}

export const InterventionLogTable = ({
  logs,
  isLoading,
}: InterventionLogTableProps) => {
  const getTriggerBadgeColor = (triggerId: string) => {
    if (triggerId.includes("LOSE")) return "bg-red-500/20 text-red-400";
    if (triggerId.includes("BAL_DROP"))
      return "bg-orange-500/20 text-orange-400";
    if (triggerId.includes("ZERO")) return "bg-purple-500/20 text-purple-400";
    return "bg-gray-500/20 text-gray-400";
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatCooldown = (cooldownExpiresAt: string | null) => {
    if (!cooldownExpiresAt) return "-";

    const now = new Date();
    const expiry = new Date(cooldownExpiresAt);

    if (expiry < now) {
      return "만료됨";
    }

    const diffMs = expiry.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `${diffHours}시간 ${diffMins % 60}분 남음`;
    }
    return `${diffMins}분 남음`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        인터벤션 로그가 없습니다
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-700/50">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/50 border-b border-gray-700/50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                발생 시각
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                트리거 ID
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                트리거 조건
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                실행 액션
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                이전 잔액
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">
                세션 변화
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                최근 결과
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">
                쿨다운
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {logs.map((log) => (
              <tr
                key={log.id}
                className="hover:bg-gray-800/30 transition-colors"
              >
                <td className="px-3 py-3 text-xs text-gray-300">
                  {formatTimestamp(log.createdAt)}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTriggerBadgeColor(
                      log.triggerId,
                    )}`}
                  >
                    {log.triggerId}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-gray-400 max-w-xs truncate">
                  {log.triggerCondition || "-"}
                </td>
                <td className="px-3 py-3">
                  <span className="text-xs font-semibold text-amber-400">
                    {log.actionTaken}
                  </span>
                </td>
                <td className="px-3 py-3 text-right text-xs text-gray-300 font-mono">
                  {log.userBalanceBefore
                    ? log.userBalanceBefore.toLocaleString()
                    : "-"}
                </td>
                <td
                  className={`px-3 py-3 text-right text-xs font-mono ${
                    log.sessionBalanceDelta
                      ? log.sessionBalanceDelta < 0
                        ? "text-red-400"
                        : "text-emerald-400"
                      : "text-gray-500"
                  }`}
                >
                  {log.sessionBalanceDelta
                    ? `${log.sessionBalanceDelta > 0 ? "+" : ""}${log.sessionBalanceDelta.toLocaleString()}`
                    : "-"}
                </td>
                <td className="px-3 py-3 text-xs text-gray-400 font-mono">
                  {log.recentResults || "-"}
                </td>
                <td className="px-3 py-3 text-xs text-gray-500">
                  {formatCooldown(log.cooldownExpiresAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

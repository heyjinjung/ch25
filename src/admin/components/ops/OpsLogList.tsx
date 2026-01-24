import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchOpsLogEntries
} from "../../api/adminOpsLogApi";
import { OpsLogCategory } from "../../api/opsLogKeys";
import {
  Search,
  Filter,
  RefreshCw,
  Clock,
  Tag,
  FileJson
} from "lucide-react";
import dayjs from "dayjs";

const OpsLogList: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedCategory, setSelectedCategory] = useState<OpsLogCategory | "">("");
  const [actionFilter, setActionFilter] = useState("");

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["admin", "ops-logs", selectedDate, selectedCategory, actionFilter],
    queryFn: () => fetchOpsLogEntries({
      date: selectedDate,
      category: selectedCategory || undefined,
      action_code: actionFilter || undefined
    }),
  });

  const categoryColors: Record<string, string> = {
    [OpsLogCategory.GAME_PLAY]: "text-admin-brand bg-admin-brand/10 border-admin-brand/20",
    [OpsLogCategory.ECONOMY]: "text-admin-accent bg-admin-accent/10 border-admin-accent/20",
    [OpsLogCategory.SECURITY]: "text-admin-danger bg-admin-danger/10 border-admin-danger/20",
    [OpsLogCategory.SYSTEM]: "text-admin-text-secondary bg-admin-text-secondary/10 border-admin-text-secondary/20",
    [OpsLogCategory.USER_MANAGEMENT]: "text-admin-warning bg-admin-warning/10 border-admin-warning/20",
  };

  return (
    <div className="admin-card-premium h-full flex flex-col">
      {/* Header & Filters */}
      <div className="p-6 border-b border-admin-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-admin-sidebar border border-admin-border">
              <FileJson className="h-5 w-5 text-admin-brand" />
            </div>
            <h2 className="text-admin-subtitle text-admin-text-primary">?�영 로그</h2>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded-lg hover:bg-admin-hover text-admin-text-secondary transition-colors"
            aria-label="로그 ?�로고침"
            title="로그 ?�로고침"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-admin-sidebar border border-admin-border rounded-lg flex-1 min-w-[200px]">
            <Clock className="h-4 w-4 text-admin-text-muted" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-sm text-admin-text-primary focus:ring-0 p-0 w-full"
              aria-label="조회 ?�짜"
              title="조회 ?�짜"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-admin-sidebar border border-admin-border rounded-lg flex-1 min-w-[200px]">
            <Filter className="h-4 w-4 text-admin-text-muted" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as OpsLogCategory)}
              className="bg-admin-input border border-admin-border text-sm text-admin-text-primary focus:ring-0 p-0 w-full rounded-md px-2 py-1"
              aria-label="카테고리 ?�택"
              title="카테고리 ?�택"
            >
              <option value="">?�체 분류</option>
              {Object.values(OpsLogCategory).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-admin-sidebar border border-admin-border rounded-lg flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-admin-text-muted" />
            <input
              type="text"
              placeholder="?�션 코드�??�터"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-transparent border-none text-sm text-admin-text-primary focus:ring-0 p-0 w-full placeholder:text-admin-text-muted"
              aria-label="?�션 코드 ?�터"
              title="?�션 코드 ?�터"
            />
          </div>
        </div>
      </div>

      {/* Log List */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-admin-bg/90 backdrop-blur-sm z-10 border-b border-admin-border">
            <tr>
              <th className="p-4 text-xs font-bold text-admin-text-secondary uppercase">?�간</th>
              <th className="p-4 text-xs font-bold text-admin-text-secondary uppercase">분류</th>
              <th className="p-4 text-xs font-bold text-admin-text-secondary uppercase">?�션</th>
              <th className="p-4 text-xs font-bold text-admin-text-secondary uppercase">?��?/th>
              <th className="p-4 text-xs font-bold text-admin-text-secondary uppercase">메�?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border/50">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="p-4"><div className="h-4 w-16 bg-admin-sidebar rounded"></div></td>
                  <td className="p-4"><div className="h-6 w-24 bg-admin-sidebar rounded-full"></div></td>
                  <td className="p-4"><div className="h-4 w-32 bg-admin-sidebar rounded"></div></td>
                  <td className="p-4"><div className="h-4 w-20 bg-admin-sidebar rounded"></div></td>
                  <td className="p-4"><div className="h-4 w-full bg-admin-sidebar rounded"></div></td>
                </tr>
              ))
            ) : !logs || logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-admin-text-muted">
                  ?�택??조건???�당?�는 로그가 ?�습?�다.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="group hover:bg-admin-hover transition-colors">
                  <td className="p-4 text-xs text-admin-text-muted font-mono whitespace-nowrap">
                    {dayjs(log.timestamp).format("HH:mm:ss")}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${categoryColors[log.category] || "text-admin-text-muted bg-admin-sidebar border-admin-border"}`}>
                      {log.category}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-bold text-admin-text-primary">
                    {log.action_code}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-xs text-admin-text-secondary">
                      <Tag className="h-3 w-3" />
                      <span className="font-mono">{log.target_model}:{log.target_id || "-"}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-xs text-admin-text-secondary font-mono bg-black/20 p-2 rounded border border-admin-border/30 max-w-md overflow-hidden text-ellipsis whitespace-nowrap group-hover:whitespace-normal group-hover:break-all transition-all">
                      {JSON.stringify(log.meta_data)}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OpsLogList;

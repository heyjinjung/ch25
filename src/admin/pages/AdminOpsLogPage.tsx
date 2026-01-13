// src/admin/pages/AdminOpsLogPage.tsx
import React, { useMemo, useState } from "react";
import { Activity, ShieldAlert } from "lucide-react";
import OpsLogQuickLogger from "../components/ops/OpsLogQuickLogger";
import OpsLogRoutineTracker from "../components/ops/OpsLogRoutineTracker";
import OpsLogGoldenHourPanel from "../components/ops/OpsLogGoldenHourPanel";
import OpsLogSurveyDmPanel from "../components/ops/OpsLogSurveyDmPanel";
import OpsDailyPlanPanel from "../components/ops/OpsDailyPlanPanel";
import { OpsLogCategory } from "../api/opsLogKeys";
import { useOpsLogList } from "../hooks/useOpsLog";
import type { OpsLogEntry } from "../api/adminOpsLogApi";

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTimeHHmmss(date: Date): string {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const AdminOpsLogPage: React.FC = () => {
  const [date, setDate] = useState<string>(todayISODate());
  const [category, setCategory] = useState<OpsLogCategory | "">("");

  const filters = useMemo(() => ({ category: category || undefined }), [category]);

  const { data: logs, isLoading, error } = useOpsLogList(date, filters);

  return (
    <section className="admin-page-container">
      <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 border-b border-admin-border pb-6 pt-4">
        <div>
          <h1 className="text-3xl font-bold text-admin-text-base tracking-tight uppercase">
            운영 기록 감시 <span className="text-admin-brand/40">Ops Log</span>
          </h1>
          <p className="mt-1.5 text-xs font-bold text-admin-text-muted flex items-center gap-2">
            <Activity size={12} className="text-admin-brand" />
            리스크 운영, 지급 관리, 이슈 발생 내역을 실시간으로 추적하고 감사 로그로 기록합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-admin-border bg-admin-sidebar px-4 py-2 shadow-inner">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-admin-text-muted uppercase tracking-widest leading-none">Status</span>
            <span className="text-xs font-bold text-admin-success">NODE_OPERATIONAL</span>
          </div>
          <div className="h-6 w-px bg-admin-border mx-2" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-admin-text-muted uppercase tracking-widest leading-none">Last Audit</span>
            <span className="text-xs font-mono font-bold text-admin-text-base">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Logging & Trackers */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <OpsDailyPlanPanel />
          <OpsLogQuickLogger variant="full" defaultDate={date} listFilters={filters} />

          <div className="grid grid-cols-1 gap-4">
            <OpsLogRoutineTracker />
            <OpsLogGoldenHourPanel date={date} listFilters={filters} />
            <OpsLogSurveyDmPanel date={date} />
          </div>
        </div>

        {/* Right Column: List & Filters */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          {/* Advanced Filter Panel */}
          <div className="group relative overflow-hidden rounded-xl border border-admin-border bg-admin-sidebar p-1 shadow-lg">
            <div className="flex flex-col md:flex-row items-center gap-1">
              <div className="flex flex-1 items-center gap-2 bg-admin-bg/50 px-4 py-3 rounded-l-lg md:rounded-l-lg border-r border-admin-border">
                <label className="text-[10px] font-bold text-admin-text-muted uppercase tracking-widest whitespace-nowrap">발생 시점</label>
                <input
                  type="date"
                  aria-label="발생 시점"
                  title="발생 시점"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold text-admin-text-base focus:ring-0 outline-none w-full"
                />
              </div>

              <div className="flex flex-1 items-center gap-2 bg-admin-bg/50 px-4 py-3 rounded-r-lg md:rounded-r-lg">
                <label className="text-[10px] font-bold text-admin-text-muted uppercase tracking-widest whitespace-nowrap">분류 필터</label>
                <select
                  aria-label="분류 필터"
                  title="분류 필터"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="bg-transparent border-none text-sm font-bold text-admin-text-base focus:ring-0 outline-none w-full appearance-none"
                >
                  <option value="">전체 내역 (ALL)</option>
                  <option value="ROUTINE">루틴 (ROUTINE)</option>
                  <option value="EVENT">이벤트 (EVENT)</option>
                  <option value="ISSUE">이슈 (ISSUE)</option>
                  <option value="PAYOUT">지급 (PAYOUT)</option>
                  <option value="SYSTEM">시스템 (SYSTEM)</option>
                  <option value="AUDIT">감사 (AUDIT)</option>
                  <option value="CS">고객지원 (CS)</option>
                  <option value="MARKETING">마케팅 (MARKETING)</option>
                  <option value="NOTIFICATION">알림 (NOTIFICATION)</option>
                  <option value="EXPERIMENT">실험 (EXPERIMENT)</option>
                  <option value="ANALYTICS">분석 (ANALYTICS)</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="m-3 flex items-center gap-3 rounded-lg border border-admin-danger/30 bg-admin-danger/10 p-3 text-xs font-bold text-admin-danger animate-pulse">
                <ShieldAlert size={14} />
                <span>조회 실패: {(error as any)?.message || "로그를 불러오지 못했습니다."}</span>
              </div>
            )}
          </div>

          {/* Result Stream */}
          <div className="admin-card-premium overflow-hidden">
            <div className="px-6 py-4 border-b border-admin-border flex items-center justify-between">
              <h2 className="text-admin-subtitle text-admin-text-primary">Ops Logs</h2>
              <span className="text-xs text-admin-text-muted">총 {(logs ?? []).length}건</span>
            </div>

            <div className="overflow-x-auto">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th className="admin-th w-[90px]">시간</th>
                    <th className="admin-th w-[120px]">분류</th>
                    <th className="admin-th">액션</th>
                    <th className="admin-th w-[140px]">타겟</th>
                    <th className="admin-th">메타</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="admin-tr">
                        <td className="admin-td text-admin-text-muted">...</td>
                        <td className="admin-td text-admin-text-muted">...</td>
                        <td className="admin-td text-admin-text-muted">불러오는 중...</td>
                        <td className="admin-td text-admin-text-muted">...</td>
                        <td className="admin-td text-admin-text-muted">...</td>
                      </tr>
                    ))
                  ) : (logs ?? []).length === 0 ? (
                    <tr className="admin-tr">
                      <td colSpan={5} className="admin-td text-center text-admin-text-muted py-10">
                        선택한 조건에 해당하는 로그가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    (logs as OpsLogEntry[]).map((log) => (
                      <tr key={log.id} className="admin-tr">
                        <td className="admin-td font-mono text-admin-text-muted whitespace-nowrap">
                          {formatTimeHHmmss(new Date(log.timestamp))}
                        </td>
                        <td className="admin-td">
                          <span className="inline-flex items-center rounded-full border border-admin-border bg-admin-sidebar px-2 py-0.5 text-[10px] font-bold text-admin-text-secondary">
                            {log.category}
                          </span>
                        </td>
                        <td className="admin-td font-semibold text-admin-text-base">{log.action_code}</td>
                        <td className="admin-td font-mono text-xs text-admin-text-secondary">
                          {log.target_model}:{log.target_id ?? "-"}
                        </td>
                        <td className="admin-td">
                          <span className="block max-w-[520px] truncate font-mono text-[11px] text-admin-text-muted" title={JSON.stringify(log.meta_data)}>
                            {JSON.stringify(log.meta_data)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminOpsLogPage;

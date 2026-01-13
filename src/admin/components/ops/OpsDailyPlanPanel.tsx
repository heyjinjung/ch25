
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Save,
  CheckCircle2,
  Layout,
  AlignLeft,
  Loader2
} from "lucide-react";
import {
  fetchOpsDailyLog,
  upsertOpsDailyLog
} from "../../api/adminOpsLogApi";


const OpsDailyPlanPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);

  // Local state for form
  const [themeTitle, setThemeTitle] = useState("");
  const [summaryMd, setSummaryMd] = useState("");
  const [status, setStatus] = useState("PLANNING");

  const { data: dailyLog, isLoading } = useQuery({
    queryKey: ["admin", "ops-daily-log", selectedDate],
    queryFn: () => fetchOpsDailyLog(selectedDate),
  });

  // Sync state when data fetches
  useEffect(() => {
    if (dailyLog) {
      setThemeTitle(dailyLog.theme_title || "");
      setSummaryMd(dailyLog.summary_md || "");
      setStatus(dailyLog.status || "PLANNING");
    } else {
      setThemeTitle("");
      setSummaryMd("");
      setStatus("PLANNING");
    }
  }, [dailyLog, selectedDate]);

  const mutation = useMutation({
    mutationFn: () => upsertOpsDailyLog(selectedDate, {
      theme_title: themeTitle,
      summary_md: summaryMd,
      status: status
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ops-daily-log", selectedDate] });
      alert("Daily Plan Saved!");
    },
    onError: (err) => {
      alert(`Error saving plan: ${err} `);
    }
  });

  return (
    <div className="admin-card-premium h-full flex flex-col">
      <div className="p-6 border-b border-admin-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-admin-brand to-admin-accent text-white">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-admin-subtitle text-admin-text-primary">Ops Daily Plan</h2>
            <p className="text-xs text-admin-text-secondary">Manage daily themes & priorities</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="ops-daily-plan-date" className="sr-only">조회 날짜</label>
          <input
            id="ops-daily-plan-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-admin-sidebar border border-admin-border rounded-lg px-3 py-1.5 text-sm text-admin-text-primary focus:ring-2 focus:ring-admin-brand/50"
            aria-label="조회 날짜"
            title="조회 날짜"
          />
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="btn-admin-primary flex items-center gap-2"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-admin-brand animate-spin" />
        </div>
      ) : (
        <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Theme Title */}
          <div className="space-y-2">
            <label className="text-admin-meta text-admin-text-secondary font-bold uppercase flex items-center gap-2">
              <Layout className="h-4 w-4" /> Daily Theme
            </label>
            <input
              type="text"
              value={themeTitle}
              onChange={(e) => setThemeTitle(e.target.value)}
              placeholder="e.g., Weekend Retention Boost"
              className="admin-input w-full text-lg font-bold"
            />
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <label className="text-admin-meta text-admin-text-secondary font-bold uppercase flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Status
            </label>
            <div className="flex gap-2">
              {["PLANNING", "ACTIVE", "REVIEW", "CLOSED"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  type="button"
                  className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${status === s
                      ? "bg-admin-brand text-white border-admin-brand"
                      : "bg-admin-sidebar text-admin-text-secondary border-admin-border hover:bg-admin-hover"
                    } `}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Summary / Notes */}
          <div className="space-y-2 flex-1 flex flex-col">
            <label className="text-admin-meta text-admin-text-secondary font-bold uppercase flex items-center gap-2">
              <AlignLeft className="h-4 w-4" /> Plan Details / Logs
            </label>
            <textarea
              value={summaryMd}
              onChange={(e) => setSummaryMd(e.target.value)}
              placeholder="- Priority Task 1..."
              className="w-full h-64 bg-admin-sidebar/50 border border-admin-border rounded-lg p-4 text-admin-text-primary focus:ring-2 focus:ring-admin-brand/50 resize-none font-mono text-sm leading-relaxed"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OpsDailyPlanPanel;

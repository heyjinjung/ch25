import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUiConfig } from "../../api/uiConfigApi";

type DowntimeWindow = {
  start_kst: string;
  end_kst: string;
  message: string;
};

type DowntimeBannerConfig = {
  enabled?: boolean;
  default_message?: string;
  windows?: DowntimeWindow[];
};

const parseIsoDate = (value: unknown): Date | null => {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const DowntimeBanner: React.FC = () => {
  const ui = useQuery({
    queryKey: ["ui-config", "downtime_banner"],
    queryFn: () => getUiConfig("downtime_banner"),
    staleTime: 0,
    retry: false,
  });

  const activeMessage = useMemo(() => {
    const value = ui.data?.value ?? null;
    if (!value || typeof value !== "object") return null;

    const v = value as DowntimeBannerConfig;
    if (v.enabled === false) return null;

    const windows = Array.isArray(v.windows) ? v.windows : [];
    const now = Date.now();

    for (const w of windows) {
      if (!w || typeof w !== "object") continue;
      const start = parseIsoDate((w as DowntimeWindow).start_kst);
      const end = parseIsoDate((w as DowntimeWindow).end_kst);
      const message = (w as DowntimeWindow).message;
      if (!start || !end) continue;
      if (typeof message !== "string" || !message) continue;
      if (start.getTime() <= now && now < end.getTime()) return message;
    }

    return null;
  }, [ui.data]);

  if (!activeMessage) return null;

  return (
    <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 shadow-md shadow-amber-900/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Notice</p>
          <p className="text-sm font-semibold text-amber-50">점검 안내</p>
          <p className="text-xs text-amber-100/90">{activeMessage}</p>
        </div>
      </div>
    </div>
  );
};

export default DowntimeBanner;

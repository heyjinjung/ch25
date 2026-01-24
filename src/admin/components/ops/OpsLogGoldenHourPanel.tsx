import React, { useMemo, useState } from "react";
import { Power, Save, Zap } from "lucide-react";
import { useToast } from "../../../components/common/ToastProvider";
import { OpsLogCreate } from "../../api/adminOpsLogApi";
import { OpsLogListFilters } from "../../api/opsLogKeys";
import { useCreateOpsLogEntry } from "../../hooks/useOpsLog";
import { findPiiHits } from "../../utils/piiGuard";

function shortRefId(date: string, prefix: string): string {
  const compact = date.split("-").join("");
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `${prefix}-${compact}-${rand}`;
}

export type OpsLogGoldenHourPanelProps = {
  date: string;
  listFilters?: OpsLogListFilters;
  isExpanded?: boolean;
};

const OpsLogGoldenHourPanel: React.FC<OpsLogGoldenHourPanelProps> = ({ date, listFilters }) => {
  const { addToast } = useToast();
  const createMutation = useCreateOpsLogEntry(date, listFilters);

  const [multiplier, setMultiplier] = useState<string>("2");
  const [note, setNote] = useState<string>("");

  const togglePayload = useMemo(
    () =>
      (enabled: boolean): OpsLogCreate => ({
        date,
        category: "SYSTEM",
        action_code: "SYS_GOLDEN_HOUR_TOGGLE",
        target_model: "SYSTEM",
        target_id: undefined,
        meta_data: {
          enabled,
          note: note.trim() || undefined,
        },
        ref_id: shortRefId(date, enabled ? "SYS-GH-ON" : "SYS-GH-OFF"),
      }),
    [date, note]
  );

  const multiplierPayload = useMemo<OpsLogCreate>(() => {
    const n = Number(multiplier);
    return {
      date,
      category: "SYSTEM",
      action_code: "SYS_GOLDEN_HOUR_MULTIPLIER_SET",
      target_model: "SYSTEM",
      target_id: undefined,
      meta_data: {
        multiplier: Number.isFinite(n) ? n : multiplier,
        note: note.trim() || undefined,
      },
      ref_id: shortRefId(date, "SYS-GH-MULT"),
    };
  }, [date, multiplier, note]);

  async function submit(payload: OpsLogCreate, successMsg: string) {
    const piiHits = findPiiHits(JSON.stringify(payload.meta_data ?? {}));
    if (piiHits.length > 0) {
      addToast(`PII ?�심 ?�턴 감�?(${piiHits[0].type}): 기록차단`, "error");
      return;
    }
    try {
      const created = await createMutation.mutateAsync({ payload });
      addToast(`${successMsg}: #${created.id}`, "success");
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "기록 ?�패", "error");
    }
  }

  return (
    <div className="admin-card-premium p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-admin-border pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-admin-warning/20 text-admin-warning border border-admin-warning/30">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div>
            <h3 className="text-admin-subtitle text-admin-text-primary uppercase tracking-widest">골든 ?�워 ?�어</h3>
            <p className="mt-0.5 text-xs text-admin-text-secondary">골든 ?�워 ?�태 �?배수 ?�시�??�어</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* On/Off Controls */}
        <div className="space-y-4 p-4 rounded-xl bg-admin-sidebar/50 border border-admin-border">
          <label className="text-xs font-bold text-admin-text-secondary uppercase tracking-wider block mb-2">
            ?�스???�태
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!date || createMutation.isPending}
              onClick={() => submit(togglePayload(true), "골든 ?�워 ON 기록")}
              className="btn-admin-primary bg-admin-accent/20 border-admin-accent/40 text-admin-accent hover:bg-admin-accent hover:text-white flex flex-col items-center justify-center gap-2 py-4 h-full"
            >
              <Power className="h-6 w-6" />
              <span>?�성??(ON)</span>
            </button>
            <button
              type="button"
              disabled={!date || createMutation.isPending}
              onClick={() => submit(togglePayload(false), "골든 ?�워 OFF 기록")}
              className="btn-admin-primary bg-admin-danger/20 border-admin-danger/40 text-admin-danger hover:bg-admin-danger hover:text-white flex flex-col items-center justify-center gap-2 py-4 h-full"
            >
              <Power className="h-6 w-6" />
              <span>비활?�화 (OFF)</span>
            </button>
          </div>
        </div>

        {/* Multiplier Controls */}
        <div className="space-y-4 p-4 rounded-xl bg-admin-sidebar/50 border border-admin-border">
          <div className="flex flex-col gap-4 h-full justify-between">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label
                  htmlFor="ops-log-golden-hour-multiplier"
                  className="text-xs font-bold text-admin-text-secondary uppercase tracking-wider block mb-1"
                >
                  배수
                </label>
                <input
                  id="ops-log-golden-hour-multiplier"
                  type="text"
                  value={multiplier}
                  onChange={(e) => setMultiplier(e.target.value)}
                  inputMode="decimal"
                  className="admin-input text-center text-xl font-black text-admin-brand"
                  aria-label="골든?�워 배수"
                  title="골든?�워 배수"
                />
              </div>
              <div className="col-span-2 flex items-end">
                <button
                  type="button"
                  disabled={!date || createMutation.isPending}
                  onClick={() => {
                    const n = Number(multiplier);
                    if (!Number.isFinite(n) || n <= 0) {
                      addToast("배수??0보다 ???�자?�야 ?�니??", "error");
                      return;
                    }
                    submit(multiplierPayload, "골든 ?�워 배수 기록");
                  }}
                  className="btn-admin-primary w-full flex items-center justify-center gap-2 h-11"
                >
                  <Save size={16} />
                  <span>배수 ?�데?�트</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-admin-text-secondary uppercase tracking-wider block">
                ?�영 메모
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="마�???캠페?? 공�??�항 관??메모..."
                className="admin-input w-full text-xs"
                aria-label="?�영 메모"
                title="?�영 메모"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpsLogGoldenHourPanel;

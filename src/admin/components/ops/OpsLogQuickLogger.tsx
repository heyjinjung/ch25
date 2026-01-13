// src/admin/components/ops/OpsLogQuickLogger.tsx
import React, { useMemo, useState } from "react";
import { Activity, Save, ShieldAlert } from "lucide-react";
import { useToast } from "../../../components/common/ToastProvider";
import { OpsLogCategory, OpsLogListFilters, OpsLogTargetModel } from "../../api/opsLogKeys";
import { OpsLogCreate } from "../../api/adminOpsLogApi";
import { CreateOpsLogEntryRequest, useCreateOpsLogEntry } from "../../hooks/useOpsLog";
import { findPiiHits } from "../../utils/piiGuard";

const CATEGORY_OPTIONS: OpsLogCategory[] = [
  "ROUTINE",
  "EVENT",
  "ISSUE",
  "PAYOUT",
  "SYSTEM",
  "AUDIT",
  "CS",
  "MARKETING",
  "NOTIFICATION",
  "EXPERIMENT",
  "ANALYTICS",
];

const TARGET_MODEL_OPTIONS: OpsLogTargetModel[] = [
  "USER",
  "TEAM",
  "SEASON",
  "ITEM",
  "VAULT",
  "MISSION",
  "SYSTEM",
  "NONE",
];

const DEFAULT_META = { note: "" };

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function shortRefId(date: string): string {
  const compact = date.split("-").join("");
  const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `OPS-${compact}-${rand}`;
}

const CATEGORY_LABEL: Record<OpsLogCategory, string> = {
  ROUTINE: "루틴",
  EVENT: "이벤트",
  ISSUE: "이슈",
  PAYOUT: "지급",
  SYSTEM: "시스템",
  AUDIT: "감사",
  CS: "고객지원",
  MARKETING: "마케팅",
  NOTIFICATION: "알림",
  EXPERIMENT: "실험",
  ANALYTICS: "분석",
  GAME_PLAY: "게임 플레이",
  ECONOMY: "경제",
  SECURITY: "보안",
  USER_MANAGEMENT: "회원 관리",
};

const TARGET_MODEL_LABEL: Record<string, string> = {
  USER: "사용자",
  TEAM: "팀",
  SEASON: "시즌",
  ITEM: "아이템",
  VAULT: "금고",
  MISSION: "미션",
  SYSTEM: "시스템",
  NONE: "없음",
};

export type OpsLogQuickLoggerProps = {
  variant?: "compact" | "full";
  defaultDate?: string;
  listFilters?: OpsLogListFilters;
};

const OpsLogQuickLogger: React.FC<OpsLogQuickLoggerProps> = ({ variant = "full", defaultDate, listFilters }) => {
  const { addToast } = useToast();
  const isCompact = variant === "compact";

  const [date, setDate] = useState(defaultDate ?? todayISODate());
  const [category, setCategory] = useState<OpsLogCategory>("ROUTINE");
  const [actionCode, setActionCode] = useState<string>("OPS_ROUTINE_CHECKED");
  const [targetModel, setTargetModel] = useState<OpsLogTargetModel>("SYSTEM");
  const [targetId, setTargetId] = useState<string>("");
  const [refId, setRefId] = useState<string>("");
  const [metaText, setMetaText] = useState<string>(() => JSON.stringify(DEFAULT_META, null, 2));
  const [isAutomated, setIsAutomated] = useState<boolean>(false);
  const [confirmArmed, setConfirmArmed] = useState<boolean>(false);

  const isDangerous = useMemo(() => {
    if (["PAYOUT", "MARKETING", "NOTIFICATION", "SYSTEM"].includes(category)) return true;
    if (actionCode.toUpperCase().includes("GRANT") || actionCode.toUpperCase().includes("BULK")) return true;
    return false;
  }, [category, actionCode]);

  const createMutation = useCreateOpsLogEntry(date, listFilters);

  const parsedMeta = useMemo(() => {
    try {
      const parsed = JSON.parse(metaText || "{}");
      return { ok: true as const, value: parsed };
    } catch (e: any) {
      return { ok: false as const, error: e?.message ?? "Invalid JSON" };
    }
  }, [metaText]);

  const summary = useMemo(() => {
    const safeRef = (refId || "").trim() || shortRefId(date);
    return {
      date,
      category,
      action_code: actionCode.trim(),
      target_model: targetModel,
      target_id: targetId.trim() || undefined,
      ref_id: safeRef,
      is_automated: isAutomated,
    };
  }, [actionCode, category, date, isAutomated, refId, targetId, targetModel]);

  const submit = async () => {
    if (!date) {
      addToast("date???�수?�니??", "error");
      return;
    }
    if (!actionCode.trim()) {
      addToast("action_code???�수?�니??", "error");
      return;
    }
    if (!parsedMeta.ok) {
      addToast(`meta_data JSON ?�류: ${parsedMeta.error}`, "error");
      return;
    }

    const ref = (refId || "").trim() || shortRefId(date);

    const payload: OpsLogCreate = {
      date,
      category,
      action_code: actionCode.trim(),
      target_model: targetModel,
      target_id: targetId.trim() || undefined,
      meta_data: parsedMeta.value ?? {},
      ref_id: ref,
      is_automated: isAutomated,
    };

    // PII guard (client-side minimal)
    const piiHits = findPiiHits(JSON.stringify(payload.meta_data ?? {}));
    if (piiHits.length > 0) {
      addToast(`PII ?�심 ?�턴 감�?(${piiHits[0].type}): ?�??차단`, "error");
      return;
    }

    try {
      const req: CreateOpsLogEntryRequest = {
        payload,
        options: isDangerous && confirmArmed ? { confirm: true } : undefined,
      };

      const created = await createMutation.mutateAsync(req);
      addToast(`기록 ?�료: #${created.id}`, "success");
      setConfirmArmed(false);

      // Keep ref_id to encourage idempotency; but refresh to a new one for convenience
      setRefId("");
      if (!isCompact) {
        setMetaText(JSON.stringify(DEFAULT_META, null, 2));
      }
    } catch (err: any) {
      addToast(err?.response?.data?.detail || err?.message || "기록 ?�패", "error");
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-admin-border bg-admin-sidebar shadow-2xl transition-all duration-300">
      {/* Decorative Glow */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-admin-brand/5 blur-[100px] transition-opacity group-hover:opacity-100" />

      {/* Header Area */}
      <div className="relative flex items-center justify-between border-b border-admin-border bg-admin-element-bg/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-admin-brand/10 border border-admin-brand/20">
            <Save className="h-5 w-5 text-admin-brand" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-admin-text-base">
              ?�영 ??로거 <span className="text-admin-brand/50">Quick Logger</span>
            </h3>
            <p className="mt-0.5 text-[10px] font-bold text-admin-text-muted">관리자 ?�동??즉각?�인 추적 �?기록</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDangerous && (
            <div className="flex items-center gap-2 rounded-full border border-admin-danger/30 bg-admin-danger/10 px-3 py-1 text-[10px] font-bold text-admin-danger animate-pulse">
              <ShieldAlert size={12} />
              CRITICAL ACTION
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-full border border-admin-border bg-admin-bg px-3 py-1">
            <div className={`h-1.5 w-1.5 rounded-full ${createMutation.isPending ? "bg-admin-warning animate-spin" : "bg-admin-success"}`} />
            <span className="text-[10px] font-bold text-admin-text-muted uppercase tracking-widest">
              {createMutation.isPending ? "Syncing..." : "Ready"}
            </span>
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-1 gap-6 p-6">
        {/* Core Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Row 1: Date & Category */}
          <div className="space-y-4">
            <div className="group/input">
              <label className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-admin-text-muted group-focus-within/input:text-admin-brand transition-colors">
                <span>발생 ?�짜</span>
                <div className="h-px flex-1 bg-admin-border" />
              </label>
              <input
                type="date"
                aria-label="발생 ?�짜"
                title="발생 ?�짜"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setConfirmArmed(false);
                }}
                className="w-full rounded-lg border border-admin-border bg-admin-input px-4 py-2.5 text-sm font-bold text-admin-text-base transition-all focus:border-admin-brand focus:ring-1 focus:ring-admin-brand/30 outline-none appearance-none"
              />
            </div>

            <div className="group/input">
              <label className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-admin-text-muted group-focus-within/input:text-admin-brand transition-colors">
                <span>로그 분류</span>
                <div className="h-px flex-1 bg-admin-border" />
              </label>
              <select
                aria-label="로그 분류"
                title="로그 분류"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as OpsLogCategory);
                  setConfirmArmed(false);
                }}
                className="w-full rounded-lg border border-admin-border bg-admin-input px-4 py-2.5 text-sm font-bold text-admin-text-base transition-all focus:border-admin-brand focus:ring-1 focus:ring-admin-brand/30 outline-none appearance-none"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]} ({c})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Action Code & Target Model */}
          <div className="space-y-4">
            <div className="group/input">
              <label className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-admin-text-muted group-focus-within/input:text-admin-brand transition-colors">
                <span>?�동 코드</span>
                <div className="h-px flex-1 bg-admin-border" />
              </label>
              <input
                aria-label="?�동 코드"
                title="?�동 코드"
                value={actionCode}
                onChange={(e) => {
                  setActionCode(e.target.value);
                  setConfirmArmed(false);
                }}
                placeholder="OPS_ACTION_CODE"
                className="w-full rounded-lg border border-admin-border bg-admin-input px-4 py-2.5 text-sm font-mono font-bold text-admin-brand transition-all focus:border-admin-brand focus:ring-1 focus:ring-admin-brand/30 outline-none placeholder:text-admin-text-muted/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="group/input">
                <label className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-admin-text-muted group-focus-within/input:text-admin-brand transition-colors">
                  <span>?�??모델</span>
                </label>
                <select
                  aria-label="?�??모델"
                  title="?�??모델"
                  value={targetModel}
                  onChange={(e) => {
                    setTargetModel(e.target.value as OpsLogTargetModel);
                    setConfirmArmed(false);
                  }}
                  className="w-full rounded-lg border border-admin-border bg-admin-input px-4 py-2.5 text-xs font-bold text-admin-text-base transition-all focus:border-admin-brand outline-none"
                >
                  {TARGET_MODEL_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {TARGET_MODEL_LABEL[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="group/input">
                <label className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-admin-text-muted group-focus-within/input:text-admin-brand transition-colors">
                  <span>?�??ID</span>
                </label>
                <input
                  aria-label="?�??ID"
                  title="?�??ID"
                  value={targetId}
                  onChange={(e) => {
                    setTargetId(e.target.value);
                    setConfirmArmed(false);
                  }}
                  placeholder="ID"
                  className="w-full rounded-lg border border-admin-border bg-admin-input px-4 py-2.5 text-xs font-bold text-admin-text-base transition-all focus:border-admin-brand outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Ref ID & Meta Info */}
        <div className="space-y-4">
          <div className="group/input">
            <label className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-admin-text-muted group-focus-within/input:text-admin-brand transition-colors">
              <span>참조 ID (Idempotency Key)</span>
              <div className="h-px flex-1 bg-admin-border" />
            </label>
            <div className="relative">
              <input
                aria-label="참조 ID"
                title="참조 ID"
                value={refId}
                onChange={(e) => {
                  setRefId(e.target.value);
                  setConfirmArmed(false);
                }}
                placeholder="Leave blank for auto-generation"
                className="w-full rounded-lg border border-admin-border bg-admin-input pl-4 pr-12 py-2.5 text-xs font-mono text-admin-text-subtle focus:border-admin-brand outline-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-2 w-2 rounded-full bg-admin-text-muted/20" />
              </div>
            </div>
          </div>

          {!isCompact ? (
            <div className="group/input">
              <label className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-admin-text-muted group-focus-within/input:text-admin-brand transition-colors">
                <span>메타 데이터 (Payload)</span>
                <div className="h-px flex-1 bg-admin-border" />
              </label>
              <div className="relative rounded-lg border border-admin-border bg-admin-bg p-1 shadow-inner">
                <textarea
                  aria-label="메타 데이터"
                  title="메타 데이터"
                  value={metaText}
                  onChange={(e) => {
                    setMetaText(e.target.value);
                    setConfirmArmed(false);
                  }}
                  rows={isCompact ? 3 : 8}
                  className="w-full rounded-md border-none bg-transparent px-3 py-2 font-mono text-xs text-admin-text-base focus:ring-0 outline-none leading-relaxed resize-none"
                />
                {!parsedMeta.ok && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded bg-admin-danger/90 px-2 py-0.5 text-[10px] font-bold text-white">
                    <ShieldAlert size={10} />
                    {parsedMeta.error}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-admin-border border-dashed bg-admin-bg/30 p-3">
              <p className="text-[10px] font-bold text-admin-text-muted italic flex items-center gap-2">
                <Activity size={12} className="text-admin-brand" />
                컴팩??모드 ?�동 �? 메�??�이?�는 기본값으�??�동 기록?�니??
              </p>
            </div>
          )}
        </div>

        {/* Options & Dangerous Zone */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="inline-flex cursor-pointer items-center gap-3 select-none">
              <div
                className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${isAutomated ? "bg-admin-brand border-admin-brand" : "border-admin-border bg-admin-bg"}`}
                onClick={() => setIsAutomated(!isAutomated)}
              >
                {isAutomated && <div className="h-2 w-2 rounded-full bg-black shadow-sm" />}
              </div>
              <input
                type="checkbox"
                checked={isAutomated}
                onChange={(e) => {
                  setIsAutomated(e.target.checked);
                  setConfirmArmed(false);
                }}
                className="hidden"
              />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-admin-text-base uppercase tracking-widest">?�동 ?�행 로직</span>
                <span className="text-[9px] font-bold text-admin-text-muted italic">Check if this log logic is being triggered by an automated sequence.</span>
              </div>
            </label>
          </div>

          {isDangerous && confirmArmed && (
            <div className="relative overflow-hidden rounded-xl border border-admin-danger/50 bg-admin-danger/5 p-5 animate-in fade-in zoom-in duration-300">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-admin-danger/20 p-2 text-admin-danger shadow-lg shadow-admin-danger/10">
                  <ShieldAlert size={20} />
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="text-xs font-bold text-admin-danger uppercase tracking-widest">2?�계 보안 ?�정 (Final Confirmation)</h4>
                  <p className="text-[11px] font-bold text-admin-text-muted leading-relaxed">
                    민감???�영 ?�션??감�??�었?�니?? ?�래 ?�행 ?�약??검?�한 ??[기록 ?�정] 버튼???�러주세??
                  </p>
                  <div className="mt-3 rounded-md bg-admin-bg/80 border border-admin-danger/20 p-3 shadow-inner">
                    <pre className="font-mono text-[10px] text-admin-text-base leading-tight">
                      <span className="text-admin-danger">ACTION_CODE:</span> {summary.action_code}<br />
                      <span className="text-admin-danger">TARGET:</span> {summary.target_model}:{summary.target_id || "ALL"}<br />
                      <span className="text-admin-danger">REF_ID:</span> {summary.ref_id}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-admin-border">
          {isDangerous && confirmArmed && (
            <button
              type="button"
              onClick={() => setConfirmArmed(false)}
              className="rounded-lg px-5 py-2.5 text-xs font-bold text-admin-text-muted hover:text-admin-text-base transition-colors"
            >
              취소 (Cancel)
            </button>
          )}

          {isDangerous && !confirmArmed ? (
            <button
              type="button"
              onClick={() => setConfirmArmed(true)}
              className="group/btn relative flex items-center gap-3 overflow-hidden rounded-lg bg-admin-danger px-8 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(244,71,71,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ShieldAlert size={18} />
              <span>?�행 ?�인 (ARM LOG)</span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full transition-transform duration-1000" />
            </button>
          ) : (
            <button
              type="button"
              disabled={createMutation.isPending}
              onClick={submit}
              className="group/btn relative flex items-center gap-3 overflow-hidden rounded-lg bg-admin-brand px-10 py-3 text-sm font-bold text-black shadow-[0_0_20px_rgba(78,201,176,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Save size={18} />
              <span>{isDangerous ? "기록 ?�정 (COMMIT)" : "로그 출력 (DEPLOY)"}</span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-1000" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpsLogQuickLogger;

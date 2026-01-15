import React, { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";

import {
  useCreateOpsCampaign,
  useCreateOpsPlanTask,
  useDeleteOpsPlan,
  useDeleteOpsPlanTask,
  useEnsureOpsPlan,
  useExecuteOpsPlanTask,
  useOpsCampaigns,
  useOpsPlanTasks,
  useUpdateOpsCampaign,
  useUpdateOpsPlanTask,
} from "../hooks/useOpsPlan";
import { formatKstDateTime } from "../../utils/kstTime";
import { findPiiHits } from "../utils/piiGuard";
import { useToast } from "../../components/common/ToastProvider";
import {
  OPS_PLAYBOOK_ACTIONS,
  STANDARD_METRIC_OPTIONS,
  type OpsExperimentDraft,
  type StandardMetricKey,
} from "../constants/opsPlaybookCatalog";

function getKstDateKey(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const yyyy = parts.find((p) => p.type === "year")?.value ?? "0000";
  const mm = parts.find((p) => p.type === "month")?.value ?? "01";
  const dd = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${yyyy}-${mm}-${dd}`;
}

const STATUS_OPTIONS = ["TODO", "DOING", "DONE", "SKIPPED", "BLOCKED"] as const;
const TYPE_OPTIONS = ["NOTE", "TOGGLE", "DM"] as const;

type LocalTaskDraft = {
  slot_time: string;
  title: string;
};

type InventoryGrantAllItem = { item_type: string; amount: number };

function getAdminApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;
    const detail = data?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const msg = detail
        .map((d) => (typeof d?.msg === "string" ? d.msg : typeof d === "string" ? d : ""))
        .filter(Boolean)
        .join(" / ");
      if (msg) return msg;
    }
  }
  return error instanceof Error ? error.message : "요청에 실패했습니다.";
}

function humanizeOpsPlanError(message: string): string {
  const m = String(message ?? "");
  if (!m) return "요청에 실패했습니다.";

  const map: Record<string, string> = {
    OPS_TASK_ALREADY_EXECUTED: "이미 실행된 Task입니다.",
    OPS_GRANT_ALL_ITEMS_REQUIRED: "지급 아이템 목록(items)이 필요합니다.",
    OPS_GRANT_ALL_ITEMS_INVALID: "지급 아이템 목록(items)이 올바르지 않습니다.",
  };

  // FastAPI HTTPException string can look like "422: CODE".
  const code = m.replace(/^\s*\d+\s*:\s*/, "").trim();
  return map[code] ?? map[m.trim()] ?? m;
}

const AdminOpsPlanPage: React.FC = () => {
  const todayKst = useMemo(() => getKstDateKey(new Date()), []);

  const { addToast } = useToast();

  const campaignsQuery = useOpsCampaigns();
  const createCampaign = useCreateOpsCampaign();
  const updateCampaign = useUpdateOpsCampaign();

  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [newCampaignName, setNewCampaignName] = useState<string>("");

  useEffect(() => {
    if (selectedCampaignId != null) return;
    const first = campaignsQuery.data?.[0];
    if (first) setSelectedCampaignId(first.id);
  }, [campaignsQuery.data, selectedCampaignId]);

  const planQuery = useEnsureOpsPlan(selectedCampaignId, todayKst);
  const planId = planQuery.data?.id ?? null;
  const deletePlan = useDeleteOpsPlan(selectedCampaignId, todayKst);

  const tasksQuery = useOpsPlanTasks(planId);
  const deleteTask = useDeleteOpsPlanTask(planId);

  const createTask = useCreateOpsPlanTask(planId);
  const updateTask = useUpdateOpsPlanTask(planId);
  const executeTask = useExecuteOpsPlanTask(planId);

  const [taskDraft, setTaskDraft] = useState<LocalTaskDraft>({ slot_time: "", title: "" });

  const [selectedActionId, setSelectedActionId] = useState<string>("");
  const [experimentDrafts, setExperimentDrafts] = useState<Record<number, OpsExperimentDraft>>({});

  const [toggleDrafts, setToggleDrafts] = useState<Record<number, { action: string; multiplier: string }>>({});
  const [dmDrafts, setDmDrafts] = useState<Record<number, { audience: string; message: string }>>({});
  const [piiConfirmTaskId, setPiiConfirmTaskId] = useState<number | null>(null);
  const [piiHitsByTaskId, setPiiHitsByTaskId] = useState<Record<number, ReturnType<typeof findPiiHits>>>({});

  const onCreateCampaign = async () => {
    const name = newCampaignName.trim();
    if (!name) return;
    const created = await createCampaign.mutateAsync({ name });
    setNewCampaignName("");
    setSelectedCampaignId(created.id);
  };

  const onArchiveCampaign = async () => {
    if (!selectedCampaignId) return;
    const ok = window.confirm("이 캠페인을 '보관(ARCHIVED)' 처리할까요?\n(플랜/태스크는 유지되며, 필요 시 다시 열람 가능합니다.)");
    if (!ok) return;

    try {
      await updateCampaign.mutateAsync({ campaignId: selectedCampaignId, patch: { status: "ARCHIVED" } });
      addToast("캠페인을 보관(ARCHIVED) 처리했습니다.", "success");
    } catch {
      addToast("캠페인 보관에 실패했습니다.", "error");
    }
  };

  const onDeleteTodayPlan = async () => {
    if (!planId) return;
    const ok = window.confirm(
      "오늘 플랜을 삭제(초기화)할까요?\n- 플랜에 속한 Task는 함께 삭제됩니다.\n- 화면은 자동으로 새 플랜을 다시 생성합니다.",
    );
    if (!ok) return;

    try {
      await deletePlan.mutateAsync(planId);
      setTaskDraft({ slot_time: "", title: "" });
      setSelectedActionId("");
      setExperimentDrafts({});
      setToggleDrafts({});
      setDmDrafts({});
      setPiiConfirmTaskId(null);
      setPiiHitsByTaskId({});
      addToast("오늘 플랜을 초기화했습니다.", "success");
      await planQuery.refetch();
    } catch {
      addToast("플랜 삭제에 실패했습니다.", "error");
    }
  };

  const onDeleteSingleTask = async (taskId: number) => {
    const ok = window.confirm("이 Task를 삭제할까요?");
    if (!ok) return;

    try {
      await deleteTask.mutateAsync(taskId);
      setExperimentDrafts((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      setToggleDrafts((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      setDmDrafts((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      setPiiHitsByTaskId((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      if (piiConfirmTaskId === taskId) setPiiConfirmTaskId(null);
      addToast("Task를 삭제했습니다.", "success");
    } catch {
      addToast("Task 삭제에 실패했습니다.", "error");
    }
  };

  const onAddTask = async () => {
    if (!planId) return;
    const title = taskDraft.title.trim();
    const slot_time = taskDraft.slot_time.trim();
    if (!title) return;
    await createTask.mutateAsync({
      title,
      slot_time: slot_time || null,
      type: "NOTE",
      status: "TODO",
      payload_json: {},
    });
    setTaskDraft({ slot_time: "", title: "" });
  };

  const onAddPlaybookAction = async () => {
    if (!planId) return;
    const action = OPS_PLAYBOOK_ACTIONS.find((a) => a.id === selectedActionId);
    if (!action) return;

    await createTask.mutateAsync({
      title: action.title,
      slot_time: action.slot_time ?? null,
      type: action.type,
      status: "TODO",
      payload_json: {
        ...action.payload_json,
        playbook_action_id: action.id,
        experiment: {
          metric_key: action.default_metric_key ?? ("OTHER" as StandardMetricKey),
          metric_custom_key: "",
          window: action.default_window ?? "당일",
          before: null,
          after: null,
          evidence: "",
          note: "",
        },
      },
    });
  };

  const getExperimentDraft = (payloadJson: Record<string, unknown> | null | undefined): OpsExperimentDraft => {
    const existing = (payloadJson ?? {}) as Record<string, unknown>;
    const exp = (existing.experiment ?? {}) as Record<string, unknown>;
    const metric_key = (exp.metric_key as StandardMetricKey) ?? "OTHER";
    return {
      metric_key,
      metric_custom_key: String(exp.metric_custom_key ?? ""),
      window: String(exp.window ?? "당일"),
      before: exp.before == null ? "" : String(exp.before),
      after: exp.after == null ? "" : String(exp.after),
      evidence: String(exp.evidence ?? ""),
      note: String(exp.note ?? ""),
    };
  };

  const upsertExperimentDraft = (taskId: number, patch: Partial<OpsExperimentDraft>, fallbackPayload?: Record<string, unknown> | null) => {
    setExperimentDrafts((prev) => {
      const base = prev[taskId] ?? getExperimentDraft(fallbackPayload ?? undefined);
      return { ...prev, [taskId]: { ...base, ...patch } };
    });
  };

  const saveExperiment = (taskId: number, existingPayload: Record<string, unknown> | null | undefined, draft: OpsExperimentDraft) => {
    const before = draft.before.trim() ? Number(draft.before) : null;
    const after = draft.after.trim() ? Number(draft.after) : null;
    const metric_key: StandardMetricKey = draft.metric_key;

    const nextExperiment = {
      metric_key,
      metric_custom_key: metric_key === "OTHER" ? (draft.metric_custom_key ?? "").trim() : "",
      window: draft.window.trim(),
      before: Number.isFinite(before) ? before : null,
      after: Number.isFinite(after) ? after : null,
      evidence: (draft.evidence ?? "").trim(),
      note: (draft.note ?? "").trim(),
    };

    const payload = (existingPayload ?? {}) as Record<string, unknown>;
    updateTask.mutate({ taskId, patch: { payload_json: { ...payload, experiment: nextExperiment } } });
  };

  const isInventoryGrantAllTask = (payloadJson: Record<string, unknown> | null | undefined): boolean => {
    const kind = (payloadJson ?? {}).kind;
    return String(kind ?? "") === "INVENTORY_GRANT_ALL";
  };

  const getInventoryGrantAllDraft = (payloadJson: Record<string, unknown> | null | undefined) => {
    const payload = (payloadJson ?? {}) as Record<string, unknown>;
    const reason = String(payload.reason ?? "OPS_PLAN_GRANT_ALL");
    const rawItems = Array.isArray(payload.items) ? payload.items : [];
    const items: InventoryGrantAllItem[] = rawItems
      .map((it) => {
        const row = (it ?? {}) as Record<string, unknown>;
        return {
          item_type: String(row.item_type ?? ""),
          amount: Number(row.amount ?? 0),
        };
      })
      .filter((it) => it.item_type.trim().length > 0 || Number.isFinite(it.amount));

    return { reason, items: items.length ? items : [{ item_type: "DIAMOND", amount: 1 }] };
  };

  const saveInventoryGrantAllPayload = (taskId: number, existingPayload: Record<string, unknown> | null | undefined, draft: { reason: string; items: InventoryGrantAllItem[] }) => {
    const cleanedItems = (draft.items ?? [])
      .map((it) => ({
        item_type: String(it.item_type ?? "").trim(),
        amount: Number(it.amount ?? 0),
      }))
      .filter((it) => it.item_type && Number.isFinite(it.amount) && it.amount > 0);

    if (cleanedItems.length === 0) {
      addToast("지급 아이템이 비어있습니다. item_type과 amount(양수)를 입력해 주세요.", "error");
      return;
    }

    const reason = String(draft.reason ?? "OPS_PLAN_GRANT_ALL").trim() || "OPS_PLAN_GRANT_ALL";
    const base = (existingPayload ?? {}) as Record<string, unknown>;
    const nextPayload: Record<string, unknown> = {
      ...base,
      kind: "INVENTORY_GRANT_ALL",
      reason,
      items: cleanedItems,
    };
    updateTask.mutate({ taskId, patch: { payload_json: nextPayload } });
  };

  const confirmExecuteInventoryGrantAll = (taskId: number, payloadJson: Record<string, unknown> | null | undefined): boolean => {
    const draft = getInventoryGrantAllDraft(payloadJson);
    const lines = draft.items
      .map((it) => `- ${it.item_type} x${it.amount}`)
      .join("\n");
    return window.confirm(
      `⚠️ 전체 유저(상태 무관)에게 아이템을 지급합니다.\n\nTask ID: ${taskId}\nReason: ${draft.reason}\n\n지급 목록:\n${lines}\n\n실행 후 되돌릴 수 없습니다. 진행할까요?`
    );
  };

  const onAddPresetToggle = async (mode: "FORCE_ON" | "FORCE_OFF" | "MULTIPLIER_SET") => {
    if (!planId) return;
    const title =
      mode === "FORCE_ON" ? "골든아워 FORCE_ON" :
        mode === "FORCE_OFF" ? "골든아워 FORCE_OFF" :
          "골든아워 MULTIPLIER_SET";

    await createTask.mutateAsync({
      title,
      slot_time: null,
      type: "TOGGLE",
      status: "TODO",
      payload_json: {
        kind: "GOLDEN_HOUR",
        action: mode,
        multiplier: mode === "MULTIPLIER_SET" ? 2.0 : null,
      },
    });
  };

  const onAddPresetDm = async () => {
    if (!planId) return;
    await createTask.mutateAsync({
      title: "설문 DM 발송",
      slot_time: null,
      type: "DM",
      status: "TODO",
      payload_json: {
        kind: "SURVEY_DM",
        audience: "SURVEY_COMPLETERS",
        message: "",
      },
    });
  };

  const saveTogglePayload = (taskId: number, draft: { action: string; multiplier: string }) => {
    const action = draft.action || "FORCE_ON";
    const rawMultiplier = draft.multiplier.trim();
    const multiplier = rawMultiplier ? Number(rawMultiplier) : null;

    const payload: Record<string, unknown> = {
      kind: "GOLDEN_HOUR",
      action,
    };
    if (action === "MULTIPLIER_SET") {
      payload.multiplier = Number.isFinite(multiplier) ? multiplier : null;
    }

    updateTask.mutate({ taskId, patch: { type: "TOGGLE", payload_json: payload } });
  };

  const saveDmPayload = (taskId: number, draft: { audience: string; message: string }, opts?: { bypassPii?: boolean }) => {
    const audience = (draft.audience || "SURVEY_COMPLETERS").trim();
    const message = draft.message ?? "";

    if (!opts?.bypassPii) {
      const hits = findPiiHits(message);
      if (hits.length > 0) {
        setPiiConfirmTaskId(taskId);
        setPiiHitsByTaskId((prev) => ({ ...prev, [taskId]: hits }));
        addToast("PII(전화/이메일/계좌) 의심 패턴이 감지되어 저장을 보류했습니다. 아래에서 '무시하고 저장'을 눌러야 저장됩니다.", "error");
        return;
      }
    }

    if (piiConfirmTaskId === taskId) setPiiConfirmTaskId(null);

    updateTask.mutate({
      taskId,
      patch: {
        type: "DM",
        payload_json: {
          kind: "SURVEY_DM",
          audience,
          message,
        },
      },
    });
  };

  return (
    <section className="admin-page-container">
      <header className="flex flex-col gap-2 border-b border-admin-border pb-6 pt-4">
        <h1 className="text-3xl font-bold text-admin-text-base tracking-tight uppercase">
          운영계획 <span className="text-admin-brand/40">Playbook</span>
        </h1>

        <div>
          <Link
            to="/admin/ops/logs"
            className="inline-flex items-center gap-2 rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70"
            aria-label="기존 운영로그 보기"
            title="기존 운영로그 보기"
          >
            기존 운영로그 보기
          </Link>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-admin-border bg-admin-sidebar p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-admin-subtitle text-admin-text-primary">캠페인</h2>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70"
                onClick={() => campaignsQuery.refetch()}
                aria-label="캠페인 목록 새로고침"
                title="새로고침"
              >
                <RefreshCw size={14} />
                새로고침
              </button>
            </div>

            <div className="mt-3">
              <label htmlFor="ops-campaign-select" className="block text-xs font-bold text-admin-text-muted">
                캠페인 선택
              </label>
              <select
                id="ops-campaign-select"
                className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text-primary"
                value={selectedCampaignId ?? ""}
                onChange={(e) => setSelectedCampaignId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">(선택하세요)</option>
                {(campaignsQuery.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} [{c.status}]
                  </option>
                ))}
              </select>

              <div className="mt-2 flex items-center justify-end">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-admin-danger/40 bg-admin-danger/10 px-3 py-2 text-xs font-bold text-admin-danger hover:bg-admin-danger/15 disabled:opacity-50"
                  onClick={onArchiveCampaign}
                  disabled={!selectedCampaignId || updateCampaign.isPending}
                  aria-label="캠페인 보관(ARCHIVED)"
                  title="보관(ARCHIVED)"
                >
                  <Trash2 size={14} />
                  보관
                </button>
              </div>

              {campaignsQuery.isLoading && (
                <div className="mt-2 text-xs text-admin-text-muted">불러오는 중…</div>
              )}
              {campaignsQuery.error && (
                <div className="mt-2 text-xs text-admin-danger">캠페인 로드 실패</div>
              )}
            </div>

            <div className="mt-4 border-t border-admin-border pt-4">
              <label htmlFor="ops-campaign-new" className="block text-xs font-bold text-admin-text-muted">
                새 캠페인 만들기
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="ops-campaign-new"
                  className="flex-1 rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text-primary min-w-0"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="예: 1/13 설문+골든아워"
                />
                <button
                  type="button"
                  className="btn-admin-primary shrink-0 whitespace-nowrap"
                  onClick={onCreateCampaign}
                  disabled={createCampaign.isPending || !newCampaignName.trim()}
                  aria-label="캠페인 생성"
                  title="캠페인 생성"
                >
                  <Plus size={16} />
                  생성
                </button>
              </div>
              {createCampaign.error && (
                <div className="mt-2 text-xs text-admin-danger">캠페인 생성 실패</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-admin-border bg-admin-sidebar p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-admin-subtitle text-admin-text-primary">오늘 플랜</h2>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-admin-danger/40 bg-admin-danger/10 px-3 py-2 text-xs font-bold text-admin-danger hover:bg-admin-danger/15 disabled:opacity-50"
                onClick={onDeleteTodayPlan}
                disabled={!planId || deletePlan.isPending}
                aria-label="오늘 플랜 삭제(초기화)"
                title="플랜 삭제(초기화)"
              >
                <Trash2 size={14} />
                초기화
              </button>
            </div>
            <div className="mt-2 text-sm text-admin-text-secondary font-mono bg-admin-bg/50 px-3 py-1.5 rounded-lg inline-block border border-white/5">
              {todayKst}
            </div>
            {planQuery.isLoading && <div className="mt-2 text-xs text-admin-text-muted">플랜 생성/조회 중…</div>}
            {planQuery.error && <div className="mt-2 text-xs text-admin-danger">플랜 로드 실패</div>}

          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="rounded-xl border border-admin-border bg-admin-sidebar p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-admin-subtitle text-admin-text-primary">Task 체크리스트</h2>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70"
                onClick={() => tasksQuery.refetch()}
                disabled={!planId}
                aria-label="Task 목록 새로고침"
                title="새로고침"
              >
                <RefreshCw size={14} />
                새로고침
              </button>
            </div>

            <div className="mt-3 grid grid-cols-12 gap-2">
              <div className="col-span-12 md:col-span-3">
                <label htmlFor="ops-task-slot" className="block text-xs font-bold text-admin-text-muted">시간(HH:MM)</label>
                <input
                  id="ops-task-slot"
                  className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm"
                  value={taskDraft.slot_time}
                  onChange={(e) => setTaskDraft((p) => ({ ...p, slot_time: e.target.value }))}
                  placeholder="20:30"
                  disabled={!planId}
                />
              </div>
              <div className="col-span-12 md:col-span-7">
                <label htmlFor="ops-task-title" className="block text-xs font-bold text-admin-text-muted">작업 제목</label>
                <input
                  id="ops-task-title"
                  className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm"
                  value={taskDraft.title}
                  onChange={(e) => setTaskDraft((p) => ({ ...p, title: e.target.value }))}
                  placeholder="예: 골든아워 FORCE_ON 2.5배"
                  disabled={!planId}
                />
              </div>
              <div className="col-span-12 md:col-span-2 flex items-end">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-admin-brand px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                  onClick={onAddTask}
                  disabled={!planId || !taskDraft.title.trim() || createTask.isPending}
                  aria-label="Task 추가"
                  title="Task 추가"
                >
                  <Plus size={16} />
                  추가
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70 disabled:opacity-50"
                onClick={() => onAddPresetToggle("FORCE_ON")}
                disabled={!planId || createTask.isPending}
                aria-label="골든아워 FORCE_ON 프리셋 추가"
                title="골든아워 FORCE_ON"
              >
                골든아워 ON
              </button>
              <button
                type="button"
                className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70 disabled:opacity-50"
                onClick={() => onAddPresetToggle("FORCE_OFF")}
                disabled={!planId || createTask.isPending}
                aria-label="골든아워 FORCE_OFF 프리셋 추가"
                title="골든아워 FORCE_OFF"
              >
                골든아워 OFF
              </button>
              <button
                type="button"
                className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70 disabled:opacity-50"
                onClick={() => onAddPresetToggle("MULTIPLIER_SET")}
                disabled={!planId || createTask.isPending}
                aria-label="골든아워 MULTIPLIER_SET 프리셋 추가"
                title="골든아워 MULTIPLIER_SET"
              >
                골든아워 배수
              </button>
              <button
                type="button"
                className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70 disabled:opacity-50"
                onClick={onAddPresetDm}
                disabled={!planId || createTask.isPending}
                aria-label="설문 DM 프리셋 추가"
                title="설문 DM"
              >
                설문 DM
              </button>
            </div>

            <div className="mt-3 rounded-lg border border-admin-border bg-admin-bg/40 p-3">
              <div className="text-xs font-bold text-admin-text-muted">플레이북 액션 추가 (실험 추적 포함)</div>
              <div className="mt-2 grid grid-cols-12 gap-2">
                <div className="col-span-12 md:col-span-9">
                  <label htmlFor="ops-playbook-action" className="sr-only">플레이북 액션</label>
                  <select
                    id="ops-playbook-action"
                    className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                    value={selectedActionId}
                    onChange={(e) => setSelectedActionId(e.target.value)}
                    disabled={!planId}
                  >
                    <option value="">(선택) 리텐션 문서 액션</option>
                    {OPS_PLAYBOOK_ACTIONS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-12 md:col-span-3">
                  <button
                    type="button"
                    className="w-full rounded-lg bg-admin-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    onClick={onAddPlaybookAction}
                    disabled={!planId || !selectedActionId || createTask.isPending}
                    aria-label="플레이북 액션 Task 추가"
                    title="추가"
                  >
                    액션 추가
                  </button>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-admin-text-muted">
                표준 지표 드롭다운 + before/after + 기간 + 근거 링크를 payload_json에 저장합니다.
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="admin-th w-[90px]">시간</th>
                    <th className="admin-th">제목</th>
                    <th className="admin-th w-[140px]">상태</th>
                    <th className="admin-th w-[260px]">실행</th>
                  </tr>
                </thead>
                <tbody>
                  {(tasksQuery.data ?? []).map((t) => (
                    <tr key={t.id} className="border-t border-admin-border">
                      <td className="admin-td font-mono whitespace-nowrap">{t.slot_time || "-"}</td>
                      <td className="admin-td">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-admin-text-primary font-semibold">{t.title}</div>
                          <span className="rounded-md border border-admin-border bg-admin-bg px-2 py-0.5 text-[11px] font-bold text-admin-text-muted">
                            {t.type}
                          </span>
                        </div>

                        <div className="mt-2">
                          <label htmlFor={`ops-task-type-${t.id}`} className="sr-only">타입</label>
                          <select
                            id={`ops-task-type-${t.id}`}
                            className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                            value={t.type}
                            onChange={(e) => {
                              updateTask.mutate({ taskId: t.id, patch: { type: e.target.value } });
                            }}
                          >
                            {TYPE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>

                        <label htmlFor={`ops-task-memo-${t.id}`} className="sr-only">메모</label>
                        <input
                          id={`ops-task-memo-${t.id}`}
                          className="mt-2 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                          placeholder="메모(선택)"
                          defaultValue={t.memo ?? ""}
                          onBlur={(e) => {
                            const memo = e.target.value;
                            if ((t.memo ?? "") === memo) return;
                            updateTask.mutate({ taskId: t.id, patch: { memo } });
                          }}
                        />

                        {(() => {
                          if (!isInventoryGrantAllTask(t.payload_json as Record<string, unknown> | null | undefined)) return null;
                          const payload = (t.payload_json ?? {}) as Record<string, unknown>;
                          const draft = getInventoryGrantAllDraft(payload);

                          return (
                            <div className="mt-3 rounded-lg border border-admin-danger/40 bg-admin-danger/5 p-3">
                              <div className="text-xs font-bold text-admin-danger">전체 유저 아이템 지급 (전원)</div>
                              <div className="mt-2 grid grid-cols-12 gap-2">
                                <div className="col-span-12 md:col-span-6">
                                  <label htmlFor={`ops-grantall-reason-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                    reason(ledger)
                                  </label>
                                  <input
                                    id={`ops-grantall-reason-${t.id}`}
                                    className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                    defaultValue={draft.reason}
                                    placeholder="예: OPS_PLAN_GRANT_ALL"
                                    onBlur={(e) => {
                                      const nextReason = e.target.value;
                                      const latest = getInventoryGrantAllDraft(payload);
                                      saveInventoryGrantAllPayload(t.id, payload, { ...latest, reason: nextReason });
                                    }}
                                  />
                                </div>
                                <div className="col-span-12 md:col-span-6 flex items-end justify-end">
                                  <button
                                    type="button"
                                    className="rounded-lg bg-admin-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                    onClick={() => saveInventoryGrantAllPayload(t.id, payload, draft)}
                                    disabled={updateTask.isPending}
                                    aria-label="전원 지급 payload 저장"
                                    title="저장"
                                  >
                                    저장
                                  </button>
                                </div>
                              </div>

                              <div className="mt-3 space-y-2">
                                {(draft.items ?? []).map((it, idx) => (
                                  <div key={`${t.id}-grantall-${idx}`} className="grid grid-cols-12 gap-2">
                                    <div className="col-span-12 md:col-span-8">
                                      <label htmlFor={`ops-grantall-item-${t.id}-${idx}`} className="block text-[11px] font-bold text-admin-text-muted">
                                        item_type
                                      </label>
                                      <input
                                        id={`ops-grantall-item-${t.id}-${idx}`}
                                        className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-mono"
                                        defaultValue={it.item_type}
                                        placeholder='예: DIAMOND, VOUCHER_LOTTERY_TICKET_1'
                                        onBlur={(e) => {
                                          const nextItems = [...draft.items];
                                          nextItems[idx] = { ...nextItems[idx], item_type: e.target.value };
                                          saveInventoryGrantAllPayload(t.id, payload, { ...draft, items: nextItems });
                                        }}
                                      />
                                    </div>
                                    <div className="col-span-12 md:col-span-3">
                                      <label htmlFor={`ops-grantall-amount-${t.id}-${idx}`} className="block text-[11px] font-bold text-admin-text-muted">
                                        amount
                                      </label>
                                      <input
                                        id={`ops-grantall-amount-${t.id}-${idx}`}
                                        className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                        defaultValue={String(it.amount)}
                                        inputMode="numeric"
                                        onBlur={(e) => {
                                          const nextItems = [...draft.items];
                                          nextItems[idx] = { ...nextItems[idx], amount: Number(e.target.value) };
                                          saveInventoryGrantAllPayload(t.id, payload, { ...draft, items: nextItems });
                                        }}
                                      />
                                    </div>
                                    <div className="col-span-12 md:col-span-1 flex items-end">
                                      <button
                                        type="button"
                                        className="w-full rounded-lg border border-admin-danger/40 bg-admin-danger/10 px-3 py-2 text-xs font-bold text-admin-danger hover:bg-admin-danger/15"
                                        onClick={() => {
                                          const nextItems = draft.items.filter((_, i) => i !== idx);
                                          saveInventoryGrantAllPayload(t.id, payload, { ...draft, items: nextItems });
                                        }}
                                        aria-label="아이템 줄 삭제"
                                        title="삭제"
                                      >
                                        삭제
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70"
                                    onClick={() => {
                                      const nextItems = [...draft.items, { item_type: "", amount: 1 }];
                                      saveInventoryGrantAllPayload(t.id, payload, { ...draft, items: nextItems });
                                    }}
                                    aria-label="아이템 줄 추가"
                                    title="추가"
                                  >
                                    아이템 추가
                                  </button>
                                </div>
                              </div>

                              <div className="mt-2 text-[11px] text-admin-text-muted">
                                실행 시: 전원(상태 무관) 지급 · 중복 실행 방지(재실행 409)
                              </div>
                            </div>
                          );
                        })()}

                        {t.type === "TOGGLE" && (
                          <div className="mt-3 rounded-lg border border-admin-border bg-admin-bg/40 p-3">
                            <div className="text-xs font-bold text-admin-text-muted">TOGGLE 프리셋 (골든아워)</div>
                            {(() => {
                              const payload = (t.payload_json ?? {}) as Record<string, unknown>;
                              const draft = toggleDrafts[t.id] ?? {
                                action: String(payload.action ?? "FORCE_ON"),
                                multiplier: payload.multiplier == null ? "" : String(payload.multiplier),
                              };

                              return (
                                <div className="mt-2 grid grid-cols-12 gap-2">
                                  <div className="col-span-12 md:col-span-5">
                                    <label htmlFor={`ops-toggle-action-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                      동작
                                    </label>
                                    <select
                                      id={`ops-toggle-action-${t.id}`}
                                      className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                      value={draft.action}
                                      onChange={(e) =>
                                        setToggleDrafts((prev) => ({
                                          ...prev,
                                          [t.id]: { ...draft, action: e.target.value },
                                        }))
                                      }
                                    >
                                      <option value="FORCE_ON">FORCE_ON</option>
                                      <option value="FORCE_OFF">FORCE_OFF</option>
                                      <option value="MULTIPLIER_SET">MULTIPLIER_SET</option>
                                    </select>
                                  </div>
                                  <div className="col-span-12 md:col-span-5">
                                    <label htmlFor={`ops-toggle-mult-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                      배수(옵션)
                                    </label>
                                    <input
                                      id={`ops-toggle-mult-${t.id}`}
                                      className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                      value={draft.multiplier}
                                      onChange={(e) =>
                                        setToggleDrafts((prev) => ({
                                          ...prev,
                                          [t.id]: { ...draft, multiplier: e.target.value },
                                        }))
                                      }
                                      placeholder="예: 2.5"
                                      disabled={draft.action !== "MULTIPLIER_SET"}
                                    />
                                  </div>
                                  <div className="col-span-12 md:col-span-2 flex items-end">
                                    <button
                                      type="button"
                                      className="w-full rounded-lg bg-admin-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                      onClick={() => saveTogglePayload(t.id, draft)}
                                      disabled={updateTask.isPending}
                                      aria-label="TOGGLE payload 저장"
                                      title="저장"
                                    >
                                      저장
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {t.type === "DM" && (
                          <div className="mt-3 rounded-lg border border-admin-border bg-admin-bg/40 p-3">
                            <div className="text-xs font-bold text-admin-text-muted">DM 프리셋</div>
                            {(() => {
                              const payload = (t.payload_json ?? {}) as Record<string, unknown>;
                              const draft = dmDrafts[t.id] ?? {
                                audience: String(payload.audience ?? "SURVEY_COMPLETERS"),
                                message: String(payload.message ?? ""),
                              };

                              const hits = piiHitsByTaskId[t.id] ?? [];
                              const needsConfirm = piiConfirmTaskId === t.id && hits.length > 0;

                              return (
                                <div className="mt-2 space-y-2">
                                  <div className="grid grid-cols-12 gap-2">
                                    <div className="col-span-12 md:col-span-4">
                                      <label htmlFor={`ops-dm-audience-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                        대상
                                      </label>
                                      <select
                                        id={`ops-dm-audience-${t.id}`}
                                        className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                        value={draft.audience}
                                        onChange={(e) =>
                                          setDmDrafts((prev) => ({
                                            ...prev,
                                            [t.id]: { ...draft, audience: e.target.value },
                                          }))
                                        }
                                      >
                                        <option value="SURVEY_COMPLETERS">SURVEY_COMPLETERS</option>
                                        <option value="ALL">ALL</option>
                                        <option value="SEGMENT">SEGMENT</option>
                                      </select>
                                    </div>
                                    <div className="col-span-12 md:col-span-8">
                                      <label htmlFor={`ops-dm-message-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                        메시지
                                      </label>
                                      <textarea
                                        id={`ops-dm-message-${t.id}`}
                                        className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                        rows={3}
                                        value={draft.message}
                                        onChange={(e) =>
                                          setDmDrafts((prev) => ({
                                            ...prev,
                                            [t.id]: { ...draft, message: e.target.value },
                                          }))
                                        }
                                        placeholder="(예) 설문 감사합니다! 보상은 금일 23:59까지…"
                                      />
                                    </div>
                                  </div>

                                  {needsConfirm && (
                                    <div className="rounded-lg border border-admin-danger/40 bg-admin-danger/10 p-2 text-xs text-admin-danger">
                                      PII 의심 패턴 감지: {hits.map((h) => h.type).join(", ")}
                                      <div className="mt-2 flex items-center gap-2">
                                        <button
                                          type="button"
                                          className="rounded-lg bg-admin-danger px-3 py-2 text-xs font-bold text-white"
                                          onClick={() => saveDmPayload(t.id, draft, { bypassPii: true })}
                                          aria-label="PII 무시하고 저장"
                                          title="무시하고 저장"
                                        >
                                          무시하고 저장
                                        </button>
                                        <button
                                          type="button"
                                          className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary"
                                          onClick={() => setPiiConfirmTaskId(null)}
                                          aria-label="취소"
                                          title="취소"
                                        >
                                          취소
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex justify-end">
                                    <button
                                      type="button"
                                      className="rounded-lg bg-admin-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                      onClick={() => saveDmPayload(t.id, draft)}
                                      disabled={updateTask.isPending}
                                      aria-label="DM payload 저장"
                                      title="저장"
                                    >
                                      저장
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        <details className="mt-3 rounded-lg border border-admin-border bg-admin-bg/30 p-3">
                          <summary className="cursor-pointer text-xs font-bold text-admin-text-muted">
                            실험/효과 추적 (지표·before/after·기간·근거)
                          </summary>
                          {(() => {
                            const payload = (t.payload_json ?? {}) as Record<string, unknown>;
                            const draft = experimentDrafts[t.id] ?? getExperimentDraft(payload);
                            const metricKey = draft.metric_key;
                            const actionId = payload.playbook_action_id ? String(payload.playbook_action_id) : "";

                            return (
                              <div className="mt-3 space-y-3">
                                {actionId && (
                                  <div className="text-[11px] text-admin-text-muted">
                                    action_id: <span className="font-mono">{actionId}</span>
                                  </div>
                                )}

                                <div className="grid grid-cols-12 gap-2">
                                  <div className="col-span-12 md:col-span-4">
                                    <label htmlFor={`ops-exp-metric-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                      지표
                                    </label>
                                    <select
                                      id={`ops-exp-metric-${t.id}`}
                                      className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                      value={metricKey}
                                      onChange={(e) => upsertExperimentDraft(t.id, { metric_key: e.target.value as StandardMetricKey }, payload)}
                                    >
                                      {STANDARD_METRIC_OPTIONS.map((m) => (
                                        <option key={m.key} value={m.key}>
                                          {m.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="col-span-12 md:col-span-4">
                                    <label htmlFor={`ops-exp-window-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                      기간
                                    </label>
                                    <input
                                      id={`ops-exp-window-${t.id}`}
                                      className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                      value={draft.window}
                                      onChange={(e) => upsertExperimentDraft(t.id, { window: e.target.value }, payload)}
                                      placeholder="예: 2시간, 당일"
                                    />
                                  </div>

                                  <div className="col-span-12 md:col-span-4">
                                    {metricKey === "OTHER" ? (
                                      <>
                                        <label htmlFor={`ops-exp-custom-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                          커스텀 지표명
                                        </label>
                                        <input
                                          id={`ops-exp-custom-${t.id}`}
                                          className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                          value={draft.metric_custom_key ?? ""}
                                          onChange={(e) => upsertExperimentDraft(t.id, { metric_custom_key: e.target.value }, payload)}
                                          placeholder="예: 설문 응답률"
                                        />
                                      </>
                                    ) : (
                                      <div className="mt-6 text-[11px] text-admin-text-muted">&nbsp;</div>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-12 gap-2">
                                  <div className="col-span-12 md:col-span-3">
                                    <label htmlFor={`ops-exp-before-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                      before
                                    </label>
                                    <input
                                      id={`ops-exp-before-${t.id}`}
                                      className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                      value={draft.before}
                                      onChange={(e) => upsertExperimentDraft(t.id, { before: e.target.value }, payload)}
                                      placeholder="숫자"
                                      inputMode="decimal"
                                    />
                                  </div>
                                  <div className="col-span-12 md:col-span-3">
                                    <label htmlFor={`ops-exp-after-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                      after
                                    </label>
                                    <input
                                      id={`ops-exp-after-${t.id}`}
                                      className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                      value={draft.after}
                                      onChange={(e) => upsertExperimentDraft(t.id, { after: e.target.value }, payload)}
                                      placeholder="숫자"
                                      inputMode="decimal"
                                    />
                                  </div>
                                  <div className="col-span-12 md:col-span-6">
                                    <label htmlFor={`ops-exp-evidence-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                      근거(링크/메모)
                                    </label>
                                    <input
                                      id={`ops-exp-evidence-${t.id}`}
                                      className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                      value={draft.evidence}
                                      onChange={(e) => upsertExperimentDraft(t.id, { evidence: e.target.value }, payload)}
                                      placeholder="예: 텔레그램 캡처 링크, 스프레드시트 링크"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label htmlFor={`ops-exp-note-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                    결과/메모
                                  </label>
                                  <textarea
                                    id={`ops-exp-note-${t.id}`}
                                    className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                    rows={3}
                                    value={draft.note}
                                    onChange={(e) => upsertExperimentDraft(t.id, { note: e.target.value }, payload)}
                                    placeholder="무엇을 했고, 무엇이 바뀌었는지 한 줄로"
                                  />
                                </div>

                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    className="rounded-lg bg-admin-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                    onClick={() => saveExperiment(t.id, payload, draft)}
                                    disabled={updateTask.isPending}
                                    aria-label="실험/효과 추적 저장"
                                    title="저장"
                                  >
                                    저장
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </details>

                        <div className="mt-1 text-[11px] text-admin-text-muted">
                          executed_at: <span className="font-mono">{t.executed_at ? formatKstDateTime(t.executed_at) : "-"}</span>
                        </div>
                      </td>
                      <td className="admin-td">
                        <label htmlFor={`ops-task-status-${t.id}`} className="sr-only">상태</label>
                        <select
                          id={`ops-task-status-${t.id}`}
                          className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm"
                          value={t.status}
                          onChange={(e) => {
                            updateTask.mutate({ taskId: t.id, patch: { status: e.target.value } });
                          }}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="admin-td">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70 disabled:opacity-50"
                            onClick={() => {
                              const payload = (t.payload_json ?? {}) as Record<string, unknown>;
                              if (isInventoryGrantAllTask(payload)) {
                                const ok = confirmExecuteInventoryGrantAll(t.id, payload);
                                if (!ok) return;
                              }
                              executeTask
                                ?.mutateAsync({ taskId: t.id, status: "DONE" })
                                .then(() => addToast("실행 완료", "success"))
                                .catch((err) => {
                                  addToast(humanizeOpsPlanError(getAdminApiErrorMessage(err)), "error");
                                });
                            }}
                            disabled={!planId || executeTask.isPending}
                            aria-label="Task 실행(완료 처리)"
                            title="실행"
                          >
                            실행
                          </button>
                          {!isInventoryGrantAllTask((t.payload_json ?? {}) as Record<string, unknown>) && (
                            <button
                              type="button"
                              className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70 disabled:opacity-50"
                              onClick={() => updateTask?.mutate({ taskId: t.id, patch: { status: "DONE" } })}
                              disabled={!planId || updateTask.isPending}
                              aria-label="Task 완료 체크"
                              title="완료"
                            >
                              완료
                            </button>
                          )}
                          <button
                            type="button"
                            className="rounded-lg border border-admin-danger/40 bg-admin-danger/10 px-3 py-2 text-xs font-bold text-admin-danger hover:bg-admin-danger/15 disabled:opacity-50"
                            onClick={() => onDeleteSingleTask(t.id)}
                            disabled={!planId || deleteTask.isPending}
                            aria-label="Task 삭제"
                            title="삭제"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!tasksQuery.isLoading && (tasksQuery.data ?? []).length === 0 && (
                    <tr>
                      <td className="admin-td text-admin-text-muted" colSpan={4}>
                        Task가 아직 없습니다. 위에서 추가해 주세요.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {tasksQuery.isLoading && <div className="mt-3 text-xs text-admin-text-muted">Task 로딩 중…</div>}
            {tasksQuery.error && <div className="mt-3 text-xs text-admin-danger">Task 로드 실패</div>}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminOpsPlanPage;

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";

import { adminApi } from "../api/httpClient";
import { fetchUsers } from "../api/adminUserApi";
import {
  useCreateOpsCampaign,
  useCreateOpsPlanTask,
  useDeleteOpsPlan,
  useDeleteOpsPlanTask,
  useEnsureOpsPlan,
  useExecuteOpsPlanTask,
  useOpsCampaigns,
  useOpsTargetLists,
  useOpsTargetMembers,
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
import ExecutionResultView from "../components/ops/ExecutionResultView";
import ItemSelector from "../components/ops/ItemSelector";
import TargetListSelector from "../components/ops/TargetListSelector";
import { OpsTaskCard, OpsTaskList, TaskEditor } from "../components/ops/OpsTaskLayout";

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
const TYPE_OPTIONS = ["TOGGLE", "DM", "GRANT", "BROADCAST"] as const;
const STATUS_LABEL: Record<string, string> = {
  TODO: "?ÄÍ∏?,
  DOING: "ÏßÑÌñâ",
  DONE: "?ÑÎ£å",
  SKIPPED: "Í±¥ÎÑà?Ä",
  BLOCKED: "Ï∞®Îã®",
};
const TYPE_LABEL: Record<string, string> = {
  TOGGLE: "?†Í?",
  DM: "Î©îÏãúÏßÄ",
  GRANT: "ÏßÄÍ∏?,
  BROADCAST: "Í≥µÏ?",
};

type LocalTaskDraft = {
  slot_time: string;
  title: string;
};

type InventoryGrantAllItem = { item_type: string; amount: number };
type GoldenHourConfig = {
  enabled: boolean;
  manual_override: string;
  multiplier: number;
  base_amount_gate?: number | null;
};

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
  return error instanceof Error ? error.message : "?îÏ≤≠???§Ìå®?àÏäµ?àÎã§.";
}

function humanizeOpsPlanError(message: string): string {
  const m = String(message ?? "");
  if (!m) return "?îÏ≤≠???§Ìå®?àÏäµ?àÎã§.";

  const map: Record<string, string> = {
    OPS_TASK_ALREADY_EXECUTED: "?¥Î? ?§Ìñâ???ëÏóÖ?ÖÎãà??",
    OPS_GRANT_ALL_ITEMS_REQUIRED: "ÏßÄÍ∏??ÑÏù¥??Î™©Î°ù(items)???ÑÏöî?©Îãà??",
    OPS_GRANT_ALL_ITEMS_INVALID: "ÏßÄÍ∏??ÑÏù¥??Î™©Î°ù(items)???¨Î∞îÎ•¥Ï? ?äÏäµ?àÎã§.",
  };

  // FastAPI HTTPException string can look like "422: CODE".
  const code = m.replace(/^\s*\d+\s*:\s*/, "").trim();
  return map[code] ?? map[m.trim()] ?? m;
}

const TargetListPreview: React.FC<{ targetListId: number | null | undefined; countSnapshot?: number }> = ({
  targetListId,
  countSnapshot,
}) => {
  const membersQuery = useOpsTargetMembers(targetListId ?? null, 20);

  if (!targetListId) return null;

  const members = membersQuery.data ?? [];

  return (
    <div className="mt-2 rounded-lg border border-admin-border bg-admin-bg/40 p-2 text-[11px]">
      <div className="flex items-center justify-between">
        <span className="font-bold text-admin-text-muted">?ÄÍπ?Î©§Î≤Ñ ?òÌîå</span>
        {typeof countSnapshot === "number" && <span className="text-admin-text-muted">Ï¥?{countSnapshot}Î™?/span>}
      </div>

      {membersQuery.isLoading && <div className="mt-1 text-admin-text-muted">Î∂àÎü¨?§Îäî Ï§ë‚Ä?/div>}
      {membersQuery.isError && <div className="mt-1 text-admin-danger">Î©§Î≤ÑÎ•?Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??</div>}

      {!membersQuery.isLoading && members.length === 0 && !membersQuery.isError && (
        <div className="mt-1 text-admin-text-muted">Î©§Î≤ÑÍ∞Ä ?ÜÏäµ?àÎã§.</div>
      )}

      {members.length > 0 && (
        <ul className="mt-2 space-y-1">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-md border border-admin-border bg-admin-bg px-2 py-1"
            >
              <span className="font-mono text-[11px] text-admin-text-primary">#{m.user_id}</span>
              <span className="text-[11px] text-admin-text-secondary">
                {m.nickname ||
                  (m.data && typeof (m.data as Record<string, unknown>).nickname === "string"
                    ? String((m.data as Record<string, unknown>).nickname)
                    : "") ||
                  "?âÎÑ§???ÜÏùå"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

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
  const targetListsQuery = useOpsTargetLists(planId);
  const deleteTask = useDeleteOpsPlanTask(planId);

  const createTask = useCreateOpsPlanTask(planId);
  const updateTask = useUpdateOpsPlanTask(planId);
  const executeTask = useExecuteOpsPlanTask(planId);

  const targetListLabelById = useMemo(() => {
    const map = new Map<number, string>();
    (targetListsQuery.data ?? []).forEach((tl) => {
      map.set(tl.id, `${tl.name} (${tl.count_snapshot})`);
    });
    return map;
  }, [targetListsQuery.data]);

  const [activeTab, setActiveTab] = useState<"tasks" | "timeline" | "report">("tasks");
  const [collapsedTaskIds, setCollapsedTaskIds] = useState<Record<number, boolean>>({});
  const [goldenHourConfig, setGoldenHourConfig] = useState<GoldenHourConfig | null>(null);
  const [goldenHourLoading, setGoldenHourLoading] = useState(false);
  const [goldenHourError, setGoldenHourError] = useState<string | null>(null);
  const [evalMetrics, setEvalMetrics] = useState<Array<Record<string, any>>>([]);
  const [evalMetricsLoading, setEvalMetricsLoading] = useState(false);
  const [evalMetricsError, setEvalMetricsError] = useState<string | null>(null);
  const [adminNameById, setAdminNameById] = useState<Record<number, string>>({});

  const fetchGoldenHourConfig = useCallback(() => {
    setGoldenHourLoading(true);
    setGoldenHourError(null);
    return adminApi
      .get<GoldenHourConfig>("/admin/api/vault/golden-hour")
      .then((res) => {
        setGoldenHourConfig(res.data);
      })
      .catch((err) => {
        const message = getAdminApiErrorMessage(err);
        setGoldenHourError(message || "Í≥®Îì†?ÑÏõå ?ÅÌÉúÎ•?Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??");
      })
      .finally(() => {
        setGoldenHourLoading(false);
      });
  }, []);

  const fetchEvalMetrics = useCallback(() => {
    if (!planId) return Promise.resolve();
    setEvalMetricsLoading(true);
    setEvalMetricsError(null);
    return adminApi
      .get<Array<Record<string, any>>>(`/admin/api/ops/plans/${planId}/eval-metrics`)
      .then((res) => {
        setEvalMetrics(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        setEvalMetrics([]);
        const message = getAdminApiErrorMessage(err);
        setEvalMetricsError(message || "?âÍ? Î¶¨Ìè¨?∏Î? Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??");
      })
      .finally(() => {
        setEvalMetricsLoading(false);
      });
  }, [planId]);

  useEffect(() => {
    if (activeTab !== "tasks") return;
    fetchGoldenHourConfig();
  }, [activeTab, fetchGoldenHourConfig]);

  useEffect(() => {
    if (activeTab !== "report") return;
    fetchEvalMetrics();
  }, [activeTab, fetchEvalMetrics]);

  const [taskDraft, setTaskDraft] = useState<LocalTaskDraft>({ slot_time: "", title: "" });

  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [experimentDrafts, setExperimentDrafts] = useState<Record<number, OpsExperimentDraft>>({});

  const [toggleDrafts, setToggleDrafts] = useState<Record<number, { action: string; multiplier: string }>>({});
  const [dmDrafts, setDmDrafts] = useState<
    Record<number, { kind: string; audience: string; channel: string; message: string; target_list_id?: number | null }>
  >({});
  const [grantDrafts, setGrantDrafts] = useState<
    Record<number, { items: { item_type: string; amount: string }[]; reason: string; target_list_id?: number | null }>
  >({});
  const [broadcastDrafts, setBroadcastDrafts] = useState<Record<number, { channel: string; message: string; target_list_id?: number | null }>>({});
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
    const ok = window.confirm("??Ï∫†Ìéò?∏ÏùÑ 'Î≥¥Í?(ARCHIVED)' Ï≤òÎ¶¨?†Íπå??\n(?åÎûú/?úÏä§?¨Îäî ?†Ï??òÎ©∞, ?ÑÏöî ???§Ïãú ?¥Îûå Í∞Ä?•Ìï©?àÎã§.)");
    if (!ok) return;

    try {
      await updateCampaign.mutateAsync({ campaignId: selectedCampaignId, patch: { status: "ARCHIVED" } });
      addToast("Ï∫†Ìéò?∏ÏùÑ Î≥¥Í?(ARCHIVED) Ï≤òÎ¶¨?àÏäµ?àÎã§.", "success");
    } catch {
      addToast("Ï∫†Ìéò??Î≥¥Í????§Ìå®?àÏäµ?àÎã§.", "error");
    }
  };

  const onDeleteTodayPlan = async () => {
    if (!planId) return;
    const ok = window.confirm(
      "?§Îäò ?åÎûú????†ú(Ï¥àÍ∏∞???†Íπå??\n- ?åÎûú???çÌïú ?ëÏóÖ?Ä ?®Íªò ??†ú?©Îãà??\n- ?îÎ©¥?Ä ?êÎèô?ºÎ°ú ???åÎûú???§Ïãú ?ùÏÑ±?©Îãà??",
    );
    if (!ok) return;

    try {
      await deletePlan.mutateAsync(planId);
      setTaskDraft({ slot_time: "", title: "" });
      setSelectedActionIds([]);
      setExperimentDrafts({});
      setToggleDrafts({});
      setDmDrafts({});
      setPiiConfirmTaskId(null);
      setPiiHitsByTaskId({});
      addToast("?§Îäò ?åÎûú??Ï¥àÍ∏∞?îÌñà?µÎãà??", "success");
      await planQuery.refetch();
    } catch {
      addToast("?åÎûú ??†ú???§Ìå®?àÏäµ?àÎã§.", "error");
    }
  };

  const onDeleteSingleTask = async (taskId: number) => {
    const ok = window.confirm("???ëÏóÖ????†ú?†Íπå??");
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
      addToast("?ëÏóÖ????†ú?àÏäµ?àÎã§.", "success");
    } catch {
      addToast("?ëÏóÖ ??†ú???§Ìå®?àÏäµ?àÎã§.", "error");
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

  /*
  const onAddPlaybookAction = async () => {
    if (!planId) return;
    const action = OPS_PLAYBOOK_ACTIONS.find((a) => selectedActionIds.includes(a.id));
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
          window: action.default_window ?? "?πÏùº",
          before: null,
          after: null,
          evidence: "",
          note: "",
        },
      },
    });
  };
  */

  const getExperimentDraft = (payloadJson: Record<string, unknown> | null | undefined): OpsExperimentDraft => {
    const existing = (payloadJson ?? {}) as Record<string, unknown>;
    const exp = (existing.experiment ?? {}) as Record<string, unknown>;
    const metric_key = (exp.metric_key as StandardMetricKey) ?? "OTHER";
    return {
      metric_key,
      metric_custom_key: String(exp.metric_custom_key ?? ""),
      window: String(exp.window ?? "?πÏùº"),
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
      addToast("ÏßÄÍ∏??ÑÏù¥?úÏù¥ ÎπÑÏñ¥?àÏäµ?àÎã§. item_typeÍ≥?amount(?ëÏàò)Î•??ÖÎ†•??Ï£ºÏÑ∏??", "error");
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
      `?†Ô∏è ?ÑÏ≤¥ ?†Ï?(?ÅÌÉú Î¨¥Í?)?êÍ≤å ?ÑÏù¥?úÏùÑ ÏßÄÍ∏âÌï©?àÎã§.\n\n?ëÏóÖ ID: ${taskId}\n?¨Ïú†: ${draft.reason}\n\nÏßÄÍ∏?Î™©Î°ù:\n${lines}\n\n?§Ìñâ ???òÎèåÎ¶????ÜÏäµ?àÎã§. ÏßÑÌñâ?†Íπå??`
    );
  };

  const onAddPresetToggle = async (mode: "FORCE_ON" | "FORCE_OFF" | "MULTIPLIER_SET") => {
    if (!planId) return;
    const title =
      mode === "FORCE_ON" ? "Í≥®Îì†?ÑÏõå FORCE_ON" :
        mode === "FORCE_OFF" ? "Í≥®Îì†?ÑÏõå FORCE_OFF" :
          "Í≥®Îì†?ÑÏõå MULTIPLIER_SET";

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
      title: "?§Î¨∏ DM Î∞úÏÜ°",
      slot_time: null,
      type: "DM",
      status: "TODO",
      payload_json: {
        kind: "SURVEY_DM",
        channel: "TELEGRAM_DM",
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

  const saveDmPayload = (
    taskId: number,
    draft: { kind: string; audience: string; channel: string; message: string; target_list_id?: number | null },
    opts?: { bypassPii?: boolean },
  ) => {
    const rawAudience = (draft.audience || "").trim();
    const message = draft.message ?? "";
    const targetListId = draft.target_list_id ?? null;
    const channel = (draft.channel || "TELEGRAM_DM").trim();
    const kind = (draft.kind || "MESSAGE_TEMPLATE").trim();

    const audience = ((): string => {
      if (rawAudience === "ALL") return "ALL_USERS";
      if (rawAudience === "TARGET") return "TARGET_LIST";
      if (rawAudience) return rawAudience;
      return targetListId ? "TARGET_LIST" : "ALL_USERS";
    })();

    if (audience === "TARGET_LIST" && !targetListId) {
      addToast("?ÄÍπ?Î¶¨Ïä§?∏Î? ?†ÌÉù?òÏÑ∏??", "error");
      return;
    }

    if (!opts?.bypassPii) {
      const hits = findPiiHits(message);
      if (hits.length > 0) {
        setPiiConfirmTaskId(taskId);
        setPiiHitsByTaskId((prev) => ({ ...prev, [taskId]: hits }));
        addToast("PII(?ÑÌôî/?¥Î©î??Í≥ÑÏ¢å) ?òÏã¨ ?®ÌÑ¥??Í∞êÏ??òÏñ¥ ?Ä?•ÏùÑ Î≥¥Î•ò?àÏäµ?àÎã§. ?ÑÎûò?êÏÑú 'Î¨¥Ïãú?òÍ≥† ?Ä?????åÎü¨???Ä?•Îê©?àÎã§.", "error");
        return;
      }
    }

    if (piiConfirmTaskId === taskId) setPiiConfirmTaskId(null);

    updateTask.mutate({
      taskId,
      patch: {
        type: "DM",
        payload_json: {
          kind,
          channel,
          audience,
          message,
          target_list_id: targetListId,
        },
      },
    });
  };

  const saveGrantPayload = (
    taskId: number,
    draft: { items: { item_type: string; amount: string }[]; reason: string; target_list_id?: number | null },
  ) => {
    const cleanedItems = (draft.items || [])
      .map((it) => ({ item_type: it.item_type.trim(), amount: Number(it.amount || "0") }))
      .filter((it) => it.item_type && it.amount > 0);
    if (cleanedItems.length === 0) {
      addToast("ÏßÄÍ∏âÌï† Î≥¥ÏÉÅ(?¨Ïù∏???ÑÏù¥?????òÎÇò ?¥ÏÉÅ ?ÖÎ†•?òÏÑ∏??", "error");
      return;
    }
    if (!draft.target_list_id) {
      const ok = window.confirm("?ÄÍπ?Î¶¨Ïä§?∏Í? ÎπÑÏñ¥ ?àÏäµ?àÎã§.\n?ÑÏ≤¥ ÏßÄÍ∏??ÑÌóò???àÏñ¥ ?ïÏù∏???ÑÏöî?©Îãà?? Í≥ÑÏÜç ?Ä?•Ìï†ÍπåÏöî?");
      if (!ok) return;
    }
    updateTask.mutate({
      taskId,
      patch: {
        type: "GRANT",
        payload_json: {
          kind: "TARGETED_ITEM_GRANT",
          items: cleanedItems,
          reason: (draft.reason || "OPS_PLAN_GRANT").trim(),
          target_list_id: draft.target_list_id ?? null,
        },
      },
    });
  };

  const saveBroadcastPayload = (
    taskId: number,
    draft: { channel: string; message: string; target_list_id?: number | null },
  ) => {
    if (!draft.message.trim()) {
      addToast("Î©îÏãúÏßÄÎ•??ÖÎ†•?òÏÑ∏??", "error");
      return;
    }
    const hits = findPiiHits(draft.message);
    if (hits.length > 0) {
      addToast(`PII(?ÑÌôî/?¥Î©î??Í≥ÑÏ¢å) ?òÏã¨ ?®ÌÑ¥ Í∞êÏ?: ${hits.map((h) => h.type).join(", ")}`, "error");
      return;
    }
    updateTask.mutate({
      taskId,
      patch: {
        type: "BROADCAST",
        payload_json: {
          kind: "TARGETLIST_BROADCAST",
          channel: (draft.channel || "CHANNEL").trim(),
          message: draft.message,
          target_list_id: draft.target_list_id ?? null,
        },
      },
    });
  };

  /*
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _saveWebhookPayload = (taskId: number, draft: { url: string; message: string; severity: string }) => {
    if (!draft.url.trim()) {
      addToast("?πÌõÖ URL???ÖÎ†•?òÏÑ∏??", "error");
      return;
    }
    updateTask.mutate({
      taskId,
      patch: {
        type: "WEBHOOK",
        payload_json: {
          kind: "WEBHOOK_ALERT",
          url: draft.url.trim(),
          message: draft.message,
          severity: draft.severity || "INFO",
        },
      },
    });
  };
  */

  const tasks = tasksQuery.data ?? [];
  const actorIds = useMemo(
    () =>
      Array.from(
        new Set(
          tasks
            .map((t) => t.actor_admin_id)
            .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
        )
      ),
    [tasks]
  );

  useEffect(() => {
    if (actorIds.length === 0) return;
    const missing = actorIds.filter((id) => !adminNameById[id]);
    if (missing.length === 0) return;

    let mounted = true;
    Promise.all(
      missing.map(async (id) => {
        try {
          const users = await fetchUsers(`id:${id}`);
          const user = users[0];
          const name = user?.admin_profile?.real_name || user?.nickname || `Admin #${id}`;
          return { id, name };
        } catch {
          return { id, name: `Admin #${id}` };
        }
      })
    ).then((results) => {
      if (!mounted) return;
      setAdminNameById((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          next[r.id] = r.name;
        });
        return next;
      });
    });

    return () => {
      mounted = false;
    };
  }, [actorIds, adminNameById]);
  const filteredTasks = tasks.filter((t) => {
    const statusOk = filterStatus === "ALL" || t.status === filterStatus;
    const typeOk = filterType === "ALL" || t.type === filterType;
    const term = searchTerm.trim().toLowerCase();
    const textOk = !term || `${t.title} ${t.memo ?? ""}`.toLowerCase().includes(term);
    return statusOk && typeOk && textOk;
  });
  const timelineTasks = useMemo(
    () =>
      [...tasks]
        .filter((t) => t.executed_at)
        .sort((a, b) => String(b.executed_at).localeCompare(String(a.executed_at))),
    [tasks]
  );

  return (
    <section className="admin-page-container">
      <header className="flex flex-col gap-2 border-b border-admin-border pb-6 pt-4">
        <h1 className="text-3xl font-bold text-admin-text-base tracking-tight uppercase">
          ?¥ÏòÅÍ≥ÑÌöç <span className="text-admin-brand/40">?åÎ†à?¥Î∂Å</span>
        </h1>

        <div>
          <Link
            to="/admin/ops/logs"
            className="inline-flex items-center gap-2 rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70"
            aria-label="Í∏∞Ï°¥ ?¥ÏòÅÎ°úÍ∑∏ Î≥¥Í∏∞"
            title="Í∏∞Ï°¥ ?¥ÏòÅÎ°úÍ∑∏ Î≥¥Í∏∞"
          >
            Í∏∞Ï°¥ ?¥ÏòÅÎ°úÍ∑∏ Î≥¥Í∏∞
          </Link>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-admin-border bg-admin-sidebar p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-admin-subtitle text-admin-text-primary">Ï∫†Ìéò??/h2>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70"
                onClick={() => campaignsQuery.refetch()}
                aria-label="Ï∫†Ìéò??Î™©Î°ù ?àÎ°úÍ≥†Ïπ®"
                title="?àÎ°úÍ≥†Ïπ®"
              >
                <RefreshCw size={14} />
                ?àÎ°úÍ≥†Ïπ®
              </button>
            </div>

            <div className="mt-3">
              <label htmlFor="ops-campaign-select" className="block text-xs font-bold text-admin-text-muted">
                Ï∫†Ìéò???†ÌÉù
              </label>
              <select
                id="ops-campaign-select"
                className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text-primary"
                value={selectedCampaignId ?? ""}
                onChange={(e) => setSelectedCampaignId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">(?†ÌÉù?òÏÑ∏??</option>
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
                  aria-label="Ï∫†Ìéò??Î≥¥Í?(ARCHIVED)"
                  title="Î≥¥Í?(ARCHIVED)"
                >
                  <Trash2 size={14} />
                  Î≥¥Í?
                </button>
              </div>

              {campaignsQuery.isLoading && (
                <div className="mt-2 text-xs text-admin-text-muted">Î∂àÎü¨?§Îäî Ï§ë‚Ä?/div>
              )}
              {campaignsQuery.error && (
                <div className="mt-2 text-xs text-admin-danger">Ï∫†Ìéò??Î°úÎìú ?§Ìå®</div>
              )}
            </div>

            <div className="mt-4 border-t border-admin-border pt-4">
              <label htmlFor="ops-campaign-new" className="block text-xs font-bold text-admin-text-muted">
                ??Ï∫†Ìéò??ÎßåÎì§Í∏?
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="ops-campaign-new"
                  className="flex-1 rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm text-admin-text-primary min-w-0"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="?? 1/13 ?§Î¨∏+Í≥®Îì†?ÑÏõå"
                />
                <button
                  type="button"
                  className="btn-admin-primary shrink-0 whitespace-nowrap"
                  onClick={onCreateCampaign}
                  disabled={createCampaign.isPending || !newCampaignName.trim()}
                  aria-label="Ï∫†Ìéò???ùÏÑ±"
                  title="Ï∫†Ìéò???ùÏÑ±"
                >
                  <Plus size={16} />
                  ?ùÏÑ±
                </button>
              </div>
              {createCampaign.error && (
                <div className="mt-2 text-xs text-admin-danger">Ï∫†Ìéò???ùÏÑ± ?§Ìå®</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-admin-border bg-admin-sidebar p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-admin-subtitle text-admin-text-primary">?§Îäò ?åÎûú</h2>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-admin-danger/40 bg-admin-danger/10 px-3 py-2 text-xs font-bold text-admin-danger hover:bg-admin-danger/15 disabled:opacity-50"
                onClick={onDeleteTodayPlan}
                disabled={!planId || deletePlan.isPending}
                aria-label="?§Îäò ?åÎûú ??†ú(Ï¥àÍ∏∞??"
                title="?åÎûú ??†ú(Ï¥àÍ∏∞??"
              >
                <Trash2 size={14} />
                Ï¥àÍ∏∞??
              </button>
            </div>
            <div className="mt-2 text-sm text-admin-text-secondary font-mono bg-admin-bg/50 px-3 py-1.5 rounded-lg inline-block border border-white/5">
              {todayKst}
            </div>
            {planQuery.isLoading && <div className="mt-2 text-xs text-admin-text-muted">?åÎûú ?ùÏÑ±/Ï°∞Ìöå Ï§ë‚Ä?/div>}
            {planQuery.error && <div className="mt-2 text-xs text-admin-danger">?åÎûú Î°úÎìú ?§Ìå®</div>}

          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                activeTab === "tasks"
                  ? "border-admin-brand bg-admin-brand text-white"
                  : "border-admin-border bg-admin-bg text-admin-text-secondary"
              }`}
              onClick={() => setActiveTab("tasks")}
            >
              ?ëÏóÖ
            </button>
            <button
              type="button"
              className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                activeTab === "timeline"
                  ? "border-admin-brand bg-admin-brand text-white"
                  : "border-admin-border bg-admin-bg text-admin-text-secondary"
              }`}
              onClick={() => setActiveTab("timeline")}
            >
              ?Ä?ÑÎùº??
            </button>
            <button
              type="button"
              className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                activeTab === "report"
                  ? "border-admin-brand bg-admin-brand text-white"
                  : "border-admin-border bg-admin-bg text-admin-text-secondary"
              }`}
              onClick={() => setActiveTab("report")}
            >
              ?âÍ? Î¶¨Ìè¨??
            </button>
          </div>

          {activeTab === "tasks" && (
            <>
              <div className="rounded-xl border border-admin-border bg-admin-sidebar p-4 shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-admin-subtitle text-admin-text-primary">Í≥®Îì†?ÑÏõå ?ÅÌÉú</h2>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70 disabled:opacity-50"
                    onClick={() => fetchGoldenHourConfig()}
                    disabled={goldenHourLoading}
                    aria-label="Í≥®Îì†?ÑÏõå ?ÅÌÉú ?àÎ°úÍ≥†Ïπ®"
                    title="?àÎ°úÍ≥†Ïπ®"
                  >
                    <RefreshCw size={14} />
                    ?àÎ°úÍ≥†Ïπ®
                  </button>
                </div>
                {goldenHourLoading && <div className="mt-2 text-xs text-admin-text-muted">Î∂àÎü¨?§Îäî Ï§ë‚Ä?/div>}
                {goldenHourError && <div className="mt-2 text-xs text-admin-danger">{goldenHourError}</div>}
                {goldenHourConfig && (
                  <div className="mt-3 grid grid-cols-12 gap-3 text-xs">
                    <div className="col-span-12 md:col-span-4 rounded-lg border border-admin-border bg-admin-bg px-3 py-2">
                      ?ÅÌÉú: {goldenHourConfig.enabled ? "ON" : "OFF"}
                    </div>
                    <div className="col-span-12 md:col-span-4 rounded-lg border border-admin-border bg-admin-bg px-3 py-2">
                      Î™®Îìú: {goldenHourConfig.manual_override}
                    </div>
                    <div className="col-span-12 md:col-span-4 rounded-lg border border-admin-border bg-admin-bg px-3 py-2">
                      Î∞∞Ïàò: {goldenHourConfig.multiplier}x
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-admin-border bg-admin-sidebar p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-admin-subtitle text-admin-text-primary">?ëÏóÖ Ï≤¥ÌÅ¨Î¶¨Ïä§??/h2>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70"
                onClick={() => tasksQuery.refetch()}
                disabled={!planId}
                aria-label="?ëÏóÖ Î™©Î°ù ?àÎ°úÍ≥†Ïπ®"
                title="?àÎ°úÍ≥†Ïπ®"
              >
                <RefreshCw size={14} />
                ?àÎ°úÍ≥†Ïπ®
              </button>
            </div>

            <div className="mt-3 grid grid-cols-12 gap-2">
              <div className="col-span-12 md:col-span-3">
                <label htmlFor="ops-task-slot" className="block text-xs font-bold text-admin-text-muted">?úÍ∞Ñ(HH:MM)</label>
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
                <label htmlFor="ops-task-title" className="block text-xs font-bold text-admin-text-muted">?ëÏóÖ ?úÎ™©</label>
                <input
                  id="ops-task-title"
                  className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-sm"
                  value={taskDraft.title}
                  onChange={(e) => setTaskDraft((p) => ({ ...p, title: e.target.value }))}
                  placeholder="?? Í≥®Îì†?ÑÏõå FORCE_ON 2.5Î∞?
                  disabled={!planId}
                />
              </div>
              <div className="col-span-12 md:col-span-2 flex items-end">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-admin-brand px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                  onClick={onAddTask}
                  disabled={!planId || !taskDraft.title.trim() || createTask.isPending}
                  aria-label="?ëÏóÖ Ï∂îÍ?"
                  title="?ëÏóÖ Ï∂îÍ?"
                >
                  <Plus size={16} />
                  Ï∂îÍ?
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70 disabled:opacity-50"
                onClick={() => onAddPresetToggle("FORCE_ON")}
                disabled={!planId || createTask.isPending}
                aria-label="Í≥®Îì†?ÑÏõå FORCE_ON ?ÑÎ¶¨??Ï∂îÍ?"
                title="Í≥®Îì†?ÑÏõå FORCE_ON"
              >
                Í≥®Îì†?ÑÏõå ON
              </button>
              <button
                type="button"
                className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70 disabled:opacity-50"
                onClick={() => onAddPresetToggle("FORCE_OFF")}
                disabled={!planId || createTask.isPending}
                aria-label="Í≥®Îì†?ÑÏõå FORCE_OFF ?ÑÎ¶¨??Ï∂îÍ?"
                title="Í≥®Îì†?ÑÏõå FORCE_OFF"
              >
                Í≥®Îì†?ÑÏõå OFF
              </button>
              <button
                type="button"
                className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70 disabled:opacity-50"
                onClick={() => onAddPresetToggle("MULTIPLIER_SET")}
                disabled={!planId || createTask.isPending}
                aria-label="Í≥®Îì†?ÑÏõå MULTIPLIER_SET ?ÑÎ¶¨??Ï∂îÍ?"
                title="Í≥®Îì†?ÑÏõå MULTIPLIER_SET"
              >
                Í≥®Îì†?ÑÏõå Î∞∞Ïàò
              </button>
              <button
                type="button"
                className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70 disabled:opacity-50"
                onClick={onAddPresetDm}
                disabled={!planId || createTask.isPending}
                aria-label="?§Î¨∏ DM ?ÑÎ¶¨??Ï∂îÍ?"
                title="?§Î¨∏ DM"
              >
                ?§Î¨∏ DM
              </button>
            </div>

            <div className="mt-3 rounded-lg border border-admin-border bg-admin-bg/40 p-3">
              <div className="text-xs font-bold text-admin-text-muted">?åÎ†à?¥Î∂Å ?°ÏÖò ?§Ï§ë Ï∂îÍ? (?§Ìóò Ï∂îÏ†Å ?¨Ìï®)</div>
              <div className="mt-2 grid grid-cols-12 gap-2">
                <div className="col-span-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-lg border border-admin-border bg-admin-bg/60 p-2">
                    {OPS_PLAYBOOK_ACTIONS.map((a) => {
                      const checked = selectedActionIds.includes(a.id);
                      return (
                        <label key={a.id} className="flex items-start gap-2 text-xs text-admin-text-primary">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedActionIds((prev) =>
                                e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id)
                              );
                            }}
                            disabled={!planId}
                          />
                          <span>
                            <span className="font-bold text-admin-text-base">{a.title}</span>
                            {a.slot_time && <span className="ml-2 text-admin-text-muted">({a.slot_time})</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="col-span-12 flex items-center justify-between text-[11px] text-admin-text-muted">
                  <span>?†ÌÉù??{selectedActionIds.length}Í∞??°ÏÖò???úÎ≤à??Ï∂îÍ??©Îãà??</span>
                  <button
                    type="button"
                    className="rounded-lg bg-admin-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    onClick={async () => {
                      if (!planId || selectedActionIds.length === 0) return;
                      for (const id of selectedActionIds) {
                        const action = OPS_PLAYBOOK_ACTIONS.find((a) => a.id === id);
                        if (!action) continue;
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
                              window: action.default_window ?? "??,
                              before: null,
                              after: null,
                              evidence: "",
                              note: "",
                            },
                          },
                        });
                      }
                      setSelectedActionIds([]);
                    }}
                    disabled={!planId || selectedActionIds.length === 0 || createTask.isPending}
                    aria-label="?åÎ†à?¥Î∂Å ?°ÏÖò ?ëÏóÖ Ï∂îÍ?"
                    title="Ï∂îÍ?"
                  >
                    ?†ÌÉù ?°ÏÖò Ï∂îÍ?
                  </button>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-admin-text-muted">
                ?úÏ? ÏßÄ???úÎ°≠?§Ïö¥ + ?¥Ï†Ñ/?¥ÌõÑ Í∞?+ Í∏∞Í∞Ñ + Í∑ºÍ±∞ ÎßÅÌÅ¨Î•?payload_json???Ä?•Ìï©?àÎã§.
              </div>
            </div>

            <div className="mt-3 grid grid-cols-12 gap-2">
              <div className="col-span-12 md:col-span-4">
                <label htmlFor="ops-filter-status" className="block text-[11px] font-bold text-admin-text-muted">
                  ?ÅÌÉú ?ÑÌÑ∞
                </label>
                <select
                  id="ops-filter-status"
                  className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="ALL">?ÑÏ≤¥</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s] ?? s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-12 md:col-span-4">
                <label htmlFor="ops-filter-type" className="block text-[11px] font-bold text-admin-text-muted">
                  ?Ä???ÑÌÑ∞
                </label>
                <select
                  id="ops-filter-type"
                  className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="ALL">?ÑÏ≤¥</option>
                  {TYPE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {TYPE_LABEL[s] ?? s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-12 md:col-span-4">
                <label htmlFor="ops-filter-search" className="block text-[11px] font-bold text-admin-text-muted">
                  Í≤Ä???úÎ™©/Î©îÎ™®)
                </label>
                <input
                  id="ops-filter-search"
                  className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                  placeholder="Í≤Ä?âÏñ¥ ?ÖÎ†•"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>



            <OpsTaskList>
              {filteredTasks.map((t) => {
                const isCollapsed = !!collapsedTaskIds[t.id];
                const isExecuting = executeTask.isPending && executeTask.variables?.taskId === t.id;
                return (
                  <OpsTaskCard
                    key={t.id}
                    collapsed={isCollapsed}
                    onToggleCollapse={() =>
                      setCollapsedTaskIds((prev) => ({ ...prev, [t.id]: !prev[t.id] }))
                    }
                    header={
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="font-mono text-sm text-admin-text-muted">{t.slot_time || "-"}</div>
                          <div className="text-admin-text-primary text-sm font-semibold md:text-base">{t.title}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <label htmlFor={`ops-task-status-${t.id}`} className="sr-only">
                            ?ÅÌÉú
                          </label>
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
                                {STATUS_LABEL[s] ?? s}
                              </option>
                            ))}
                          </select>
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
                                  .then(() => addToast("?§Ìñâ ?ÑÎ£å", "success"))
                                  .catch((err) => {
                                    addToast(humanizeOpsPlanError(getAdminApiErrorMessage(err)), "error");
                                  });
                              }}
                              disabled={!planId || executeTask.isPending}
                              aria-label="?ëÏóÖ ?§Ìñâ(?ÑÎ£å Ï≤òÎ¶¨)"
                              title="?§Ìñâ"
                            >
                              ?§Ìñâ
                            </button>
                            {!isInventoryGrantAllTask((t.payload_json ?? {}) as Record<string, unknown>) && (
                              <button
                                type="button"
                                className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70 disabled:opacity-50"
                                onClick={() => updateTask?.mutate({ taskId: t.id, patch: { status: "DONE" } })}
                                disabled={!planId || updateTask.isPending}
                                aria-label="?ëÏóÖ ?ÑÎ£å Ï≤¥ÌÅ¨"
                                title="?ÑÎ£å"
                              >
                                ?ÑÎ£å
                              </button>
                            )}
                            <button
                              type="button"
                              className="rounded-lg border border-admin-danger/40 bg-admin-danger/10 px-3 py-2 text-xs font-bold text-admin-danger hover:bg-admin-danger/15 disabled:opacity-50"
                              onClick={() => onDeleteSingleTask(t.id)}
                              disabled={!planId || deleteTask.isPending}
                              aria-label="?ëÏóÖ ??†ú"
                              title="??†ú"
                            >
                              ??†ú
                            </button>
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <TaskEditor title={t.title} typeLabel={TYPE_LABEL[t.type] ?? t.type}>

                                                <div className="grid grid-cols-12 gap-2">
                                                  <div className="col-span-12 md:col-span-4">
                                                    <label htmlFor={`ops-task-type-${t.id}`} className="sr-only">?Ä??/label>
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
                                                          {TYPE_LABEL[opt] ?? opt}
                                                        </option>
                                                      ))}
                                                    </select>
                                                  </div>
                                                  <div className="col-span-12 md:col-span-8">
                                                    <label htmlFor={`ops-task-memo-${t.id}`} className="sr-only">Î©îÎ™®</label>
                                                    <input
                                                      id={`ops-task-memo-${t.id}`}
                                                      className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                                      placeholder="Î©îÎ™®(?†ÌÉù)"
                                                      defaultValue={t.memo ?? ""}
                                                      onBlur={(e) => {
                                                        const memo = e.target.value;
                                                        if ((t.memo ?? "") === memo) return;
                                                        updateTask.mutate({ taskId: t.id, patch: { memo } });
                                                      }}
                                                    />
                                                  </div>
                                                </div>

                                            {(() => {
                                              if (!isInventoryGrantAllTask(t.payload_json as Record<string, unknown> | null | undefined)) return null;
                                              const payload = (t.payload_json ?? {}) as Record<string, unknown>;
                                              const draft = getInventoryGrantAllDraft(payload);

                                              return (
                                                <div className="mt-3 rounded-lg border border-admin-danger/40 bg-admin-danger/5 p-3">
                                                  <div className="text-xs font-bold text-admin-danger">?ÑÏ≤¥ ?†Ï? ?ÑÏù¥??ÏßÄÍ∏?(?ÑÏõê)</div>
                                                  <div className="mt-2 grid grid-cols-12 gap-2">
                                                    <div className="col-span-12 md:col-span-6">
                                                      <label htmlFor={`ops-grantall-reason-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                                        reason(ledger)
                                                      </label>
                                                      <input
                                                        id={`ops-grantall-reason-${t.id}`}
                                                        className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                                        defaultValue={draft.reason}
                                                        placeholder="?? OPS_PLAN_GRANT_ALL"
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
                                                        aria-label="?ÑÏõê ÏßÄÍ∏?payload ?Ä??
                                                        title="?Ä??
                                                      >
                                                        ?Ä??
                                                      </button>
                                                    </div>
                                                  </div>

                                                  <div className="mt-3 space-y-2">
                                                    {(draft.items ?? []).map((it, idx) => (
                                                      <div key={`${t.id}-grantall-${idx}`} className="grid grid-cols-12 gap-2">
                                                        <div className="col-span-12 md:col-span-8">
                                                          <ItemSelector
                                                            label="item_type"
                                                            value={it.item_type}
                                                            onChange={(value) => {
                                                              const nextItems = [...draft.items];
                                                              nextItems[idx] = { ...nextItems[idx], item_type: value };
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
                                                            aria-label="?ÑÏù¥??Ï§???†ú"
                                                            title="??†ú"
                                                          >
                                                            ??†ú
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
                                                        aria-label="?ÑÏù¥??Ï§?Ï∂îÍ?"
                                                        title="Ï∂îÍ?"
                                                      >
                                                        ?ÑÏù¥??Ï∂îÍ?
                                                      </button>
                                                    </div>
                                                  </div>

                                                  <div className="mt-2 text-[11px] text-admin-text-muted">
                                                    ?§Ìñâ ?? ?ÑÏõê(?ÅÌÉú Î¨¥Í?) ÏßÄÍ∏?¬∑ Ï§ëÎ≥µ ?§Ìñâ Î∞©Ï?(?¨Ïã§??409)
                                                  </div>
                                                </div>
                                              );
                                            })()}

                                            {t.type === "TOGGLE" && (
                                              <div className="mt-3 rounded-lg border border-admin-border bg-admin-bg/40 p-3">
                                                <div className="text-xs font-bold text-admin-text-muted">TOGGLE ?ÑÎ¶¨??(Í≥®Îì†?ÑÏõå)</div>
                                                {(() => {
                                                  const payload = (t.payload_json ?? {}) as Record<string, unknown>;
                                                  const draft = toggleDrafts[t.id] ?? {
                                                    action: String(payload.action ?? "FORCE_ON"),
                                                    multiplier: payload.multiplier == null ? "" : String(payload.multiplier),
                                                  };
                                                  const currentMultiplier = goldenHourConfig?.multiplier;
                                                  const nextMultiplier = Number(draft.multiplier);
                                                  const showPreview =
                                                    draft.action === "MULTIPLIER_SET" && Number.isFinite(nextMultiplier) && currentMultiplier != null;

                                                  return (
                                                    <div className="mt-2 grid grid-cols-12 gap-2">
                                                      <div className="col-span-12 md:col-span-5">
                                                        <label htmlFor={`ops-toggle-action-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                                          ?ôÏûë
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
                                                          Î∞∞Ïàò(?µÏÖò)
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
                                                          placeholder="?? 2.5"
                                                          disabled={draft.action !== "MULTIPLIER_SET"}
                                                        />
                                                        {showPreview && (
                                                          <div className="mt-1 text-[11px] text-admin-text-muted">
                                                            ?ÑÏû¨ {currentMultiplier}Î∞???Î≥ÄÍ≤?{nextMultiplier}Î∞?
                                                          </div>
                                                        )}
                                                      </div>
                                                      <div className="col-span-12 md:col-span-2 flex items-end">
                                                        <button
                                                          type="button"
                                                          className="w-full rounded-lg bg-admin-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                                          onClick={() => saveTogglePayload(t.id, draft)}
                                                          disabled={updateTask.isPending}
                                                          aria-label="TOGGLE payload ?Ä??
                                                          title="?Ä??
                                                        >
                                                          ?Ä??
                                                        </button>
                                                      </div>
                                                    </div>
                                                  );
                                                })()}
                                              </div>
                                            )}

                                            {t.type === "DM" && (
                                              <div className="mt-3 rounded-lg border border-admin-border bg-admin-bg/40 p-3">
                                                <div className="text-xs font-bold text-admin-text-muted">DM ?ÑÎ¶¨??/div>
                                                {(() => {
                                                  const payload = (t.payload_json ?? {}) as Record<string, unknown>;
                                                  const draft = dmDrafts[t.id] ?? {
                                                    kind: String(payload.kind ?? "MESSAGE_TEMPLATE"),
                                                    channel: String(payload.channel ?? "TELEGRAM_DM"),
                                                    audience: String(payload.audience ?? (payload.target_list_id ? "TARGET_LIST" : "ALL_USERS")),
                                                    message: String(payload.message ?? ""),
                                                    target_list_id: payload.target_list_id as number | undefined,
                                                  };

                                                  const hits = piiHitsByTaskId[t.id] ?? [];
                                                  const needsConfirm = piiConfirmTaskId === t.id && hits.length > 0;
                                                  const selectedTargetList =
                                                    draft.target_list_id != null
                                                      ? (targetListsQuery.data ?? []).find((tl) => tl.id === draft.target_list_id) ?? null
                                                      : null;

                                                      return (
                                                        <div className="mt-2 space-y-2">
                                                          <div className="grid grid-cols-12 gap-2">
                                                            <div className="col-span-12 md:col-span-4">
                                                              <label htmlFor={`ops-dm-audience-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                                                ?Ä??
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
                                                                <option value="TARGET_LIST">TARGET_LIST</option>
                                                                <option value="ALL_USERS">ALL_USERS</option>
                                                                <option value="SURVEY_COMPLETERS">SURVEY_COMPLETERS</option>
                                                                <option value="SEGMENT">SEGMENT</option>
                                                              </select>
                                                            </div>
                                                            <div className="col-span-12 md:col-span-4">
                                                              <label htmlFor={`ops-dm-channel-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                                                Ï±ÑÎÑê
                                                              </label>
                                                              <select
                                                                id={`ops-dm-channel-${t.id}`}
                                                                className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                                                value={draft.channel}
                                                                onChange={(e) =>
                                                                  setDmDrafts((prev) => ({
                                                                    ...prev,
                                                                    [t.id]: { ...draft, channel: e.target.value },
                                                                  }))
                                                                }
                                                              >
                                                                <option value="TELEGRAM_DM">TELEGRAM_DM</option>
                                                                <option value="TELEGRAM_BROADCAST">TELEGRAM_BROADCAST</option>
                                                              </select>
                                                            </div>
                                                            <div className="col-span-12 md:col-span-4">
                                                              <label className="block text-[11px] font-bold text-admin-text-muted">?úÌîåÎ¶?Ï¢ÖÎ•ò</label>
                                                              <div className="mt-1 rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs text-admin-text-secondary">
                                                                {draft.kind}
                                                              </div>
                                                            </div>
                                                            <div className="col-span-12 md:col-span-12">
                                                              <label htmlFor={`ops-dm-message-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                                                Î©îÏãúÏßÄ
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
                                                                placeholder="(?? ?§Î¨∏ Í∞êÏÇ¨?©Îãà?? Î≥¥ÏÉÅ?Ä Í∏àÏùº 23:59ÍπåÏ???
                                                              />
                                                            </div>
                                                          </div>

                                                          <div className="grid grid-cols-12 gap-2">
                                                            <div className="col-span-12 md:col-span-6">
                                                              <TargetListSelector
                                                                label="?ÄÍπ?Î¶¨Ïä§???†ÌÉù)"
                                                                value={draft.target_list_id ?? null}
                                                                onChange={(value) =>
                                                                  setDmDrafts((prev) => ({
                                                                    ...prev,
                                                                    [t.id]: {
                                                                      ...draft,
                                                                      target_list_id: value ?? undefined,
                                                                      audience: value ? "TARGET_LIST" : draft.audience,
                                                                    },
                                                                  }))
                                                                }
                                                                lists={targetListsQuery.data ?? []}
                                                              />
                                                            </div>
                                                          </div>

                                                          {draft.target_list_id ? (
                                                            <TargetListPreview
                                                              targetListId={draft.target_list_id}
                                                              countSnapshot={selectedTargetList?.count_snapshot}
                                                            />
                                                          ) : (
                                                            <div className="text-[11px] text-admin-text-muted">?ÄÍπ?Î¶¨Ïä§?∏Î? ?†ÌÉù?òÎ©¥ Î©§Î≤Ñ ?òÌîå??Î≥¥Ïó¨Ï§çÎãà??</div>
                                                          )}

                                                      {needsConfirm && (
                                                        <div className="rounded-lg border border-admin-danger/40 bg-admin-danger/10 p-2 text-xs text-admin-danger">
                                                          PII ?òÏã¨ ?®ÌÑ¥ Í∞êÏ?: {hits.map((h) => h.type).join(", ")}
                                                          <div className="mt-2 flex items-center gap-2">
                                                            <button
                                                              type="button"
                                                              className="rounded-lg bg-admin-danger px-3 py-2 text-xs font-bold text-white"
                                                              onClick={() => saveDmPayload(t.id, draft, { bypassPii: true })}
                                                              aria-label="PII Î¨¥Ïãú?òÍ≥† ?Ä??
                                                              title="Î¨¥Ïãú?òÍ≥† ?Ä??
                                                            >
                                                              Î¨¥Ïãú?òÍ≥† ?Ä??
                                                            </button>
                                                            <button
                                                              type="button"
                                                              className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary"
                                                              onClick={() => setPiiConfirmTaskId(null)}
                                                              aria-label="Ï∑®ÏÜå"
                                                              title="Ï∑®ÏÜå"
                                                            >
                                                              Ï∑®ÏÜå
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
                                                          aria-label="DM payload ?Ä??
                                                          title="?Ä??
                                                        >
                                                          ?Ä??
                                                        </button>
                                                      </div>
                                                    </div>
                                                  );
                                                })()}
                                              </div>
                                            )}

                                            {t.type === "GRANT" && (
                                              <div className="mt-3 rounded-lg border border-admin-border bg-admin-bg/40 p-3">
                                                <div className="text-xs font-bold text-admin-text-muted">ÏßÄÍ∏??§Ï†ï (?ÄÍπ?Î¶¨Ïä§??</div>
                                                {(() => {
                                                  const payload = (t.payload_json ?? {}) as Record<string, unknown>;
                                                  const draft = grantDrafts[t.id] ?? {
                                                    items: Array.isArray((payload as any).items)
                                                      ? ((payload as any).items as any[]).map((it) => ({
                                                          item_type: String((it as any).item_type ?? "POINT"),
                                                          amount: (it as any).amount == null ? "" : String((it as any).amount),
                                                        }))
                                                      : [{ item_type: String(payload.item_type ?? "POINT"), amount: payload.amount == null ? "" : String(payload.amount ?? "") }],
                                                    reason: String(payload.reason ?? "OPS_PLAN_GRANT"),
                                                    target_list_id: payload.target_list_id as number | undefined,
                                                  };
                                                  const selectedTargetList =
                                                    draft.target_list_id != null
                                                      ? (targetListsQuery.data ?? []).find((tl) => tl.id === draft.target_list_id) ?? null
                                                      : null;

                                                  return (
                                              <div className="space-y-3 mt-2">
                                                      <div className="grid grid-cols-12 gap-2">
                                                        <div className="col-span-12 md:col-span-8">
                                                          <div className="space-y-2">
                                                            {(draft.items || []).map((it, idx) => (
                                                              <div key={`${t.id}-grant-${idx}`} className="grid grid-cols-12 gap-2">
                                                                <div className="col-span-12 md:col-span-6">
                                                                  <ItemSelector
                                                                    label="Î≥¥ÏÉÅ ÏΩîÎìú"
                                                                    value={it.item_type}
                                                                    onChange={(value) =>
                                                                      setGrantDrafts((prev) => {
                                                                        const next = { ...draft, items: [...draft.items] };
                                                                        next.items[idx] = { ...next.items[idx], item_type: value };
                                                                        return { ...prev, [t.id]: next };
                                                                      })
                                                                    }
                                                                  />
                                                                </div>
                                                                <div className="col-span-12 md:col-span-5">
                                                                  <label className="block text-[11px] font-bold text-admin-text-muted">?òÎüâ/Í∏àÏï°</label>
                                                                  <input
                                                                    className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                                                    value={it.amount}
                                                                    inputMode="decimal"
                                                                    onChange={(e) =>
                                                                      setGrantDrafts((prev) => {
                                                                        const next = { ...draft, items: [...draft.items] };
                                                                        next.items[idx] = { ...next.items[idx], amount: e.target.value };
                                                                        return { ...prev, [t.id]: next };
                                                                      })
                                                                    }
                                                                    placeholder="?´Ïûê"
                                                                  />
                                                                </div>
                                                                <div className="col-span-12 md:col-span-1 flex items-end">
                                                                  <button
                                                                    type="button"
                                                                    className="w-full rounded-lg border border-admin-danger/40 bg-admin-danger/10 px-3 py-2 text-xs font-bold text-admin-danger hover:bg-admin-danger/15"
                                                                    onClick={() =>
                                                                      setGrantDrafts((prev) => {
                                                                        const nextItems = draft.items.filter((_, i) => i !== idx);
                                                                        return { ...prev, [t.id]: { ...draft, items: nextItems } };
                                                                      })
                                                                    }
                                                                  >
                                                                    ??†ú
                                                                  </button>
                                                                </div>
                                                              </div>
                                                            ))}
                                                            <div className="flex justify-end">
                                                              <button
                                                                type="button"
                                                                className="rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70"
                                                                onClick={() =>
                                                                  setGrantDrafts((prev) => ({
                                                                    ...prev,
                                                                    [t.id]: { ...draft, items: [...(draft.items || []), { item_type: "POINT", amount: "0" }] },
                                                                  }))
                                                                }
                                                              >
                                                                Î≥¥ÏÉÅ Ï∂îÍ?
                                                              </button>
                                                            </div>
                                                          </div>
                                                        </div>
                                                        <div className="col-span-12 md:col-span-4">
                                                          <label htmlFor={`ops-grant-reason-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                                            reason(ledger)
                                                          </label>
                                                          <input
                                                            id={`ops-grant-reason-${t.id}`}
                                                            className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                                            value={draft.reason}
                                                            onChange={(e) =>
                                                              setGrantDrafts((prev) => ({ ...prev, [t.id]: { ...draft, reason: e.target.value } }))
                                                            }
                                                            placeholder="?? OPS_PLAN_GRANT"
                                                          />
                                                        </div>
                                                      </div>

                                                      <div className="grid grid-cols-12 gap-2">
                                                        <div className="col-span-12 md:col-span-6">
                                                          <TargetListSelector
                                                            label="?ÄÍπ?Î¶¨Ïä§???†ÌÉù)"
                                                            value={draft.target_list_id ?? null}
                                                            onChange={(value) =>
                                                              setGrantDrafts((prev) => ({
                                                                ...prev,
                                                                [t.id]: { ...draft, target_list_id: value ?? undefined },
                                                              }))
                                                            }
                                                            lists={targetListsQuery.data ?? []}
                                                          />
                                                        </div>
                                                      </div>

                                                      {draft.target_list_id ? (
                                                        <TargetListPreview targetListId={draft.target_list_id} countSnapshot={selectedTargetList?.count_snapshot} />
                                                      ) : (
                                                        <div className="text-[11px] text-admin-text-muted">?ÄÍπ?Î¶¨Ïä§??ÎØ∏ÏÑ†?????ÑÏ≤¥??ÏßÄÍ∏âÎê† ???àÏäµ?àÎã§.</div>
                                                      )}

                                                      <div className="flex justify-end">
                                                        <button
                                                          type="button"
                                                          className="rounded-lg bg-admin-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                                          onClick={() => saveGrantPayload(t.id, draft)}
                                                          disabled={updateTask.isPending}
                                                          aria-label="ÏßÄÍ∏?payload ?Ä??
                                                          title="?Ä??
                                                        >
                                                          ?Ä??
                                                        </button>
                                                      </div>
                                                    </div>
                                                  );
                                                })()}
                                              </div>
                                            )}

                                            {t.type === "BROADCAST" && (
                                              <div className="mt-3 rounded-lg border border-admin-border bg-admin-bg/40 p-3">
                                                <div className="text-xs font-bold text-admin-text-muted">Í≥µÏ?/Î∏åÎ°ú?úÏ∫ê?§Ìä∏</div>
                                                {(() => {
                                                  const payload = (t.payload_json ?? {}) as Record<string, unknown>;
                                                  const draft = broadcastDrafts[t.id] ?? {
                                                    channel: String(payload.channel ?? "TELEGRAM_BROADCAST"),
                                                    message: String(payload.message ?? ""),
                                                    target_list_id: payload.target_list_id as number | undefined,
                                                  };
                                                  const selectedTargetList =
                                                    draft.target_list_id != null
                                                      ? (targetListsQuery.data ?? []).find((tl) => tl.id === draft.target_list_id) ?? null
                                                      : null;
                                                  return (
                                                    <div className="space-y-2 mt-2">
                                                      <div className="grid grid-cols-12 gap-2">
                                                        <div className="col-span-12 md:col-span-4">
                                                          <label htmlFor={`ops-broadcast-channel-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                                            Ï±ÑÎÑê
                                                          </label>
                                                          <select
                                                            id={`ops-broadcast-channel-${t.id}`}
                                                            className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                                            value={draft.channel}
                                                            onChange={(e) =>
                                                              setBroadcastDrafts((prev) => ({ ...prev, [t.id]: { ...draft, channel: e.target.value } }))
                                                            }
                                                          >
                                                            <option value="TELEGRAM_BROADCAST">TELEGRAM_BROADCAST</option>
                                                            <option value="TELEGRAM_DM">TELEGRAM_DM</option>
                                                          </select>
                                                        </div>
                                                        <div className="col-span-12 md:col-span-8">
                                                          <label htmlFor={`ops-broadcast-message-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                                            Î©îÏãúÏßÄ
                                                          </label>
                                                          <textarea
                                                            id={`ops-broadcast-message-${t.id}`}
                                                            className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                                            rows={3}
                                                            value={draft.message}
                                                            onChange={(e) =>
                                                              setBroadcastDrafts((prev) => ({ ...prev, [t.id]: { ...draft, message: e.target.value } }))
                                                            }
                                                            placeholder="Í≥µÏ? Î©îÏãúÏßÄ"
                                                          />
                                                        </div>
                                                      </div>

                                                      <div className="grid grid-cols-12 gap-2">
                                                        <div className="col-span-12 md:col-span-6">
                                                          <TargetListSelector
                                                            label="?ÄÍπ?Î¶¨Ïä§???†ÌÉù)"
                                                            value={draft.target_list_id ?? null}
                                                            onChange={(value) =>
                                                              setBroadcastDrafts((prev) => ({
                                                                ...prev,
                                                                [t.id]: { ...draft, target_list_id: value ?? undefined },
                                                              }))
                                                            }
                                                            lists={targetListsQuery.data ?? []}
                                                          />
                                                        </div>
                                                      </div>

                                                      {draft.target_list_id ? (
                                                        <TargetListPreview targetListId={draft.target_list_id} countSnapshot={selectedTargetList?.count_snapshot} />
                                                      ) : (
                                                        <div className="text-[11px] text-admin-text-muted">?ÄÍπ?Î¶¨Ïä§??ÎØ∏ÏÑ†?????ÑÏ≤¥ Î∞úÏÜ°?ºÎ°ú Í∞ÑÏ£º?©Îãà??</div>
                                                      )}

                                                      <div className="flex justify-end">
                                                        <button
                                                          type="button"
                                                          className="rounded-lg bg-admin-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                                          onClick={() => saveBroadcastPayload(t.id, draft)}
                                                          disabled={updateTask.isPending}
                                                          aria-label="Î∏åÎ°ú?úÏ∫ê?§Ìä∏ payload ?Ä??
                                                          title="?Ä??
                                                        >
                                                          ?Ä??
                                                        </button>
                                                      </div>
                                                    </div>
                                                  );
                                                })()}
                                              </div>
                                            )}


                                            <details className="mt-3 rounded-lg border border-admin-border bg-admin-bg/30 p-3">
                                              <summary className="cursor-pointer text-xs font-bold text-admin-text-muted">
                                                ?§Ìóò/?®Í≥º Ï∂îÏ†Å (ÏßÄ?ú¬∑before/after¬∑Í∏∞Í∞Ñ¬∑Í∑ºÍ±∞)
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
                                                          ÏßÄ??
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
                                                          Í∏∞Í∞Ñ
                                                        </label>
                                                        <input
                                                          id={`ops-exp-window-${t.id}`}
                                                          className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                                          value={draft.window}
                                                          onChange={(e) => upsertExperimentDraft(t.id, { window: e.target.value }, payload)}
                                                          placeholder="?? 2?úÍ∞Ñ, ?πÏùº"
                                                        />
                                                      </div>

                                                      <div className="col-span-12 md:col-span-4">
                                                        {metricKey === "OTHER" ? (
                                                          <>
                                                            <label htmlFor={`ops-exp-custom-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                                              Ïª§Ïä§?Ä ÏßÄ?úÎ™Ö
                                                            </label>
                                                            <input
                                                              id={`ops-exp-custom-${t.id}`}
                                                              className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                                              value={draft.metric_custom_key ?? ""}
                                                              onChange={(e) => upsertExperimentDraft(t.id, { metric_custom_key: e.target.value }, payload)}
                                                              placeholder="?? ?§Î¨∏ ?ëÎãµÎ•?
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
                                                          placeholder="?´Ïûê"
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
                                                          placeholder="?´Ïûê"
                                                          inputMode="decimal"
                                                        />
                                                      </div>
                                                      <div className="col-span-12 md:col-span-6">
                                                        <label htmlFor={`ops-exp-evidence-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                                          Í∑ºÍ±∞(ÎßÅÌÅ¨/Î©îÎ™®)
                                                        </label>
                                                        <input
                                                          id={`ops-exp-evidence-${t.id}`}
                                                          className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                                          value={draft.evidence}
                                                          onChange={(e) => upsertExperimentDraft(t.id, { evidence: e.target.value }, payload)}
                                                          placeholder="?? ?îÎ†àÍ∑∏Îû® Ï∫°Ï≤ò ÎßÅÌÅ¨, ?§ÌîÑ?àÎìú?úÌä∏ ÎßÅÌÅ¨"
                                                        />
                                                      </div>
                                                    </div>

                                                    <div>
                                                      <label htmlFor={`ops-exp-note-${t.id}`} className="block text-[11px] font-bold text-admin-text-muted">
                                                        Í≤∞Í≥º/Î©îÎ™®
                                                      </label>
                                                      <textarea
                                                        id={`ops-exp-note-${t.id}`}
                                                        className="mt-1 w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
                                                        rows={3}
                                                        value={draft.note}
                                                        onChange={(e) => upsertExperimentDraft(t.id, { note: e.target.value }, payload)}
                                                        placeholder="Î¨¥Ïóá???àÍ≥†, Î¨¥Ïóá??Î∞îÎÄåÏóà?îÏ? ??Ï§ÑÎ°ú"
                                                      />
                                                    </div>

                                                    <div className="flex justify-end">
                                                      <button
                                                        type="button"
                                                        className="rounded-lg bg-admin-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                                        onClick={() => saveExperiment(t.id, payload, draft)}
                                                        disabled={updateTask.isPending}
                                                        aria-label="?§Ìóò/?®Í≥º Ï∂îÏ†Å ?Ä??
                                                        title="?Ä??
                                                      >
                                                        ?Ä??
                                                      </button>
                                                    </div>
                                                  </div>
                                                );
                                              })()}
                                            </details>

                                            <div className="mt-1 text-[11px] text-admin-text-muted">
                                              executed_at: <span className="font-mono">{t.executed_at ? formatKstDateTime(t.executed_at) : "-"}</span>
                                            </div>
                    </TaskEditor>

                    <div className="rounded-lg border border-admin-border bg-admin-bg/40 p-3">
                      <ExecutionResultView
                        result={(t.payload_json ?? {}).execution_result as Record<string, any> | undefined}
                        error={(t.payload_json ?? {}).execution_error as string | undefined}
                        status={isExecuting ? "DOING" : t.status}
                        targetListLabelById={targetListLabelById}
                      />
                      <div className="mt-1 text-[11px] text-admin-text-muted text-right">
                        ?§Ìñâ?úÍ∞Å: {t.executed_at ? formatKstDateTime(t.executed_at) : "-"}
                      </div>
                    </div>
                  </OpsTaskCard>
                );
              })}

              {!tasksQuery.isLoading && filteredTasks.length === 0 && (
                <div className="rounded-xl border border-admin-border bg-admin-bg/40 p-6 text-center text-sm text-admin-text-muted">
                  ?ëÏóÖ???ÑÏßÅ ?ÜÏäµ?àÎã§. ?ÑÏóê??Ï∂îÍ???Ï£ºÏÑ∏??
                </div>
              )}
            </OpsTaskList>

            {tasksQuery.isLoading && <div className="mt-3 text-xs text-admin-text-muted">?ëÏóÖ Î°úÎî© Ï§ë‚Ä?/div>}
            {tasksQuery.error && <div className="mt-3 text-xs text-admin-danger">?ëÏóÖ Î°úÎìú ?§Ìå®</div>}
          </div>
            </>
          )}

          {activeTab === "timeline" && (
            <div className="rounded-xl border border-admin-border bg-admin-sidebar p-4 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-admin-subtitle text-admin-text-primary">?§Ìñâ ?Ä?ÑÎùº??/h2>
              </div>
              {timelineTasks.length === 0 && (
                <div className="mt-3 text-xs text-admin-text-muted">?§Ìñâ???ëÏóÖ???ÜÏäµ?àÎã§.</div>
              )}
              {timelineTasks.length > 0 && (
                <div className="mt-4 space-y-3">
                  {timelineTasks.map((t) => {
                    const actorId = t.actor_admin_id;
                    const actorLabel = actorId ? adminNameById[actorId] || `Admin #${actorId}` : "ÎØ∏Ï???;
                    return (
                      <div key={`timeline-${t.id}`} className="rounded-lg border border-admin-border bg-admin-bg/50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs text-admin-text-muted">{t.executed_at ? formatKstDateTime(t.executed_at) : "-"}</div>
                          <div className="text-xs text-admin-text-secondary">
                            ?§Ìñâ?? {actorLabel} {actorId ? `(#${actorId})` : ""}
                          </div>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-admin-text-primary">{t.title}</div>
                        <div className="mt-1 text-[11px] text-admin-text-muted">
                          ?Ä?? {TYPE_LABEL[t.type] ?? t.type} ¬∑ ?ÅÌÉú: {STATUS_LABEL[t.status] ?? t.status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "report" && (
            <div className="rounded-xl border border-admin-border bg-admin-sidebar p-4 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-admin-subtitle text-admin-text-primary">?âÍ? Î¶¨Ìè¨??/h2>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary hover:bg-admin-bg/70 disabled:opacity-50"
                  onClick={() => fetchEvalMetrics()}
                  disabled={evalMetricsLoading || !planId}
                  aria-label="?âÍ? Î¶¨Ìè¨???àÎ°úÍ≥†Ïπ®"
                  title="?àÎ°úÍ≥†Ïπ®"
                >
                  <RefreshCw size={14} />
                  ?àÎ°úÍ≥†Ïπ®
                </button>
              </div>
              {evalMetricsLoading && <div className="mt-2 text-xs text-admin-text-muted">Î¶¨Ìè¨??Î°úÎî© Ï§ë‚Ä?/div>}
              {evalMetricsError && <div className="mt-2 text-xs text-admin-danger">{evalMetricsError}</div>}
              {!evalMetricsLoading && evalMetrics.length === 0 && (
                <div className="mt-3 text-xs text-admin-text-muted">?âÍ? ?∞Ïù¥?∞Í? ?ÜÏäµ?àÎã§. (ÏßëÍ≥Ñ ?ëÏóÖ/?îÎìú?¨Ïù∏???ïÏù∏ ?ÑÏöî)</div>
              )}
              {evalMetrics.length > 0 && (
                <div className="mt-4 space-y-4">
                  <div className="rounded-lg border border-admin-border bg-admin-bg/60 p-3 text-sm">
                    Summary Grade:{" "}
                    <span className="font-bold">
                      {evalMetrics.find((m) => m.eval_type === "D7")?.grade ||
                        evalMetrics.find((m) => m.eval_type === "D3")?.grade ||
                        evalMetrics.find((m) => m.eval_type === "D1")?.grade ||
                        "-"}
                    </span>
                  </div>
                  <div className="grid grid-cols-12 gap-3">
                    {["D1", "D3", "D7"].map((key) => {
                      const metric = evalMetrics.find((m) => m.eval_type === key);
                      const metricsJson = (metric?.metrics_json ?? {}) as Record<string, number>;
                      return (
                        <div key={`report-${key}`} className="col-span-12 md:col-span-4 rounded-lg border border-admin-border bg-admin-bg/60 p-3">
                          <div className="text-xs font-bold text-admin-text-muted">{key}</div>
                          <div className="mt-2 space-y-1">
                            {Object.keys(metricsJson).length === 0 && (
                              <div className="text-[11px] text-admin-text-muted">ÏßÄ???ÜÏùå</div>
                            )}
                            {Object.entries(metricsJson).map(([metricKey, metricValue]) => (
                              <div key={`${key}-${metricKey}`} className="flex items-center justify-between text-[11px]">
                                <span className="text-admin-text-secondary">{metricKey}</span>
                                <span className="font-mono text-admin-text-primary">{String(metricValue)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AdminOpsPlanPage;

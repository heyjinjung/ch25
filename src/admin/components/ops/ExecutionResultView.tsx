import React from "react";

const ACTION_LABEL: Record<string, string> = {
  FORCE_ON: "Í∞ïÏ†ú ON",
  FORCE_OFF: "Í∞ïÏ†ú OFF",
  MULTIPLIER_SET: "Î∞∞Ïàò ?§Ï†ï",
};
const CHANNEL_LABEL: Record<string, string> = {
  TELEGRAM_DM: "?îÎ†àÍ∑∏Îû® DM",
  TELEGRAM_BROADCAST: "?îÎ†àÍ∑∏Îû® Í≥µÏ?",
  DM: "DM",
  CHANNEL: "Í≥µÏ?",
};
const AUDIENCE_LABEL: Record<string, string> = {
  ALL_USERS: "?ÑÏ≤¥ ?†Ï?",
  TARGET_LIST: "?ÄÍπ?Î¶¨Ïä§??,
  SURVEY_COMPLETERS: "?§Î¨∏ ?ÑÎ£å??,
};

type ExecutionResultViewProps = {
  result?: Record<string, any> | null;
  status?: string;
  error?: string | null;
  targetListLabelById?: Map<number, string>;
};

const ExecutionResultView: React.FC<ExecutionResultViewProps> = ({ result, status, error, targetListLabelById }) => {
  if (error) {
    return <div className="text-xs font-bold text-admin-danger">?êÎü¨: {String(error)}</div>;
  }

  if (!result) {
    if (status === "DOING") {
      return <div className="text-xs text-admin-text-muted">?§Ìñâ Ï§?..</div>;
    }
    return <div className="text-xs text-admin-text-muted text-center py-2">?ÑÏßÅ ?§Ìñâ Í≤∞Í≥ºÍ∞Ä ?ÜÏäµ?àÎã§.</div>;
  }

  const kind = result.kind;
  const targetListIdRaw = result.target_list_id;
  const targetListId =
    typeof targetListIdRaw === "number"
      ? targetListIdRaw
      : typeof targetListIdRaw === "string" && targetListIdRaw.trim() !== ""
        ? Number(targetListIdRaw)
        : null;
  const targetListLabel =
    typeof targetListId === "number" && Number.isFinite(targetListId) && targetListLabelById
      ? targetListLabelById.get(targetListId) ?? `#${targetListId}`
      : null;

  return (
    <div className="mt-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700">
      <div className="flex items-center gap-2 font-bold mb-1">
        <span>?§Ìñâ ?ÑÎ£å</span>
      </div>

      {(kind === "INVENTORY_GRANT_ALL" || kind === "TARGETED_ITEM_GRANT") && (
        <div className="space-y-1">
          <div>
            ÏßÄÍ∏??Ä?? <span className="font-mono">{result.granted_users?.toLocaleString()}</span>Î™?          </div>
          {Array.isArray(result.items) && (
            <div className="flex flex-wrap gap-1">
              {result.items.map((it: any, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded bg-white/50 px-1.5 py-0.5 text-xs border border-green-600/20"
                >
                  {it.item_type} <span className="ml-1 font-bold">x{it.amount}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {(kind === "MESSAGE_TEMPLATE" || kind === "SURVEY_DM" || kind === "TARGETLIST_BROADCAST") && (
        <div className="space-y-1">
          {result.channel && <div>Ï±ÑÎÑê: {CHANNEL_LABEL[result.channel] || result.channel}</div>}
          <div>Î∞úÏÜ°(?ÅÌÉúÎ≥ÄÍ≤?: <span className="font-mono">{result.sent_count?.toLocaleString()}</span>Í±?/div>
          {(result.audience || targetListLabel) && (
            <div>
              ?Ä?? {AUDIENCE_LABEL[result.audience] || result.audience || "?ÄÍπ?} {targetListLabel ? `(${targetListLabel})` : ""}
            </div>
          )}
        </div>
      )}

      {kind === "GOLDEN_HOUR" && (
        <div className="space-y-1">
          <div>?ôÏûë: {ACTION_LABEL[result.action] || result.action}</div>
          {result.enabled !== undefined && <div>?ÅÌÉú: {result.enabled ? "ON (?úÏÑ±)" : "OFF (ÎπÑÌôú??"}</div>}
          {result.multiplier && (
            <div>
              Î∞∞Ïàò: <strong>{result.multiplier}x</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExecutionResultView;

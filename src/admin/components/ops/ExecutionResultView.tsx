import React from "react";

const ACTION_LABEL: Record<string, string> = {
  FORCE_ON: "媛뺤젣 ON",
  FORCE_OFF: "媛뺤젣 OFF",
  MULTIPLIER_SET: "諛곗닔 ?ㅼ젙",
};
const CHANNEL_LABEL: Record<string, string> = {
  TELEGRAM_DM: "?붾젅洹몃옩 DM",
  TELEGRAM_BROADCAST: "?붾젅洹몃옩 怨듭?",
  DM: "DM",
  CHANNEL: "怨듭?",
};
const AUDIENCE_LABEL: Record<string, string> = {
  ALL_USERS: "?꾩껜 ?좎?",
  TARGET_LIST: "?源?由ъ뒪??,
  SURVEY_COMPLETERS: "?ㅻЦ ?꾨즺??,
};

type ExecutionResultViewProps = {
  result?: Record<string, any> | null;
  status?: string;
  error?: string | null;
  targetListLabelById?: Map<number, string>;
};

export const ExecutionResultView: React.FC<ExecutionResultViewProps> = ({ result, status, error, targetListLabelById }) => {
  if (error) {
    return <div className="text-xs font-bold text-admin-danger">?먮윭: {String(error)}</div>;
  }

  if (!result) {
    if (status === "DOING") {
      return <div className="text-xs text-admin-text-muted">?ㅽ뻾 以?..</div>;
    }
    return <div className="text-xs text-admin-text-muted text-center py-2">?꾩쭅 ?ㅽ뻾 寃곌낵媛 ?놁뒿?덈떎.</div>;
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
        <span>?ㅽ뻾 ?꾨즺</span>
      </div>

      {(kind === "INVENTORY_GRANT_ALL" || kind === "TARGETED_ITEM_GRANT") && (
        <div className="space-y-1">
          <div>
            吏湲???? <span className="font-mono">{result.granted_users?.toLocaleString()}</span>紐?          </div>
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
          {result.channel && <div>梨꾨꼸: {CHANNEL_LABEL[result.channel] || result.channel}</div>}
          <div>諛쒖넚(?곹깭蹂寃?: <span className="font-mono">{result.sent_count?.toLocaleString()}</span>嫄?/div>
          {(result.audience || targetListLabel) && (
            <div>
              ??? {AUDIENCE_LABEL[result.audience] || result.audience || "?源?} {targetListLabel ? `(${targetListLabel})` : ""}
            </div>
          )}
        </div>
      )}

      {kind === "GOLDEN_HOUR" && (
        <div className="space-y-1">
          <div>?숈옉: {ACTION_LABEL[result.action] || result.action}</div>
          {result.enabled !== undefined && <div>?곹깭: {result.enabled ? "ON (?쒖꽦)" : "OFF (鍮꾪솢??"}</div>}
          {result.multiplier && (
            <div>
              諛곗닔: <strong>{result.multiplier}x</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};




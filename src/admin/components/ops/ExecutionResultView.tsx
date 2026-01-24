import React from "react";

const ACTION_LABEL: Record<string, string> = {
  FORCE_ON: "강제 ON",
  FORCE_OFF: "강제 OFF",
  MULTIPLIER_SET: "배수 설정",
};
const CHANNEL_LABEL: Record<string, string> = {
  TELEGRAM_DM: "텔레그램 DM",
  TELEGRAM_BROADCAST: "텔레그램 공지",
  DM: "DM",
  CHANNEL: "공지",
};
const AUDIENCE_LABEL: Record<string, string> = {
  ALL_USERS: "전체 유저",
  TARGET_LIST: "타깃 리스트",
  SURVEY_COMPLETERS: "설문 완료자",
};

type ExecutionResultViewProps = {
  result?: Record<string, any> | null;
  status?: string;
  error?: string | null;
  targetListLabelById?: Map<number, string>;
};

const ExecutionResultView: React.FC<ExecutionResultViewProps> = ({ result, status, error, targetListLabelById }) => {
  if (error) {
    return <div className="text-xs font-bold text-admin-danger">에러: {String(error)}</div>;
  }

  if (!result) {
    if (status === "DOING") {
      return <div className="text-xs text-admin-text-muted">실행 중...</div>;
    }
    return <div className="text-xs text-admin-text-muted text-center py-2">아직 실행 결과가 없습니다.</div>;
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
        <span>실행 완료</span>
      </div>

      {(kind === "INVENTORY_GRANT_ALL" || kind === "TARGETED_ITEM_GRANT") && (
        <div className="space-y-1">
          <div>
            지급 대상: <span className="font-mono">{result.granted_users?.toLocaleString()}</span>명
          </div>
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
          {result.channel && <div>채널: {CHANNEL_LABEL[result.channel] || result.channel}</div>}
          <div>발송(상태변경): <span className="font-mono">{result.sent_count?.toLocaleString()}</span>건</div>
          {(result.audience || targetListLabel) && (
            <div>
              대상: {AUDIENCE_LABEL[result.audience] || result.audience || "타깃"} {targetListLabel ? `(${targetListLabel})` : ""}
            </div>
          )}
        </div>
      )}

      {kind === "GOLDEN_HOUR" && (
        <div className="space-y-1">
          <div>동작: {ACTION_LABEL[result.action] || result.action}</div>
          {result.enabled !== undefined && <div>상태: {result.enabled ? "ON (활성)" : "OFF (비활성)"}</div>}
          {result.multiplier && (
            <div>
              배수: <strong>{result.multiplier}x</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExecutionResultView;

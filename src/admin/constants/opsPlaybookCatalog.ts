export const STANDARD_METRIC_OPTIONS = [
  { key: "D1", label: "D1" },
  { key: "D3", label: "D3" },
  { key: "D7", label: "D7" },
  { key: "DAU", label: "DAU" },
  { key: "REACTIVATION", label: "복귀(휴면→활성)" },
  { key: "DEPOSIT_COUNT", label: "입금건수" },
  { key: "DEPOSIT_AMOUNT", label: "입금액" },
  { key: "PLAY_COUNT", label: "플레이수" },
  { key: "VAULT_EARN", label: "금고적립액" },
  { key: "CHANNEL_ENGAGEMENT", label: "채널조회/반응" },
  { key: "DM_REPLY", label: "DM 응답수" },
  { key: "OTHER", label: "기타(직접입력)" },
] as const;

export type StandardMetricKey = (typeof STANDARD_METRIC_OPTIONS)[number]["key"];

export type OpsExperimentDraft = {
  metric_key: StandardMetricKey;
  metric_custom_key?: string;
  window: string;
  before: string;
  after: string;
  evidence: string;
  note: string;
};

export type OpsPlaybookAction = {
  id: string;
  title: string;
  slot_time?: string | null;
  type: "NOTE" | "TOGGLE" | "DM";
  payload_json: Record<string, unknown>;
  default_metric_key?: StandardMetricKey;
  default_window?: string;
};

// Minimal seed actions derived from the retention plan; expand as you operationalize each item.
export const OPS_PLAYBOOK_ACTIONS: OpsPlaybookAction[] = [
  {
    id: "RTP-4.4-12:30-TRIAL_TICKET_CHANNEL_NOTICE",
    title: "[채널 공지] 점심 체험 티켓 3장 리필 안내",
    slot_time: "12:30",
    type: "DM",
    payload_json: {
      kind: "MESSAGE_TEMPLATE",
      channel: "CHANNEL",
      audience: "ALL",
      message: "🍱 점심 먹고 체험 티켓 3장 리필해 가세요!",
    },
    default_metric_key: "CHANNEL_ENGAGEMENT",
    default_window: "2시간",
  },
  {
    id: "RTP-4.4-18:00-VAULT_THRESHOLD_NUDGE_DM",
    title: "[개별 DM] 금고 5,000~9,000원 유저 독려",
    slot_time: "18:00",
    type: "DM",
    payload_json: {
      kind: "MESSAGE_TEMPLATE",
      channel: "DM",
      audience: "SEGMENT_VAULT_5K_9K",
      message: "사장님 금고 잔액이 애매하게 남아있어요. 1,000원만 더 채우면 출금 임계점입니다. 오늘 딱 한번만 더 달려보시죠.",
    },
    default_metric_key: "REACTIVATION",
    default_window: "당일",
  },
  {
    id: "RTP-4.4-21:00-GOLDEN_HOUR_CHANNEL_NOTICE",
    title: "[채널 공지] 골든아워 시작 안내",
    slot_time: "21:00",
    type: "DM",
    payload_json: {
      kind: "MESSAGE_TEMPLATE",
      channel: "CHANNEL",
      audience: "ALL",
      message: "🔥 골든 아워! 지금부터 금고 적립 1.5배!",
    },
    default_metric_key: "VAULT_EARN",
    default_window: "2시간",
  },
  {
    id: "RTP-4.4-21:00-GOLDEN_HOUR_MULTIPLIER_SET_1_5",
    title: "[시스템] 골든아워 배수 1.5 설정",
    slot_time: "21:00",
    type: "TOGGLE",
    payload_json: {
      kind: "GOLDEN_HOUR",
      action: "MULTIPLIER_SET",
      multiplier: 1.5,
    },
    default_metric_key: "VAULT_EARN",
    default_window: "2시간",
  },
];

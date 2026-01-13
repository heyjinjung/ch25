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

export const OPS_PLAYBOOK_ACTIONS: OpsPlaybookAction[] = [
  // --- [운영 도구 (Ops Tools)] ---
  {
    id: "OPS-TOOLS-INVENTORY_GRANT_ALL",
    title: "[운영] 전체 유저 아이템 지급 (DIAMOND x1 + VOUCHER_LOTTERY_TICKET_1 x1)",
    type: "NOTE",
    payload_json: {
      kind: "INVENTORY_GRANT_ALL",
      reason: "OPS_PLAN_GRANT_ALL",
      items: [
        { item_type: "DIAMOND", amount: 1 },
        { item_type: "VOUCHER_LOTTERY_TICKET_1", amount: 1 },
      ],
    },
    default_metric_key: "OTHER",
  },

  // --- [매일 루틴 (Daily Routine)] ---
  {
    id: "ROUTINE-09:00-WAKE_UP_LOTTERY",
    title: "[루틴] 09:00 가입자 복권 티켓 1장 증정",
    slot_time: "09:00",
    type: "NOTE",
    payload_json: { kind: "DAILY_ROUTINE", action: "MANUAL_GRANT" },
    default_metric_key: "DAU",
  },
  {
    id: "ROUTINE-12:30-LUNCH_TICKET_REFILL",
    title: "[루틴] 12:30 점심 체험 티켓 3장 리필 공지",
    slot_time: "12:30",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "🍱 점심 먹고 체험 티켓 3장 리필해 가세요!" },
    default_metric_key: "CHANNEL_ENGAGEMENT",
  },
  {
    id: "ROUTINE-18:00-VAULT_NUDGE",
    title: "[루틴] 18:00 금고 임계점 독려 (4k~9k)",
    slot_time: "18:00",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_VAULT_5K_9K", message: "사장님 금고 잔액이 애매하게 남아있어요. 조금만 더 채우면 출금 가능합니다!" },
    default_metric_key: "REACTIVATION",
  },
  {
    id: "ROUTINE-21:00-GOLDEN_HOUR",
    title: "[루틴] 21:00 골든아워 시작 안내 (1.5배)",
    slot_time: "21:00",
    type: "TOGGLE",
    payload_json: { kind: "GOLDEN_HOUR", action: "MULTIPLIER_SET", multiplier: 1.5 },
    default_metric_key: "VAULT_EARN",
  },

  // --- [1주차: 관계 형성 (Week 1)] ---
  {
    id: "W1-D1-WELCOME_RESCUE",
    title: "[W1/D1] 가입자 전수 조사 및 구조대 DM",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_NEWBIE_ZERO", message: "빈손으로 보내기 죄송해서 정착 보너스 넣었습니다. 확인해보세요!" },
    default_metric_key: "DAU",
  },
  {
    id: "W1-D2-TICKET_ZERO_PROMO",
    title: "[W1/D2] 티켓 제로 기능 홍보",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "티켓 0장이어도 걱정 마세요! CC만의 티켓 제로 시스템이 자동으로 리필해드립니다." },
    default_metric_key: "CHANNEL_ENGAGEMENT",
  },
  {
    id: "W1-D3-SURVEY_EVENT",
    title: "[W1/D3] 설문조사 진행 (불만 사항 청취)",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "쓴소리 해주시면 돈 드립니다. 설문 참여하고 보너스 받아가세요!" },
    default_metric_key: "DM_REPLY",
  },
  {
    id: "W1-D4-RETENTION_NUDGE",
    title: "[W1/D4] 금고 잔액 소멸 예고 (손실 회피)",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_INACTIVE_WITH_BALANCE", message: "회원님 계정에 포인트가 소멸 예정입니다. 사라지기 전에 챙겨가세요!" },
    default_metric_key: "REACTIVATION",
  },
  {
    id: "W1-D5-WEEKEND_WARRIOR_PREP",
    title: "[W1/D5] 불금 예열 레벨타워 입장권 배포",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "오늘 밤은 옥상(타워) 한번 가보셔야죠? 레벨타워 전용 티켓 배포 시작!" },
    default_metric_key: "PLAY_COUNT",
  },
  {
    id: "W1-D6-QUIZ_EVENT",
    title: "[W1/D6] 주말 퀴즈 및 커피값 이벤트",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "주말에 심심하시죠? 가벼운 퀴즈 풀면 커피값 쏩니다!" },
    default_metric_key: "CHANNEL_ENGAGEMENT",
  },
  {
    id: "W1-D7-WEEKLY_AWARDS",
    title: "[W1/D7] 주간 베스트 플레이어 시상",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "🏆 이번 주 영광의 주인공들입니다. 명예의 전당 등극을 축하합니다!" },
    default_metric_key: "OTHER",
  },

  // --- [2주차: 매출 전환 (Week 2)] ---
  {
    id: "W2-D8-DEPOSIT_BUFF_ANNOUNCE",
    title: "[W2/D8] 입금 XP 버프 (100XP) 적용 공지",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "이제 10만원 입금 시 무려 2레벨 점프! CC 역사상 가장 강력한 포인트 버프입니다." },
    default_metric_key: "DEPOSIT_COUNT",
  },
  {
    id: "W2-D9-MISSION_PROOF_EVENT",
    title: "[W2/D9] 매크로 미션 인증샷 이벤트",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "30판 플레이 인증샷 올리면 보너스 스탬프와 추가 포인트 즉시 증정!" },
    default_metric_key: "PLAY_COUNT",
  },
  {
    id: "W2-D10-WINDOW_SHOPPER_DEAL",
    title: "[W2/D10] 아이쇼핑족 전용 일대일 딜",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_WINDOW_SHOPPER", message: "형님, 오늘만 눈 딱 감고 만원만 넣어보쇼. VIP 레벨 2로 바로 올려드립니다." },
    default_metric_key: "DEPOSIT_COUNT",
  },
  {
    id: "W2-D11-TEAM_BATTLE_EVENT",
    title: "[W2/D11] 청팀 vs 백팀 단판 승부 대회",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "오늘 이기는 팀 전원에게 야식비 쏩니다! 당신의 운명을 결정하세요." },
    default_metric_key: "CHANNEL_ENGAGEMENT",
  },
  {
    id: "W2-D12-PAYDAY_SPECIAL",
    title: "[W2/D12] 월급날 충전 2배 포인트 적립",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "월급날 기념! 충전 포인트 수동 더블 지급 이벤트 진행합니다." },
    default_metric_key: "DEPOSIT_AMOUNT",
  },
  {
    id: "W2-D13-SURPRISE_HOT_TIME",
    title: "[W2/D13] 깜짝 핫타임 (금고 적립 2배)",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "⚡️ 지금부터 딱 1시간! 모든 게임 금고 적립이 2배로 폭증합니다!" },
    default_metric_key: "VAULT_EARN",
  },
  {
    id: "W2-D14-FINAL_LEADERBOARD",
    title: "[W2/D14] 2주 결산 입금왕/수익왕 시상",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "지난 2주간의 영웅들입니다. 리더보드를 확인하고 다음 주인공에 도전하세요!" },
    default_metric_key: "OTHER",
  },

  // --- [상황별 정밀 타격 (Scenarios)] ---
  {
    id: "SCENARIO-D-VIP-CARE",
    title: "[Scenario D] VIP 고액 충전 전담 케어",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_VIP_DEPOSITOR", message: "(VIP) 사장님, 화끈하게 쏘셨군요! 감사한 마음에 재량으로 티켓 5장 더 챙겨드렸습니다. 제가 직접 모시겠습니다. ^^" },
    default_metric_key: "DEPOSIT_AMOUNT",
  },
  {
    id: "SCENARIO-E-TILTING_PLAYER",
    title: "[Scenario E] 분노의 배팅러 진정제 (커피값)",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_LOSS_STREAK", message: "사장님, 흐름이 안 좋네요. 커피 한 잔 하며 10분만 쉬었다 하시죠. 3,000P 넣어드렸습니다." },
    default_metric_key: "REACTIVATION",
  },
  {
    id: "SCENARIO-F-WEEKEND-WARRIOR",
    title: "[Scenario F] 주말 전사 보급 (경험치 부스터)",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_WEEKEND_ONLY", message: "한 주 고생 많으셨습니다! 스트레스 확 푸시라고 주말 전용 경험치 2배 부스터 켜드렸습니다." },
    default_metric_key: "PLAY_COUNT",
  },
  {
    id: "SCENARIO-G-CHERRY-PICKER",
    title: "[Scenario G] 체리피커 유료 전환 유도 (돌발 미션)",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_FREE_ONLY", message: "사장님, 저랑 내기 하나 하시죠. 오늘 딱 1만원만 충전하시면 제가 1만원 더 얹어서 2만원으로 시작하게 해드립니다!" },
    default_metric_key: "DEPOSIT_COUNT",
  },
  {
    id: "SCENARIO-H-ALMOST_VIP",
    title: "[Scenario H] 10레벨 직전 유저 동기부여",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_LEVEL_9", message: "👑 이제 코앞입니다! 10레벨 찍고 골드키 가져가세요. 지원 사격용 다이스 5개 쏩니다!" },
    default_metric_key: "PLAY_COUNT",
  },
  {
    id: "SCENARIO-I-COMPLAINT-CARE",
    title: "[Scenario I] 컴플레인 유저 사과 및 보상",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_COMPLAINED", message: "사장님, 정말 죄송합니다. 운영 미숙으로 불편 드린 점 사죄드리는 마음으로 10,000P 넣어드렸습니다. 너그럽게 봐주십시오." },
    default_metric_key: "OTHER",
  },
  {
    id: "SCENARIO-J-SPECIAL-DAY",
    title: "[Scenario J] 생일/기념일 축하 선물",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_BIRTHDAY", message: "🎂 사장님, 오늘 귀빠진 날이라면서요? 축하드리는 의미로 '미역국 값' 30,000P 쏩니다! 기분 좋은 하루 되세요!" },
    default_metric_key: "OTHER",
  },
];

export const STANDARD_METRIC_OPTIONS = [
  { key: "D1", label: "D1" },
  { key: "D3", label: "D3" },
  { key: "D7", label: "D7" },
  { key: "DAU", label: "DAU" },
  { key: "REACTIVATION", label: "ë³µê?(?´ë©´?’í™œ??" },
  { key: "DEPOSIT_COUNT", label: "?…ê¸ˆê±´ìˆ˜" },
  { key: "DEPOSIT_AMOUNT", label: "?…ê¸ˆ?? },
  { key: "PLAY_COUNT", label: "?Œë ˆ?´ìˆ˜" },
  { key: "VAULT_EARN", label: "ê¸ˆê³ ?ë¦½?? },
  { key: "CHANNEL_ENGAGEMENT", label: "ì±„ë„ì¡°íšŒ/ë°˜ì‘" },
  { key: "DM_REPLY", label: "DM ?‘ë‹µ?? },
  { key: "OTHER", label: "ê¸°í?(ì§ì ‘?…ë ¥)" },
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
  type: "NOTE" | "TOGGLE" | "DM" | "GRANT" | "BROADCAST" | "WEBHOOK";
  payload_json: Record<string, unknown>;
  default_metric_key?: StandardMetricKey;
  default_window?: string;
};

export const OPS_PLAYBOOK_ACTIONS: OpsPlaybookAction[] = [
  // --- [?´ì˜ ?„êµ¬ (Ops Tools)] ---
  {
    id: "OPS-TOOLS-INVENTORY_GRANT_ALL",
    title: "[?´ì˜] ?„ì²´ ? ì? ?„ì´??ì§€ê¸?(DIAMOND x1 + VOUCHER_LOTTERY_TICKET_1 x1)",
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

  // --- [ë§¤ì¼ ë£¨í‹´ (Daily Routine)] ---
  {
    id: "ROUTINE-09:00-WAKE_UP_LOTTERY",
    title: "[ë£¨í‹´] 09:00 ê°€?…ì ë³µê¶Œ ?°ì¼“ 1??ì¦ì •",
    slot_time: "09:00",
    type: "NOTE",
    payload_json: { kind: "DAILY_ROUTINE", action: "MANUAL_GRANT" },
    default_metric_key: "DAU",
  },
  {
    id: "ROUTINE-12:30-LUNCH_TICKET_REFILL",
    title: "[ë£¨í‹´] 12:30 ?ì‹¬ ì²´í—˜ ?°ì¼“ 3??ë¦¬í•„ ê³µì?",
    slot_time: "12:30",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "?± ?ì‹¬ ë¨¹ê³  ì²´í—˜ ?°ì¼“ 3??ë¦¬í•„??ê°€?¸ìš”!" },
    default_metric_key: "CHANNEL_ENGAGEMENT",
  },
  {
    id: "ROUTINE-18:00-VAULT_NUDGE",
    title: "[ë£¨í‹´] 18:00 ê¸ˆê³  ?„ê³„???…ë ¤ (4k~9k)",
    slot_time: "18:00",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_VAULT_5K_9K", message: "?¬ì¥??ê¸ˆê³  ?”ì•¡??? ë§¤?˜ê²Œ ?¨ì•„?ˆì–´?? ì¡°ê¸ˆë§???ì±„ìš°ë©?ì¶œê¸ˆ ê°€?¥í•©?ˆë‹¤!" },
    default_metric_key: "REACTIVATION",
  },
  {
    id: "ROUTINE-21:00-GOLDEN_HOUR",
    title: "[ë£¨í‹´] 21:00 ê³¨ë“ ?„ì›Œ ?œì‘ ?ˆë‚´ (1.5ë°?",
    slot_time: "21:00",
    type: "TOGGLE",
    payload_json: { kind: "GOLDEN_HOUR", action: "MULTIPLIER_SET", multiplier: 1.5 },
    default_metric_key: "VAULT_EARN",
  },

  // --- [1ì£¼ì°¨: ê´€ê³??•ì„± (Week 1)] ---
  {
    id: "W1-D1-WELCOME_RESCUE",
    title: "[W1/D1] ê°€?…ì ?„ìˆ˜ ì¡°ì‚¬ ë°?êµ¬ì¡°?€ DM",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_NEWBIE_ZERO", message: "ë¹ˆì†?¼ë¡œ ë³´ë‚´ê¸?ì£„ì†¡?´ì„œ ?•ì°© ë³´ë„ˆ???£ì—ˆ?µë‹ˆ?? ?•ì¸?´ë³´?¸ìš”!" },
    default_metric_key: "DAU",
  },
  {
    id: "W1-D2-TICKET_ZERO_PROMO",
    title: "[W1/D2] ?°ì¼“ ?œë¡œ ê¸°ëŠ¥ ?ë³´",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "?°ì¼“ 0?¥ì´?´ë„ ê±±ì • ë§ˆì„¸?? CCë§Œì˜ ?°ì¼“ ?œë¡œ ?œìŠ¤?œì´ ?ë™?¼ë¡œ ë¦¬í•„?´ë“œë¦½ë‹ˆ??" },
    default_metric_key: "CHANNEL_ENGAGEMENT",
  },
  {
    id: "W1-D3-SURVEY_EVENT",
    title: "[W1/D3] ?¤ë¬¸ì¡°ì‚¬ ì§„í–‰ (ë¶ˆë§Œ ?¬í•­ ì²?·¨)",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "?´ì†Œë¦??´ì£¼?œë©´ ???œë¦½?ˆë‹¤. ?¤ë¬¸ ì°¸ì—¬?˜ê³  ë³´ë„ˆ??ë°›ì•„ê°€?¸ìš”!" },
    default_metric_key: "DM_REPLY",
  },
  {
    id: "W1-D4-RETENTION_NUDGE",
    title: "[W1/D4] ê¸ˆê³  ?”ì•¡ ?Œë©¸ ?ˆê³  (?ì‹¤ ?Œí”¼)",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_INACTIVE_WITH_BALANCE", message: "?Œì›??ê³„ì •???¬ì¸?¸ê? ?Œë©¸ ?ˆì •?…ë‹ˆ?? ?¬ë¼ì§€ê¸??„ì— ì±™ê²¨ê°€?¸ìš”!" },
    default_metric_key: "REACTIVATION",
  },
  {
    id: "W1-D5-WEEKEND_WARRIOR_PREP",
    title: "[W1/D5] ë¶ˆê¸ˆ ?ˆì—´ ?ˆë²¨?€???…ì¥ê¶?ë°°í¬",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "?¤ëŠ˜ ë°¤ì? ?¥ìƒ(?€?? ?œë²ˆ ê°€ë³´ì…”?¼ì£ ? ?ˆë²¨?€???„ìš© ?°ì¼“ ë°°í¬ ?œì‘!" },
    default_metric_key: "PLAY_COUNT",
  },
  {
    id: "W1-D6-QUIZ_EVENT",
    title: "[W1/D6] ì£¼ë§ ?´ì¦ˆ ë°?ì»¤í”¼ê°??´ë²¤??,
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "ì£¼ë§???¬ì‹¬?˜ì‹œì£? ê°€ë²¼ìš´ ?´ì¦ˆ ?€ë©?ì»¤í”¼ê°??©ë‹ˆ??" },
    default_metric_key: "CHANNEL_ENGAGEMENT",
  },
  {
    id: "W1-D7-WEEKLY_AWARDS",
    title: "[W1/D7] ì£¼ê°„ ë² ìŠ¤???Œë ˆ?´ì–´ ?œìƒ",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "?† ?´ë²ˆ ì£??ê´‘??ì£¼ì¸ê³µë“¤?…ë‹ˆ?? ëª…ì˜ˆ???„ë‹¹ ?±ê·¹??ì¶•í•˜?©ë‹ˆ??" },
    default_metric_key: "OTHER",
  },

  // --- [2ì£¼ì°¨: ë§¤ì¶œ ?„í™˜ (Week 2)] ---
  {
    id: "W2-D8-DEPOSIT_BUFF_ANNOUNCE",
    title: "[W2/D8] ?…ê¸ˆ XP ë²„í”„ (100XP) ?ìš© ê³µì?",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "?´ì œ 10ë§Œì› ?…ê¸ˆ ??ë¬´ë ¤ 2?ˆë²¨ ?í”„! CC ??‚¬??ê°€??ê°•ë ¥???¬ì¸??ë²„í”„?…ë‹ˆ??" },
    default_metric_key: "DEPOSIT_COUNT",
  },
  {
    id: "W2-D9-MISSION_PROOF_EVENT",
    title: "[W2/D9] ë§¤í¬ë¡?ë¯¸ì…˜ ?¸ì¦???´ë²¤??,
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "30???Œë ˆ???¸ì¦???¬ë¦¬ë©?ë³´ë„ˆ???¤íƒ¬?„ì? ì¶”ê? ?¬ì¸??ì¦‰ì‹œ ì¦ì •!" },
    default_metric_key: "PLAY_COUNT",
  },
  {
    id: "W2-D10-WINDOW_SHOPPER_DEAL",
    title: "[W2/D10] ?„ì´?¼í•‘ì¡??„ìš© ?¼ë?????,
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_WINDOW_SHOPPER", message: "?•ë‹˜, ?¤ëŠ˜ë§?????ê°ê³  ë§Œì›ë§??£ì–´ë³´ì‡¼. VIP ?ˆë²¨ 2ë¡?ë°”ë¡œ ?¬ë ¤?œë¦½?ˆë‹¤." },
    default_metric_key: "DEPOSIT_COUNT",
  },
  {
    id: "W2-D11-TEAM_BATTLE_EVENT",
    title: "[W2/D11] ì²?? vs ë°±í? ?¨íŒ ?¹ë? ?€??,
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "?¤ëŠ˜ ?´ê¸°???€ ?„ì›?ê²Œ ?¼ì‹ë¹??©ë‹ˆ?? ?¹ì‹ ???´ëª…??ê²°ì •?˜ì„¸??" },
    default_metric_key: "CHANNEL_ENGAGEMENT",
  },
  {
    id: "W2-D12-PAYDAY_SPECIAL",
    title: "[W2/D12] ?”ê¸‰??ì¶©ì „ 2ë°??¬ì¸???ë¦½",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "?”ê¸‰??ê¸°ë…! ì¶©ì „ ?¬ì¸???˜ë™ ?”ë¸” ì§€ê¸??´ë²¤??ì§„í–‰?©ë‹ˆ??" },
    default_metric_key: "DEPOSIT_AMOUNT",
  },
  {
    id: "W2-D13-SURPRISE_HOT_TIME",
    title: "[W2/D13] ê¹œì§ ?«í???(ê¸ˆê³  ?ë¦½ 2ë°?",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "?¡ï¸ ì§€ê¸ˆë?????1?œê°„! ëª¨ë“  ê²Œì„ ê¸ˆê³  ?ë¦½??2ë°°ë¡œ ??¦?©ë‹ˆ??" },
    default_metric_key: "VAULT_EARN",
  },
  {
    id: "W2-D14-FINAL_LEADERBOARD",
    title: "[W2/D14] 2ì£?ê²°ì‚° ?…ê¸ˆ???˜ìµ???œìƒ",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "CHANNEL", audience: "ALL", message: "ì§€??2ì£¼ê°„???ì›…?¤ì…?ˆë‹¤. ë¦¬ë”ë³´ë“œë¥??•ì¸?˜ê³  ?¤ìŒ ì£¼ì¸ê³µì— ?„ì „?˜ì„¸??" },
    default_metric_key: "OTHER",
  },

  // --- [?í™©ë³??•ë? ?€ê²?(Scenarios)] ---
  {
    id: "SCENARIO-D-VIP-CARE",
    title: "[Scenario D] VIP ê³ ì•¡ ì¶©ì „ ?„ë‹´ ì¼€??,
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_VIP_DEPOSITOR", message: "(VIP) ?¬ì¥?? ?”ëˆ?˜ê²Œ ?˜ì…¨êµ°ìš”! ê°ì‚¬??ë§ˆìŒ???¬ëŸ‰?¼ë¡œ ?°ì¼“ 5????ì±™ê²¨?œë ¸?µë‹ˆ?? ?œê? ì§ì ‘ ëª¨ì‹œê² ìŠµ?ˆë‹¤. ^^" },
    default_metric_key: "DEPOSIT_AMOUNT",
  },
  {
    id: "SCENARIO-E-TILTING_PLAYER",
    title: "[Scenario E] ë¶„ë…¸??ë°°íŒ…??ì§„ì •??(ì»¤í”¼ê°?",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_LOSS_STREAK", message: "?¬ì¥?? ?ë¦„????ì¢‹ë„¤?? ì»¤í”¼ ?????˜ë©° 10ë¶„ë§Œ ?¬ì—ˆ???˜ì‹œì£? 3,000P ?£ì–´?œë ¸?µë‹ˆ??" },
    default_metric_key: "REACTIVATION",
  },
  {
    id: "SCENARIO-F-WEEKEND-WARRIOR",
    title: "[Scenario F] ì£¼ë§ ?„ì‚¬ ë³´ê¸‰ (ê²½í—˜ì¹?ë¶€?¤í„°)",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_WEEKEND_ONLY", message: "??ì£?ê³ ìƒ ë§ìœ¼?¨ìŠµ?ˆë‹¤! ?¤íŠ¸?ˆìŠ¤ ???¸ì‹œ?¼ê³  ì£¼ë§ ?„ìš© ê²½í—˜ì¹?2ë°?ë¶€?¤í„° ì¼œë“œ?¸ìŠµ?ˆë‹¤." },
    default_metric_key: "PLAY_COUNT",
  },
  {
    id: "SCENARIO-G-CHERRY-PICKER",
    title: "[Scenario G] ì²´ë¦¬?¼ì»¤ ? ë£Œ ?„í™˜ ? ë„ (?Œë°œ ë¯¸ì…˜)",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_FREE_ONLY", message: "?¬ì¥?? ?€???´ê¸° ?˜ë‚˜ ?˜ì‹œì£? ?¤ëŠ˜ ??1ë§Œì›ë§?ì¶©ì „?˜ì‹œë©??œê? 1ë§Œì› ???¹ì–´??2ë§Œì›?¼ë¡œ ?œì‘?˜ê²Œ ?´ë“œë¦½ë‹ˆ??" },
    default_metric_key: "DEPOSIT_COUNT",
  },
  {
    id: "SCENARIO-H-ALMOST_VIP",
    title: "[Scenario H] 10?ˆë²¨ ì§ì „ ? ì? ?™ê¸°ë¶€??,
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_LEVEL_9", message: "?‘‘ ?´ì œ ì½”ì•?…ë‹ˆ?? 10?ˆë²¨ ì°ê³  ê³¨ë“œ??ê°€?¸ê??¸ìš”. ì§€???¬ê²©???¤ì´??5ê°??©ë‹ˆ??" },
    default_metric_key: "PLAY_COUNT",
  },
  {
    id: "SCENARIO-I-COMPLAINT-CARE",
    title: "[Scenario I] ì»´í”Œ?ˆì¸ ? ì? ?¬ê³¼ ë°?ë³´ìƒ",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_COMPLAINED", message: "?¬ì¥?? ?•ë§ ì£„ì†¡?©ë‹ˆ?? ?´ì˜ ë¯¸ìˆ™?¼ë¡œ ë¶ˆí¸ ?œë¦° ???¬ì£„?œë¦¬??ë§ˆìŒ?¼ë¡œ 10,000P ?£ì–´?œë ¸?µë‹ˆ?? ?ˆê·¸?½ê²Œ ë´ì£¼??‹œ??" },
    default_metric_key: "OTHER",
  },
  {
    id: "SCENARIO-J-SPECIAL-DAY",
    title: "[Scenario J] ?ì¼/ê¸°ë…??ì¶•í•˜ ? ë¬¼",
    type: "DM",
    payload_json: { kind: "MESSAGE_TEMPLATE", channel: "DM", audience: "SEGMENT_BIRTHDAY", message: "?‚ ?¬ì¥?? ?¤ëŠ˜ ê·€ë¹ ì§„ ? ì´?¼ë©´?œìš”? ì¶•í•˜?œë¦¬???˜ë?ë¡?'ë¯¸ì—­êµ?ê°? 30,000P ?©ë‹ˆ?? ê¸°ë¶„ ì¢‹ì? ?˜ë£¨ ?˜ì„¸??" },
    default_metric_key: "OTHER",
  },
];

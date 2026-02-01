/**
 * MissionManagerPage 상수 정의
 * @module mission/constants/missionConstants
 */

import { REWARD_ITEMS } from "../../../../../constants/rewardItems";

// ─────────────────────────────────────────────────────────────────
// Reward Type Mapping
// ─────────────────────────────────────────────────────────────────

export const REWARD_TYPE_MAPPING: Record<string, string> = {
  ROULETTE_TICKET: "TICKET_ROULETTE",
  DICE_TICKET: "TICKET_DICE",
  LOTTERY_TICKET: "TICKET_LOTTERY",
  GOLD_KEY_TICKET: "GOLD_KEY",
  DIAMOND_TICKET: "DIAMOND_KEY",
};

export const MISSION_REWARD_OPTIONS = REWARD_ITEMS.map((item) => ({
  ...item,
  value: REWARD_TYPE_MAPPING[item.value] || item.value,
}));

// ─────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────

export const CATEGORIES = ["DAILY", "WEEKLY", "NEW_USER", "SPECIAL"] as const;
export type CategoryType = (typeof CATEGORIES)[number];

// ─────────────────────────────────────────────────────────────────
// Action Type Options
// ─────────────────────────────────────────────────────────────────

export const ACTION_TYPE_OPTIONS = [
  { value: "PLAY_GAME", label: "게임 플레이" },
  { value: "PLAY_DICE", label: "주사위 게임" },
  { value: "PLAY_ROULETTE", label: "룰렛 게임" },
  { value: "PLAY_LOTTERY", label: "복권 게임" },
  { value: "LOGIN", label: "로그인/출석" },
  { value: "GOLDEN_HOUR_PLAY", label: "골든아워 참가" },
  { value: "BUY_SHOP_ITEM", label: "상점 구매" },
  { value: "CC_DEPOSIT", label: "CC 입금" },
  { value: "JOIN_TELEGRAM_CHANNEL", label: "텔레그램 채널 입장" },
  { value: "JOIN_CC_CHANNEL", label: "CC 공식채널 입장" },
  { value: "CONSECUTIVE_LOGIN", label: "다음날 로그인" },
  { value: "JOIN_CHANNEL", label: "채널 입장" },
  { value: "SHARE_STORY", label: "스토리 공유" },
  { value: "INVITE_FRIEND", label: "친구 초대" },
];

// ─────────────────────────────────────────────────────────────────
// Logic Key Presets
// ─────────────────────────────────────────────────────────────────

export const LOGIC_KEY_PRESETS = [
  {
    value: "daily_play_generic",
    label: "📅 일일 | 게임 플레이",
    category: "DAILY",
  },
  { value: "daily_play_dice", label: "📅 일일 | 주사위", category: "DAILY" },
  { value: "daily_play_roulette", label: "📅 일일 | 룰렛", category: "DAILY" },
  { value: "daily_play_lottery", label: "📅 일일 | 복권", category: "DAILY" },
  {
    value: "daily_golden_hour",
    label: "📅 일일 | 골든아워",
    category: "DAILY",
  },
  {
    value: "daily_shop_purchase",
    label: "📅 일일 | 상점 구매",
    category: "DAILY",
  },
  {
    value: "daily_login_gift",
    label: "📅 일일 | 출석 체크",
    category: "DAILY",
  },
  { value: "daily_cc_deposit", label: "📅 일일 | CC 입금", category: "DAILY" },
  {
    value: "weekly_play_generic",
    label: "📆 주간 | 게임 플레이",
    category: "WEEKLY",
  },
  { value: "weekly_play_dice", label: "📆 주간 | 주사위", category: "WEEKLY" },
  {
    value: "weekly_play_roulette",
    label: "📆 주간 | 룰렛",
    category: "WEEKLY",
  },
  { value: "weekly_play_lottery", label: "📆 주간 | 복권", category: "WEEKLY" },
  {
    value: "weekly_golden_hour",
    label: "📆 주간 | 골든아워",
    category: "WEEKLY",
  },
  {
    value: "weekly_shop_purchase",
    label: "📆 주간 | 상점 구매",
    category: "WEEKLY",
  },
  {
    value: "weekly_login_streak",
    label: "📆 주간 | 로그인",
    category: "WEEKLY",
  },
  {
    value: "weekly_cc_deposit",
    label: "📆 주간 | CC 입금",
    category: "WEEKLY",
  },
  {
    value: "new_user_first_login",
    label: "🆕 신규 | 첫 로그인",
    category: "NEW_USER",
  },
  {
    value: "new_user_first_game",
    label: "🆕 신규 | 첫 게임",
    category: "NEW_USER",
  },
  {
    value: "new_user_telegram_join",
    label: "🆕 신규 | 텔레그램 입장",
    category: "NEW_USER",
  },
  {
    value: "new_user_cc_channel_join",
    label: "🆕 신규 | CC 채널 입장",
    category: "NEW_USER",
  },
  {
    value: "new_user_next_day_login",
    label: "🆕 신규 | 다음날 로그인",
    category: "NEW_USER",
  },
  {
    value: "streak_challenge_3",
    label: "⭐ 스페셜 | 3일 연속",
    category: "SPECIAL",
  },
  { value: "golden_hour", label: "⭐ 스페셜 | 골든아워", category: "SPECIAL" },
];

// ─────────────────────────────────────────────────────────────────
// Preset Recommended Action Types
// ─────────────────────────────────────────────────────────────────

export const PRESET_RECOMMENDED_ACTION_TYPE: Record<
  string,
  string | undefined
> = {
  daily_play_generic: "PLAY_GAME",
  daily_play_dice: "PLAY_DICE",
  daily_play_roulette: "PLAY_ROULETTE",
  daily_play_lottery: "PLAY_LOTTERY",
  daily_golden_hour: "GOLDEN_HOUR_PLAY",
  daily_shop_purchase: "BUY_SHOP_ITEM",
  daily_login_gift: "LOGIN",
  daily_cc_deposit: "CC_DEPOSIT",
  weekly_play_generic: "PLAY_GAME",
  weekly_play_dice: "PLAY_DICE",
  weekly_play_roulette: "PLAY_ROULETTE",
  weekly_play_lottery: "PLAY_LOTTERY",
  weekly_golden_hour: "GOLDEN_HOUR_PLAY",
  weekly_shop_purchase: "BUY_SHOP_ITEM",
  weekly_login_streak: "LOGIN",
  weekly_cc_deposit: "CC_DEPOSIT",
  new_user_first_login: "LOGIN",
  new_user_first_game: "PLAY_GAME",
  new_user_telegram_join: "JOIN_TELEGRAM_CHANNEL",
  new_user_cc_channel_join: "JOIN_CC_CHANNEL",
  new_user_next_day_login: "CONSECUTIVE_LOGIN",
  streak_challenge_3: "LOGIN",
  golden_hour: "PLAY_GAME",
};

// ─────────────────────────────────────────────────────────────────
// Preset Title Labels
// ─────────────────────────────────────────────────────────────────

export const PRESET_TITLE_LABELS: Record<string, string> = {
  daily_play_generic: "게임 플레이",
  daily_play_dice: "주사위",
  daily_play_roulette: "룰렛",
  daily_play_lottery: "복권",
  daily_golden_hour: "골든아워",
  daily_shop_purchase: "상점 구매",
  daily_login_gift: "출석 체크",
  daily_cc_deposit: "CC 입금",
  weekly_play_generic: "게임 플레이",
  weekly_play_dice: "주사위",
  weekly_play_roulette: "룰렛",
  weekly_play_lottery: "복권",
  weekly_golden_hour: "골든아워",
  weekly_shop_purchase: "상점 구매",
  weekly_login_streak: "로그인",
  weekly_cc_deposit: "CC 입금",
  new_user_first_login: "첫 로그인",
  new_user_first_game: "첫 게임",
  new_user_telegram_join: "텔레그램 입장",
  new_user_cc_channel_join: "CC 채널 입장",
  new_user_next_day_login: "다음날 로그인",
  streak_challenge_3: "연속 출석",
  golden_hour: "골든아워 게임",
};

// ─────────────────────────────────────────────────────────────────
// Category Display
// ─────────────────────────────────────────────────────────────────

export const CATEGORY_PREFIX: Record<string, string> = {
  DAILY: "일일",
  WEEKLY: "주간",
  NEW_USER: "신규",
  SPECIAL: "스페셜",
};

export const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  DAILY: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  WEEKLY: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/20",
  },
  NEW_USER: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/20",
  },
  SPECIAL: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  SPECIAL_EVENT: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
};

// ─────────────────────────────────────────────────────────────────
// Streak Token Type Labels
// ─────────────────────────────────────────────────────────────────

export const TOKEN_TYPE_LABELS: Record<string, string> = {
  ROULETTE_TICKET: "룰렛 티켓",
  DICE_TICKET: "주사위 티켓",
  LOTTERY_TICKET: "복권 티켓",
  GOLD_KEY: "골드 키",
  DIAMOND: "다이아몬드",
  VAULT: "금고 적립금",
  XP: "경험치",
};

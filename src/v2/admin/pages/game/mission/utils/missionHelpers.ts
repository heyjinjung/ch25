/**
 * MissionManagerPage 헬퍼 함수들
 * @module mission/utils/missionHelpers
 */

import {
  LOGIC_KEY_PRESETS,
  CATEGORY_PREFIX,
  PRESET_TITLE_LABELS,
} from "../constants/missionConstants";

// ─────────────────────────────────────────────────────────────────
// Logic Key Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * 로직 키가 골든아워 관련인지 확인
 */
export function isGoldenHourLogicKey(key: string): boolean {
  return /golden/i.test(key);
}

/**
 * 로직 키 정규화 (대문자, 공백 → 언더스코어)
 */
export function normalizeLogicKey(key: string): string {
  return key.toUpperCase().replace(/\s+/g, "_");
}

// ─────────────────────────────────────────────────────────────────
// Category Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * 카테고리 한글 의미 반환
 */
export function getCategoryMeaning(category: string): string {
  return CATEGORY_PREFIX[category] || category;
}

/**
 * 프리셋에서 카테고리 추출
 */
export function getPresetCategory(preset: string): string {
  const found = LOGIC_KEY_PRESETS.find((p) => p.value === preset);
  return found?.category || "DAILY";
}

// ─────────────────────────────────────────────────────────────────
// Key & Title Generators
// ─────────────────────────────────────────────────────────────────

/**
 * 로직 키 생성
 */
export function generateLogicKey(
  preset: string,
  category: string,
  targetValue: number,
): string {
  const keyBody = preset.toUpperCase();
  return `${category}_${keyBody}_${targetValue}`;
}

/**
 * 미션 제목 생성
 */
export function generateTitle(
  preset: string,
  category: string,
  targetValue: number,
): string {
  const catPrefix = CATEGORY_PREFIX[category] || "";
  const baseLabel = PRESET_TITLE_LABELS[preset] || preset;
  return `${catPrefix} ${baseLabel} ${targetValue}회`;
}

// ─────────────────────────────────────────────────────────────────
// UI Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * DAU 트렌드 막대 높이 클래스 계산
 */
export function getTrendHeightClass(dau: number, maxDau: number): string {
  const ratio = dau / maxDau;
  if (ratio >= 0.8) return "h-16";
  if (ratio >= 0.6) return "h-12";
  if (ratio >= 0.4) return "h-8";
  if (ratio >= 0.2) return "h-4";
  return "h-2";
}

/**
 * 보상 타입에 따른 아이콘 타입 반환 (JSX는 컴포넌트에서 처리)
 */
export function getRewardIconType(
  rewardType: string,
): "ticket" | "gift" | "coins" {
  switch (rewardType) {
    case "TICKET_ROULETTE":
    case "TICKET_DICE":
    case "TICKET_LOTTERY":
      return "ticket";
    case "GOLD_KEY":
    case "DIAMOND_KEY":
      return "gift";
    case "VAULT":
    case "XP":
    default:
      return "coins";
  }
}

// ─────────────────────────────────────────────────────────────────
// Streak Types
// ─────────────────────────────────────────────────────────────────

export interface StreakGrant {
  kind: "WALLET" | "INVENTORY";
  token_type: string;
  amount: number;
}

export interface StreakRule {
  day: number;
  enabled: boolean;
  grants: StreakGrant[];
}

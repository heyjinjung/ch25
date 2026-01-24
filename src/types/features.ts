/**
 * 유효한 Feature 타입의
 * - "NONE"은 유효한 feature_type이 아니므로 row가 없음
 * - 프론트엔드에서는 null/undefined 처리하고 UI 메시지로 표현
 */
export type FeatureType =
  | "ROULETTE"
  | "DICE"
  | "LOTTERY"
  | "RANKING"
  | "SEASON_PASS";

// API 응답에서 feature가 없을 수 있으므로 nullable 제공
export type NullableFeatureType = FeatureType | null;

export const FEATURE_LABELS: Record<FeatureType, string> = {
  ROULETTE: "룰렛",
  DICE: "주사위",
  LOTTERY: "복권",
  RANKING: "랭킹",
  SEASON_PASS: "시즌 패스",
};

// 오늘 이벤트 없음 표시 메시지 (NONE 용)
export const NO_FEATURE_MESSAGE = "오늘 진행 중인 이벤트가 없습니다";

/**
 * API 응답값을 FeatureType으로 정규화
 * - 유효하지 않은 값이면 null 반환 (row 없음 또는 일치 안됨)
 */
export const normalizeFeature = (
  value?: string | null,
): NullableFeatureType => {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (
    upper === "ROULETTE" ||
    upper === "DICE" ||
    upper === "LOTTERY" ||
    upper === "RANKING" ||
    upper === "SEASON_PASS"
  ) {
    return upper as FeatureType;
  }
  return null;
};

/**
 * Feature 유효성검사(null-safe)
 */
export const isValidFeature = (value?: string | null): value is FeatureType => {
  return normalizeFeature(value) !== null;
};

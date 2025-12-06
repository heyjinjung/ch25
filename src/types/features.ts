export type FeatureType = "ROULETTE" | "DICE" | "LOTTERY" | "RANKING" | "SEASON_PASS" | "NONE";

export const FEATURE_LABELS: Record<FeatureType, string> = {
  ROULETTE: "룰렛",
  DICE: "주사위",
  LOTTERY: "복권",
  RANKING: "랭킹",
  SEASON_PASS: "시즌 패스",
  NONE: "오늘 진행 중인 이벤트가 없습니다",
};

export const normalizeFeature = (value?: string): FeatureType => {
  if (!value) return "NONE";
  const upper = value.toUpperCase();
  if (upper === "ROULETTE" || upper === "DICE" || upper === "LOTTERY" || upper === "RANKING" || upper === "SEASON_PASS") {
    return upper as FeatureType;
  }
  return "NONE";
};

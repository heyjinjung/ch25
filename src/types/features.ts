/**
 * ? íš¨??Feature ?€???•ì˜
 * - "NONE"?€ ? íš¨??feature_type???„ë‹ˆë©? ?¤ì?ì¤?rowê°€ ?†ìŒ???˜ë?
 * - ?„ë¡ ?¸ì—”?œì—?œëŠ” null/undefinedë¡?ì²˜ë¦¬?˜ê³  UI ë©”ì‹œì§€ë¡??œí˜„
 */
export type FeatureType = "ROULETTE" | "DICE" | "LOTTERY" | "RANKING" | "SEASON_PASS";

// API ?‘ë‹µ?ì„œ featureê°€ ?†ì„ ???ˆìœ¼ë¯€ë¡?nullable ?€???œê³µ
export type NullableFeatureType = FeatureType | null;

export const FEATURE_LABELS: Record<FeatureType, string> = {
  ROULETTE: "ë£°ë ›",
  DICE: "ì£¼ì‚¬??,
  LOTTERY: "ë³µê¶Œ",
  RANKING: "??‚¹",
  SEASON_PASS: "?œì¦Œ ?¨ìŠ¤",
};

// ?¤ëŠ˜ ?´ë²¤?¸ê? ?†ì„ ???œì‹œ??ë©”ì‹œì§€ (NONE ?€???¬ìš©)
export const NO_FEATURE_MESSAGE = "?¤ëŠ˜ ì§„í–‰ ì¤‘ì¸ ?´ë²¤?¸ê? ?†ìŠµ?ˆë‹¤";

/**
 * API ?‘ë‹µê°’ì„ FeatureType?¼ë¡œ ?•ê·œ??
 * - ? íš¨?˜ì? ?Šì? ê°’ì´??ë¹?ê°’ì? null ë°˜í™˜ (row ?†ìŒê³??™ì¼ ?˜ë?)
 */
export const normalizeFeature = (value?: string | null): NullableFeatureType => {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper === "ROULETTE" || upper === "DICE" || upper === "LOTTERY" || upper === "RANKING" || upper === "SEASON_PASS") {
    return upper as FeatureType;
  }
  return null;
};

/**
 * Feature ? íš¨??ê²€??(null-safe)
 */
export const isValidFeature = (value?: string | null): value is FeatureType => {
  return normalizeFeature(value) !== null;
};

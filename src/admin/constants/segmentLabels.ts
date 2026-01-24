// src/admin/constants/segmentLabels.ts

export const SEGMENT_LABELS_KO: Record<string, string> = {
  NEW: "?†Í∑ú",
  VIP: "VIP",
  DORMANT_SHORT: "?®Í∏∞?¥Î©¥",
  DORMANT_LONG: "?•Í∏∞?¥Î©¥",
  ACTIVE_RECENT: "ÏµúÍ∑º?úÎèô",
};

export function segmentLabelKo(code?: string | null): string {
  const trimmed = (code ?? "").trim();
  if (!trimmed) return "-";
  return SEGMENT_LABELS_KO[trimmed] ?? trimmed;
}

export function shouldShowLabelKo(code?: string | null): boolean {
  const trimmed = (code ?? "").trim();
  if (!trimmed) return false;
  return SEGMENT_LABELS_KO[trimmed] !== undefined && SEGMENT_LABELS_KO[trimmed] !== trimmed;
}

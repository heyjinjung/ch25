// src/admin/constants/segmentLabels.ts

export const SEGMENT_LABELS_KO: Record<string, string> = {
  NEW: "신규",
  VIP: "VIP",
  DORMANT_SHORT: "단기휴면",
  DORMANT_LONG: "장기휴면",
  ACTIVE_RECENT: "최근활동",
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

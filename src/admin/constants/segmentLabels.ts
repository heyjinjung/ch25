// src/admin/constants/segmentLabels.ts

export const SEGMENT_LABELS_KO: Record<string, string> = {
  COMMON: "일반",
  VIP: "VIP",
  WHALE: "고액",
  AT_RISK: "이탈 위험",
};

export function segmentLabelKo(code?: string | null): string {
  const trimmed = (code ?? "").trim();
  if (!trimmed) return "-";
  return SEGMENT_LABELS_KO[trimmed] ?? trimmed;
}

export function shouldShowLabelKo(code?: string | null): boolean {
  const trimmed = (code ?? "").trim();
  if (!trimmed) return false;
  return (
    SEGMENT_LABELS_KO[trimmed] !== undefined &&
    SEGMENT_LABELS_KO[trimmed] !== trimmed
  );
}

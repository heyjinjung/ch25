export type HapticPattern = number | number[];

export function tryHaptic(pattern: HapticPattern = 10): void {
  // 1. Try Telegram HapticFeedback API (Best for iOS/Android in Telegram)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tgHaptic = (window as any).Telegram?.WebApp?.HapticFeedback;

  if (tgHaptic) {
    try {
      if (Array.isArray(pattern)) {
        // Complex pattern: treat as a significant event
        tgHaptic.notificationOccurred("success");
      } else {
        // Single duration
        if (pattern <= 20) {
          // Short tick -> selection changed (best for wheel ticks)
          tgHaptic.selectionChanged();
        } else {
          // Harder impact
          const style = pattern > 40 ? "heavy" : pattern > 20 ? "medium" : "light";
          tgHaptic.impactOccurred(style);
        }
      }
    } catch {
      /* ignore */
    }
    return;
  }

  // 2. Fallback to standard Web Vibration API
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (p: HapticPattern) => boolean };
  if (typeof nav.vibrate !== "function") return;

  try {
    nav.vibrate(pattern);
  } catch {
    // ignore
  }
}

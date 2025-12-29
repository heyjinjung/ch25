export type HapticPattern = number | number[];

export function tryHaptic(pattern: HapticPattern = 10): void {
  // 1. Try Telegram HapticFeedback API (Best for iOS/Android in Telegram)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tg = (window as any).Telegram?.WebApp;
  const tgHaptic = tg?.HapticFeedback;

  if (tgHaptic) {
    // Version Check: HapticFeedback was improved in 6.1
    const isSupportedVersion = tg.isVersionAtLeast ? tg.isVersionAtLeast("6.1") : false;

    if (isSupportedVersion) {
      try {
        if (Array.isArray(pattern)) {
          tgHaptic.notificationOccurred("success");
        } else {
          if (pattern <= 20) {
            tgHaptic.selectionChanged();
          } else {
            const style = pattern > 40 ? "heavy" : pattern > 20 ? "medium" : "light";
            tgHaptic.impactOccurred(style);
          }
        }
      } catch {
        /* ignore */
      }
      return;
    }
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

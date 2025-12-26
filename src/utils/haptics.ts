export type HapticPattern = number | number[];

export function tryHaptic(pattern: HapticPattern = 10): void {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (p: HapticPattern) => boolean };
  if (typeof nav.vibrate !== "function") return;

  try {
    nav.vibrate(pattern);
  } catch {
    // ignore
  }
}

// Minimal V2 haptics util — keeps parity with V1 `tryHaptic` behaviour.
export const tryHaptic = (duration = 20): void => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      // navigator.vibrate accepts number or pattern
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      navigator.vibrate(duration);
    }
  } catch (_e) {
    // ignore runtime issues on some environments
  }
};

export default tryHaptic;

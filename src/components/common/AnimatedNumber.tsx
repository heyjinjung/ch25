import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  from?: number;
  durationMs?: number;
  locale?: string;
  onAnimationStart?: () => void;
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const AnimatedNumber: React.FC<Props> = ({ value, from = 0, durationMs = 650, locale = "ko-KR", onAnimationStart }) => {
  const [display, setDisplay] = useState<number>(() => from);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // [FIX] Use current 'display' state as startValue to handle StrictMode re-runs and interruptions correctly.
    // This prevents the "skip to end" bug where refs were updated prematurely.
    const startValue = display;
    const endValue = Number.isFinite(value) ? value : 0;

    if (durationMs <= 0 || startValue === endValue) {
      setDisplay(endValue);
      return;
    }

    if (onAnimationStart) onAnimationStart();

    const startAt = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - startAt) / durationMs);
      const eased = easeOutCubic(t);
      const next = Math.round(startValue + (endValue - startValue) * eased);
      setDisplay(next);
      if (t < 1) rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value, durationMs]);

  return <>{display.toLocaleString(locale)}</>;
};

export default AnimatedNumber;

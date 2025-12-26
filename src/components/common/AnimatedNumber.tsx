import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  from?: number;
  durationMs?: number;
  locale?: string;
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const AnimatedNumber: React.FC<Props> = ({ value, from = 0, durationMs = 650, locale = "ko-KR" }) => {
  const [display, setDisplay] = useState<number>(() => from);
  const rafRef = useRef<number | null>(null);
  const lastValueRef = useRef<number>(value);

  useEffect(() => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const startValue = Number.isFinite(lastValueRef.current) ? lastValueRef.current : from;
    const endValue = Number.isFinite(value) ? value : 0;
    lastValueRef.current = endValue;

    if (durationMs <= 0 || startValue === endValue) {
      setDisplay(endValue);
      return;
    }

    const startAt = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - startAt) / durationMs);
      const eased = easeOutCubic(t);
      const next = Math.round(startValue + (endValue - startValue) * eased);
      setDisplay(next);
      if (t < 1) rafRef.current = window.requestAnimationFrame(tick);
    };

    setDisplay(startValue);
    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value, from, durationMs]);

  return <>{display.toLocaleString(locale)}</>;
};

export default AnimatedNumber;

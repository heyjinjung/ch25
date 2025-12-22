import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  targetMs?: number | null;
  className?: string;
  warnUnderMs?: number;
  emptyText?: string;
  expiredText?: string;
  suffix?: string;
  showDays?: boolean;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const Segment: React.FC<{ value: string; className?: string }> = ({ value, className }) => {
  const prevRef = useRef<string>(value);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (prevRef.current === value) return;
    prevRef.current = value;

    setBump(true);
    const t = window.setTimeout(() => setBump(false), 170);
    return () => window.clearTimeout(t);
  }, [value]);

  return (
    <span
      className={
        "inline-block tabular-nums transition-transform duration-150 will-change-transform " +
        (bump ? "scale-[1.06]" : "scale-100") +
        (className ? ` ${className}` : "")
      }
      aria-label={value}
    >
      {value}
    </span>
  );
};

const AnimatedCountdown: React.FC<Props> = ({
  targetMs,
  className,
  warnUnderMs,
  emptyText = "-",
  expiredText = "종료",
  suffix,
  showDays = true,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!targetMs || !Number.isFinite(targetMs)) return;

    const tick = () => setNowMs(Date.now());
    tick();

    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);

  const model = useMemo(() => {
    if (!targetMs || !Number.isFinite(targetMs)) {
      return { kind: "empty" as const };
    }

    const msLeft = Math.max(0, targetMs - nowMs);
    const isExpired = msLeft <= 0;

    if (isExpired) {
      return { kind: "expired" as const };
    }

    const totalSeconds = Math.floor(msLeft / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const isWarning = typeof warnUnderMs === "number" && warnUnderMs > 0 ? msLeft < warnUnderMs : false;

    return {
      kind: "running" as const,
      days,
      hours,
      minutes,
      seconds,
      isWarning,
    };
  }, [nowMs, targetMs, warnUnderMs]);

  if (model.kind === "empty") {
    return <span className={className}>{emptyText}</span>;
  }

  if (model.kind === "expired") {
    return <span className={className}>{expiredText}</span>;
  }

  const toneClass = model.isWarning ? "text-red-300" : "";

  return (
    <span className={(className ?? "") + (toneClass ? ` ${toneClass}` : "")}>
      {showDays && model.days > 0 ? (
        <>
          <Segment value={String(model.days)} />
          <span className="mx-1">일</span>
        </>
      ) : null}
      <Segment value={pad2(model.hours)} />
      <span className="ml-1">시간</span>
      <span className="mx-1" />
      <Segment value={pad2(model.minutes)} />
      <span className="ml-1">분</span>
      <span className="mx-1" />
      <Segment value={pad2(model.seconds)} />
      <span className="ml-1">초</span>
      {suffix ? <span className="ml-2">{suffix}</span> : null}
    </span>
  );
};

export default AnimatedCountdown;

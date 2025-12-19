import { useEffect, useMemo, useRef, useState } from "react";

interface Segment {
  readonly label: string;
  readonly weight?: number;
  readonly isJackpot?: boolean;
}

interface RouletteWheelProps {
  readonly segments: Segment[];
  readonly isSpinning: boolean;
  readonly selectedIndex?: number;
  readonly spinDurationMs?: number;
  readonly onSpinEnd?: () => void;
}

type SegmentStyle = { fill: string; stroke: string; label: string };

const SEGMENT_STYLES: SegmentStyle[] = [
  { fill: "#000000", stroke: "#FFFFFF", label: "#FFFFFF" },
  { fill: "#FFFFFF", stroke: "#000000", label: "#000000" },
  { fill: "#D2FD9C", stroke: "#394508", label: "#394508" },
  { fill: "#394508", stroke: "#000000", label: "#FFFFFF" },
  { fill: "#282D1A", stroke: "#000000", label: "#FFFFFF" },
  { fill: "#5D5D5D", stroke: "#000000", label: "#FFFFFF" },
];

const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
};

const RouletteWheel: React.FC<RouletteWheelProps> = ({
  segments,
  isSpinning,
  selectedIndex,
  spinDurationMs = 3000,
  onSpinEnd,
}) => {
  const [rotation, setRotation] = useState(0);
  const spinCountRef = useRef(0);
  const wheelRef = useRef<SVGSVGElement | null>(null);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const segmentCount = segments.length || 6;
  const anglePerSegment = useMemo(() => 360 / segmentCount, [segmentCount]);

  useEffect(() => {
    if (!isSpinning) return;
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    // Increase base turns every spin so the transform value always changes.
    const baseTurns = 6 + spinCountRef.current; // grows to force animation re-trigger
    const spinTo =
      selectedIndex !== undefined
        ? 360 * baseTurns + (360 - anglePerSegment * selectedIndex - anglePerSegment / 2)
        : 360 * baseTurns;
    console.log("[Roulette] wheel spin", {
      baseTurns,
      spinTo,
      selectedIndex,
      anglePerSegment,
    });
    setRotation(spinTo);
    spinCountRef.current += 1;

    // Fallback: if transitionend is missed, fire onSpinEnd after spin duration.
    fallbackTimeoutRef.current = setTimeout(() => {
      console.warn("[Roulette] transitionend fallback fired");
      onSpinEnd?.();
    }, spinDurationMs + 50);
  }, [anglePerSegment, isSpinning, selectedIndex, spinDurationMs, onSpinEnd]);

  useEffect(() => {
    if (!isSpinning) return;
    const node = wheelRef.current;
    if (!node) return;

    const handleEnd = (e: TransitionEvent) => {
      if (e.propertyName === "transform") {
        onSpinEnd?.();
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }
      }
    };

    node.addEventListener("transitionend", handleEnd);
    return () => {
      node.removeEventListener("transitionend", handleEnd);
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };
  }, [isSpinning, onSpinEnd, spinDurationMs]);

  return (
    <div className="relative mx-auto flex flex-col items-center gap-4">
      {/* Pointer */}
      <div className="absolute -top-2 left-1/2 z-20 -translate-x-1/2">
        <div className="h-0 w-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-cc-lime drop-shadow-[0_6px_14px_rgba(0,0,0,0.65)]" />
      </div>

      {/* Wheel */}
      <div className="relative aspect-square w-full max-w-[360px] rounded-[32px] border border-white/10 bg-black/30 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.55)] sm:p-5">
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full rounded-full bg-black shadow-[0_0_46px_rgba(210,253,156,0.12)]"
          ref={wheelRef}
          style={{ transform: `rotate(${rotation}deg)`, transition: `transform ${spinDurationMs}ms ease-out` }}
        >
          <circle cx="100" cy="100" r="96" fill="#000000" stroke="#D2FD9C" strokeWidth="3" />
          {segments.map((segment, index) => {
            const startAngle = anglePerSegment * index;
            const endAngle = startAngle + anglePerSegment;
            const isJackpot = segment.isJackpot || segment.label.toLowerCase().includes("jackpot");
            const path = describeArc(100, 100, 90, startAngle, endAngle);
            const labelAngle = startAngle + anglePerSegment / 2;
            const labelPos = polarToCartesian(100, 100, 55, labelAngle);
            const baseStyle = SEGMENT_STYLES[index % SEGMENT_STYLES.length];
            const style = isJackpot
              ? { fill: "#D2FD9C", stroke: "#394508", label: "#394508" }
              : baseStyle;

            return (
              <g key={`${segment.label}-${index}`}>
                <path d={path} fill={style.fill} stroke={style.stroke} strokeWidth="1.25" />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fill={style.label}
                  fontSize="8"
                  fontWeight="700"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  transform={`rotate(${labelAngle} ${labelPos.x} ${labelPos.y})`}
                >
                  {segment.label}
                </text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="18" fill="url(#hub)" stroke="#D2FD9C" strokeWidth="2" />
          <text x="100" y="104" textAnchor="middle" fill="#FFFFFF" fontWeight="800" fontSize="10">
            WIN
          </text>
          <defs>
            <radialGradient id="hub" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#282D1A" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

export default RouletteWheel;

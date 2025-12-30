// src/components/game/RouletteWheel.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import RouletteFrame from "./RouletteFrame";

interface Segment {
  readonly label: string;
  readonly weight?: number;
  readonly isJackpot?: boolean;
}

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

interface RouletteWheelProps {
  readonly segments: Segment[];
  readonly isSpinning: boolean;
  readonly selectedIndex?: number;
  readonly spinDurationMs?: number;
  readonly onSpinEnd?: () => void;
}

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

  const segmentCount = segments.length || 8;
  const anglePerSegment = useMemo(() => 360 / segmentCount, [segmentCount]);

  useEffect(() => {
    if (!isSpinning) return;
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    const baseTurns = 8 + spinCountRef.current * 2;
    const spinTo =
      selectedIndex !== undefined
        ? 360 * baseTurns + (360 - anglePerSegment * selectedIndex - anglePerSegment / 2)
        : 360 * baseTurns;

    setRotation(spinTo);
    spinCountRef.current += 1;

    fallbackTimeoutRef.current = setTimeout(() => {
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
    };
  }, [isSpinning, onSpinEnd]);

  return (
    <div className="relative mx-auto flex flex-col items-center">
      {/* Premium Pointer */}
      <div className="absolute -top-8 left-1/2 z-40 -translate-x-1/2 drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M20 38L38 8H2L20 38Z" fill="#30FF75" />
          <path d="M20 38L38 8H2L20 38Z" stroke="white" strokeWidth="3" strokeLinejoin="round" />
          <path d="M20 34L34 10H6L20 34Z" fill="white" fillOpacity="0.2" />
        </svg>
      </div>

      <RouletteFrame>
        <div className="relative h-full w-full overflow-hidden rounded-full shadow-[inset_0_0_80px_rgba(0,0,0,0.9)] bg-[#000604]">
          <svg
            viewBox="0 0 200 200"
            className="h-full w-full"
            ref={wheelRef}
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: `transform ${spinDurationMs}ms cubic-bezier(0.15, 0, 0.15, 1)`
            }}
          >
            <defs>
              {/* Outer Glow Ring Gradient */}
              <linearGradient id="rainbow-border" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(225)">
                <stop offset="16%" stopColor="#FEDC31" />
                <stop offset="22.46%" stopColor="#FDC347" />
                <stop offset="35.39%" stopColor="#FC8682" />
                <stop offset="53.35%" stopColor="#FA2CD7" />
                <stop offset="70.59%" stopColor="#987CDB" />
                <stop offset="87.83%" stopColor="#33D0E0" />
              </linearGradient>

              {/* Segment Gradients based on provided CSS */}
              <linearGradient id="grad-pink" x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform="rotate(315)">
                <stop offset="22.59%" stopColor="#CC0A60" />
                <stop offset="54.96%" stopColor="#E60C69" />
                <stop offset="90.03%" stopColor="#FE0E73" />
              </linearGradient>
              <linearGradient id="grad-teal" x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform="rotate(45)">
                <stop offset="22.05%" stopColor="#006F67" />
                <stop offset="26.95%" stopColor="#00756B" />
                <stop offset="71.12%" stopColor="#00B392" />
                <stop offset="92.15%" stopColor="#00CBA2" />
              </linearGradient>
              <linearGradient id="grad-red" x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform="rotate(140.95)">
                <stop offset="24.56%" stopColor="#FF260D" />
                <stop offset="42.26%" stopColor="#FE3E0E" />
                <stop offset="80.49%" stopColor="#FC7B10" />
                <stop offset="95.35%" stopColor="#FC9512" />
              </linearGradient>
              <linearGradient id="grad-orange" x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform="rotate(225)">
                <stop offset="22.66%" stopColor="#FC9512" />
                <stop offset="69.33%" stopColor="#FED319" />
                <stop offset="91.3%" stopColor="#FFEB1C" />
              </linearGradient>
              <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform="rotate(90)">
                <stop offset="-0.01%" stopColor="#2FFFFF" />
                <stop offset="26.99%" stopColor="#2AE7FF" />
                <stop offset="82%" stopColor="#1EA9FF" />
                <stop offset="100%" stopColor="#1A95FF" />
              </linearGradient>
              <linearGradient id="grad-gray" x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform="rotate(90)">
                <stop offset="2.36%" stopColor="#808080" />
                <stop offset="52.29%" stopColor="#9D9D9D" />
                <stop offset="100.25%" stopColor="#B5B5B5" />
              </linearGradient>
              <linearGradient id="grad-yellow" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="3.8%" stopColor="#FE7A18" />
                <stop offset="34.25%" stopColor="#FE9115" />
                <stop offset="96.09%" stopColor="#FFCC0F" />
              </linearGradient>
              <linearGradient id="grad-purple" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="1.63%" stopColor="#3D08EA" />
                <stop offset="46.9%" stopColor="#600FF4" />
                <stop offset="83.94%" stopColor="#7815FC" />
              </linearGradient>

            </defs>

            {/* Rainbow Outer Frame */}
            <circle cx="100" cy="100" r="98" stroke="url(#rainbow-border)" strokeWidth="1.5" fill="none" />

            {/* Dark Inner Base */}
            <circle cx="100" cy="100" r="95" fill="black" />

            {/* Segments Mapping */}
            {segments.map((segment, index) => {
              const startAngle = anglePerSegment * index;
              const endAngle = startAngle + anglePerSegment;
              const path = describeArc(100, 100, 92, startAngle, endAngle);
              const grads = ["#grad-purple", "#grad-orange", "#grad-teal", "#grad-yellow", "#grad-red", "#grad-blue", "#grad-pink", "#grad-gray"];
              const fill = grads[index % grads.length];

              return (
                <g key={`seg-${index}`}>
                  <path d={path} fill={`url(${fill})`} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

                  {/* Radial Labels */}
                  <g transform={`rotate(${startAngle + anglePerSegment / 2} 100 100)`}>
                    <text
                      x="100"
                      y="40"
                      fill="white"
                      fontSize="9"
                      fontWeight="1000"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      transform="rotate(90, 100, 40)"
                      className="tracking-tighter uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                      style={{ filter: 'drop-shadow(0 0 1px black)' }}
                    >
                      {segment.label}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Premium Center Hub Reconstruction */}
            <g transform="translate(100 100)">
              {/* Outer Decorative Ring */}
              <circle r="25" fill="rgba(0,0,0,0.6)" stroke="white" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
              <circle r="20" fill="#000" stroke="url(#rainbow-border)" strokeWidth="2" />
              <circle r="14" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />

              {/* Core Hub */}
              <circle r="8" fill="#FFF" opacity="0.1" />
              <circle r="4" fill="#30FF75" className="animate-pulse" />
            </g>
          </svg>
        </div>
      </RouletteFrame>
    </div>
  );
};

export default RouletteWheel;

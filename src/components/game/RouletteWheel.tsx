// src/components/game/RouletteWheel.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import RouletteFrame from "./RouletteFrame";

interface Segment {
  readonly label: string;
  readonly weight?: number;
  readonly isJackpot?: boolean;
}

export type SegmentStyle = { fill: string; stroke: string; label: string };

interface RouletteWheelProps {
  readonly segments: Segment[];
  readonly isSpinning: boolean;
  readonly selectedIndex?: number;
  readonly spinDurationMs?: number;
  readonly onSpinEnd?: () => void;
  readonly theme?: SegmentStyle[];
}

const TRIANGLE_IMAGES = [
  "/assets/roulette/triangle_purple.png",
  "/assets/roulette/triangle_orange.png",
  "/assets/roulette/triangle_teal.png",
  "/assets/roulette/triangle_yellow.png",
  "/assets/roulette/triangle_red.png",
  "/assets/roulette/triangle_blue.png",
  "/assets/roulette/triangle_pink.png",
];

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
      {/* Pointer */}
      <div className="absolute -top-6 left-1/2 z-40 -translate-x-1/2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
        <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
          <path d="M20 38L38 8H2L20 38Z" fill="#30FF75" />
          <path d="M20 38L38 8H2L20 38Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>

      <RouletteFrame>
        <div className="relative h-full w-full overflow-hidden rounded-full shadow-[inset_0_0_50px_rgba(0,0,0,1)]">
          {/* Background Layer: Rainbow Glow */}
          <img src="/assets/roulette/v2.png" alt="glow" className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-screen" />

          <svg
            viewBox="0 0 200 200"
            className="h-full w-full"
            ref={wheelRef}
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: `transform ${spinDurationMs}ms cubic-bezier(0.15, 0, 0.15, 1)`
            }}
          >
            {/* Draw Segments */}
            {segments.map((segment, index) => {
              const imgRotation = anglePerSegment * index;

              const triangleImg = TRIANGLE_IMAGES[index % TRIANGLE_IMAGES.length];

              return (
                <g key={`${segment.label}-${index}`} transform={`rotate(${imgRotation} 100 100)`}>
                  {/* Triangle Image Section */}
                  <image
                    href={triangleImg}
                    x="50"
                    y="0"
                    width="100"
                    height="100"
                    className="origin-bottom"
                    style={{
                      // clipPath could be used here for non-triangle assets, 
                      // but if these are pre-cut triangles, we just rotate them.
                      transform: `rotate(${anglePerSegment / 2} 100 100)`
                    }}
                  />

                  {/* Label Text */}
                  <g transform={`rotate(${anglePerSegment / 2} 100 100)`}>
                    <text
                      x="100"
                      y="45"
                      fill="white"
                      fontSize="9"
                      fontWeight="900"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      transform={`rotate(${90} 100 45)`}
                      className="tracking-tighter uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,1)]"
                    >
                      {segment.label}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Decorative Stars */}
            <image href="/assets/roulette/v4.png" x="80" y="80" width="40" height="40" className="animate-pulse" />

            {/* Center Hub */}
            <image href="/assets/roulette/white_hub.png" x="75" y="75" width="50" height="50" className="drop-shadow-2xl" />
          </svg>
        </div>
      </RouletteFrame>
    </div>
  );
};

export default RouletteWheel;

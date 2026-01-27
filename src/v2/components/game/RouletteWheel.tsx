import { useEffect, useMemo, useRef, useState } from "react";
import RouletteFrame from "./RouletteFrame";
import RouletteTextureOverlay from "./RouletteTextureOverlay";

interface Segment {
  readonly label: string;
  readonly weight?: number;
  readonly reward_type?: string;
  readonly reward_amount?: number;
  readonly slot_index?: number;
  readonly is_fever_reward?: boolean;
}

const FIGMA_SLICE_LAYOUT = [
  // Figma (1189:616) relative coords, converted to Tailwind arbitrary % classes.
  {
    src: "/assets/roulette/Vector4.svg",
    alt: "Slice Vector4",
    className: "left-[50%] top-[50%] w-[38.32%] h-[38.31%]",
  },
  {
    src: "/assets/roulette/Vector5.svg",
    alt: "Slice Vector5",
    className: "left-[11.69%] top-[50%] w-[38.32%] h-[38.31%]",
  },
  {
    src: "/assets/roulette/Vector6.svg",
    alt: "Slice Vector6",
    className: "left-[11.69%] top-[11.69%] w-[38.32%] h-[38.31%]",
  },
  {
    src: "/assets/roulette/Vector7.svg",
    alt: "Slice Vector7",
    className: "left-[50%] top-[11.69%] w-[38.32%] h-[38.31%]",
  },
  {
    src: "/assets/roulette/Vector8.svg",
    alt: "Slice Vector8",
    className: "left-[50.00%] top-[31.89%] w-[41.64%] h-[36.21%]",
  },
  {
    src: "/assets/roulette/Vector9.svg",
    alt: "Slice Vector9",
    className: "left-[8.36%] top-[31.89%] w-[41.64%] h-[36.21%]",
  },
  {
    src: "/assets/roulette/Vector10.svg",
    alt: "Slice Vector10",
    className: "left-[31.89%] top-[8.35%] w-[36.21%] h-[41.64%]",
  },
  {
    src: "/assets/roulette/Vector11.svg",
    alt: "Slice Vector11",
    className: "left-[31.89%] top-[50.00%] w-[36.21%] h-[41.64%]",
  },
] as const;

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
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ROTATE_CLASSES = useMemo(
    () =>
      [
        "rotate-[22.5deg]",
        "rotate-[67.5deg]",
        "rotate-[112.5deg]",
        "rotate-[157.5deg]",
        "rotate-[202.5deg]",
        "rotate-[247.5deg]",
        "rotate-[292.5deg]",
        "rotate-[337.5deg]",
      ] as const,
    [],
  );

  const LABEL_RADIUS_CLASSES = useMemo(
    () =>
      [
        "-translate-y-[44px]",
        "-translate-y-[50px]",
        "-translate-y-[56px]",
        "-translate-y-[62px]",
        "-translate-y-[68px]",
        "-translate-y-[74px]",
        "-translate-y-[80px]",
      ] as const,
    [],
  );

  const LABEL_MAX_WIDTH_CLASSES = useMemo(
    () =>
      [
        "max-w-[40px]",
        "max-w-[48px]",
        "max-w-[56px]",
        "max-w-[64px]",
        "max-w-[72px]",
        "max-w-[80px]",
      ] as const,
    [],
  );

  const [labelLayout, setLabelLayout] = useState(() => ({
    radiusIdx: 3,
    maxWidthIdx: 2,
  }));

  const segmentCount = 8;
  const anglePerSegment = useMemo(() => 360 / segmentCount, [segmentCount]);
  const visualBaseOffsetDeg = useMemo(
    () => -anglePerSegment / 2,
    [anglePerSegment],
  );

  useEffect(() => {
    const node = wheelRef.current;
    if (!node) return;

    const pickNearestIndex = (value: number, candidates: readonly number[]) => {
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < candidates.length; i += 1) {
        const candidate = candidates[i];
        if (candidate === undefined) continue;
        const distance = Math.abs(value - candidate);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i;
        }
      }
      return bestIndex;
    };

    const compute = () => {
      const rect = node.getBoundingClientRect();
      const diameter = Math.min(rect.width, rect.height);
      const wheelRadius = diameter / 2;

      // Keep labels inside the slice: pick a stable radius + safe angular padding.
      // segmentCount=8 => anglePerSegment=45deg.
      // Use wider padding (delta=6deg per side) and keep labels comfortably inside the slice.
      const labelRadius = wheelRadius * 0.62;
      const radiusPx = Math.floor(labelRadius);

      const radiusBucketPx = [44, 50, 56, 62, 68, 74, 80] as const;
      const widthBucketPx = [40, 48, 56, 64, 72, 80] as const;

      const radiusIdx = pickNearestIndex(radiusPx, radiusBucketPx);
      const chosenRadiusPx = radiusBucketPx[radiusIdx] ?? 62;

      const safeAngleRad = ((anglePerSegment - 12) * Math.PI) / 180;
      const safeChord = 2 * chosenRadiusPx * Math.sin(safeAngleRad / 2);
      const maxWidth = Math.max(28, Math.floor(safeChord - 10));

      setLabelLayout({
        radiusIdx,
        maxWidthIdx: pickNearestIndex(maxWidth, widthBucketPx),
      });
    };

    compute();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => compute());
      ro.observe(node);
      return () => ro.disconnect();
    }

    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [anglePerSegment]);

  useEffect(() => {
    if (!isSpinning) return;
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    const baseTurns = 12 + spinCountRef.current * 4;
    const spinTo =
      selectedIndex !== undefined
        ? 360 * baseTurns + (360 - anglePerSegment * selectedIndex)
        : 360 * baseTurns;

    setRotation(spinTo);
    spinCountRef.current += 1;

    fallbackTimeoutRef.current = setTimeout(() => {
      onSpinEnd?.();
    }, spinDurationMs + 50);
  }, [anglePerSegment, isSpinning, selectedIndex, spinDurationMs, onSpinEnd]);

  useEffect(() => {
    const node = wheelRef.current;
    if (!node) return;
    node.style.transform = `rotate(${rotation + visualBaseOffsetDeg}deg)`;
    node.style.transition = `transform ${spinDurationMs}ms cubic-bezier(0.1, 0, 0.1, 1)`;
  }, [rotation, spinDurationMs, visualBaseOffsetDeg]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Pointer highlight (Figma: 1189:758) */}
      <img
        src="/assets/roulette/13.svg"
        alt="Pointer Highlight"
        draggable={false}
        className="absolute left-1/2 top-0 z-50 -translate-x-1/2 -translate-y-7 h-10 w-auto pointer-events-none"
      />

      <RouletteFrame>
        {/* Rotating Wheel Container */}
        <div
          ref={wheelRef}
          className="relative h-full w-full rounded-full transition-transform will-change-transform"
        >
          {/* User Requested Texture Overlay - Clean Black Pattern */}
          <RouletteTextureOverlay />

          {/* Figma overlay: 12 (multiply) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none mix-blend-multiply z-10">
            <img
              src="/assets/roulette/12.svg"
              alt="Overlay 12"
              draggable={false}
              className="w-[98.4%] h-[98.4%]"
            />
          </div>

          {/* Figma slices (Vector4~Vector11) */}
          <div className="absolute inset-0">
            {FIGMA_SLICE_LAYOUT.map((slice) => (
              <img
                key={slice.src}
                src={slice.src}
                alt={slice.alt}
                draggable={false}
                className={`absolute ${slice.className}`}
              />
            ))}
          </div>

          {/* Figma overlay: 14/15 (overlay) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none mix-blend-overlay z-10">
            <img
              src="/assets/roulette/14.svg"
              alt="Overlay 14"
              draggable={false}
              className="w-[86.33%] h-[86.33%]"
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none mix-blend-overlay z-10">
            <img
              src="/assets/roulette/15.svg"
              alt="Overlay 15"
              draggable={false}
              className="w-[26.98%] h-[26.98%]"
            />
          </div>

          {/* Soft overlay for depth */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.10)_0%,rgba(0,0,0,0.35)_70%,rgba(0,0,0,0.55)_100%)] mix-blend-overlay z-10" />

          {/* Labels - Mathematically positioned */}
          {Array.from({ length: segmentCount }).map((_, index) => {
            const segment = segments[index];
            return (
              <div
                key={`lbl-${index}`}
                className={`absolute inset-0 flex items-center justify-center pointer-events-none z-20 ${ROTATE_CLASSES[index]}`}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div
                    className={`flex items-center justify-center ${
                      LABEL_RADIUS_CLASSES[labelLayout.radiusIdx]
                    }`}
                  >
                    <span
                      className={`block text-[13.8px] leading-[1.02] font-black text-white uppercase text-center line-clamp-2 [overflow-wrap:anywhere] px-1 rounded tracking-normal ${
                        LABEL_MAX_WIDTH_CLASSES[labelLayout.maxWidthIdx]
                      }`}
                    >
                      {segment?.label ?? ""}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Center Hubcap */}
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <img
              src="/assets/roulette/16.svg"
              alt="Center Cap"
              draggable={false}
              className="w-[20.2%] h-[20.2%] pointer-events-none"
            />
          </div>
        </div>
      </RouletteFrame>
    </div>
  );
};

export default RouletteWheel;

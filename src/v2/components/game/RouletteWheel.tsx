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

  const segmentCount = 8;
  const anglePerSegment = useMemo(() => 360 / segmentCount, [segmentCount]);

  useEffect(() => {
    if (!isSpinning) return;
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    const baseTurns = 12 + spinCountRef.current * 4;
    const spinTo =
      selectedIndex !== undefined
        ? 360 * baseTurns +
          (360 - anglePerSegment * selectedIndex - anglePerSegment / 2)
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
    node.style.transform = `rotate(${rotation}deg)`;
    node.style.transition = `transform ${spinDurationMs}ms cubic-bezier(0.1, 0, 0.1, 1)`;
  }, [rotation, spinDurationMs]);

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
            // Calculate rotation: start from top (0deg) + segment offset
            const rotateDeg = (360 / segmentCount) * index + (360 / segmentCount / 2);
            
            // Radial Alignment Logic:
            // 1. Point towards center: rotate(deg + 90deg)
            // 2. Position: Move outwards from center using translateY (negative)
            return (
              <div
                key={`lbl-${index}`}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                style={{ transform: `rotate(${rotateDeg}deg)` }}
              >
                <div 
                   className="absolute top-1/2 left-1/2 flex items-center justify-center"
                   style={{ 
                     transform: `translate(-50%, -50%) rotate(90deg) translate(-75px, 0px)` 
                     // rotate(90deg): Text becomes radial (perpendicular) to radius
                     // translate(-75px, 0px): Push text towards the Rim (negative X after rotation goes "Up" relative to text)
                   }}
                >
                  <span className="text-[12px] font-black text-white uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] whitespace-nowrap tracking-wide">
                    {segment?.label ?? ""}
                  </span>
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

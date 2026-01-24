import { useEffect, useMemo, useRef, useState } from "react";
import RouletteFrame from "./RouletteFrame";

interface Segment {
  readonly label: string;
  readonly weight?: number;
  readonly reward_type?: string;
  readonly reward_amount?: number;
  readonly slot_index?: number;
  readonly is_fever_reward?: boolean;
}

const COLOR_MAP: Record<string, string> = {
  red: "/assets/roulette/triangle_red.png",
  orange: "/assets/roulette/triangle_orange.png",
  yellow: "/assets/roulette/triangle_yellow.png",
  teal: "/assets/roulette/triangle_teal.png",
  blue: "/assets/roulette/triangle_blue.png",
  purple: "/assets/roulette/triangle_purple.png",
  pink: "/assets/roulette/triangle_pink.png",
  gray: "/assets/roulette/triangle_gray.png",
};

const COLOR_SEQUENCE = ["purple", "orange", "teal", "yellow", "red", "blue", "pink", "gray"];

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

  const segmentCount = segments.length || 8;
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
        ? 360 * baseTurns + (360 - anglePerSegment * selectedIndex - anglePerSegment / 2)
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
      {/* Premium Pointer - Banner Style */}
      <div className="absolute top-0 left-1/2 z-50 -translate-x-1/2 -translate-y-8 pointer-events-none scale-125">
        <img src="/assets/roulette/gradient_banner.png" alt="Pointer" className="h-10 w-auto drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]" />
      </div>

      <RouletteFrame>
        {/* Rotating Wheel Container */}
        <div 
          ref={wheelRef}
          className="relative h-full w-full rounded-full transition-transform will-change-transform"
        >
          {segments.map((segment, index) => {
            const startAngle = anglePerSegment * index;
            const colorName = COLOR_SEQUENCE[index % COLOR_SEQUENCE.length];
            const triangleAsset = COLOR_MAP[colorName];

            return (
              <div 
                key={`seg-${index}`}
                className="absolute inset-0 flex items-start justify-center origin-center"
                style={{ transform: `rotate(${startAngle}deg)` }}
              >
                {/* Triangle Base */}
                <div className="relative w-full h-1/2 flex items-center justify-center">
                  <img 
                    src={triangleAsset} 
                    alt={segment.label}
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Label (Positioned mid-triangle) */}
                  <div 
                     className="absolute inset-0 flex flex-col items-center pt-8 pointer-events-none"
                     style={{ transform: `rotate(${anglePerSegment / 2}deg)`, transformOrigin: 'bottom center' }}
                  >
                     <span className="text-[11px] font-black text-white uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] whitespace-nowrap">
                        {segment.label}
                     </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Center Hubcap */}
          <div className="absolute inset-0 flex items-center justify-center z-30">
             <div className="w-16 h-16 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center p-1">
               <img src="/assets/roulette/white_hub.png" alt="Hub" className="w-full h-full object-contain" />
             </div>
          </div>
        </div>
      </RouletteFrame>
    </div>
  );
};

export default RouletteWheel;

// src/components/game/RouletteWheel.tsx
import { useEffect, useMemo, useState } from "react";

interface Segment {
  readonly label: string;
  readonly weight?: number;
  readonly isJackpot?: boolean;
}

interface RouletteWheelProps {
  readonly segments: Segment[];
  readonly isSpinning: boolean;
  readonly selectedIndex?: number;
}

const SEGMENT_COLORS = [
  "from-emerald-600 to-emerald-700",
  "from-red-600 to-red-700",
  "from-emerald-700 to-emerald-800",
  "from-red-700 to-red-800",
  "from-emerald-600 to-emerald-700",
  "from-red-600 to-red-700",
];

const RouletteWheel: React.FC<RouletteWheelProps> = ({ segments, isSpinning, selectedIndex }) => {
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const segmentCount = segments.length || 6;
  const anglePerSegment = useMemo(() => 360 / segmentCount, [segmentCount]);

  useEffect(() => {
    if (!isSpinning) return;
    setShowResult(false);
    const spinTo = selectedIndex !== undefined 
      ? 360 * 5 + (360 - anglePerSegment * selectedIndex - anglePerSegment / 2)
      : 360 * 5;
    setRotation(spinTo);
    
    const timer = setTimeout(() => setShowResult(true), 2500);
    return () => clearTimeout(timer);
  }, [anglePerSegment, isSpinning, selectedIndex]);

  const totalWeight = segments.reduce((sum, seg) => sum + (seg.weight ?? 1), 0);

  return (
    <div className="relative mx-auto flex flex-col items-center gap-4">
      {/* Pointer */}
      <div className="absolute -top-2 left-1/2 z-20 -translate-x-1/2">
        <div className="h-0 w-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-gold-400 drop-shadow-lg" />
      </div>

      {/* Wheel Container */}
      <div className="relative h-72 w-72 rounded-full border-4 border-gold-500 bg-gradient-to-br from-slate-900 to-slate-800 p-2 shadow-[0_0_40px_rgba(234,179,8,0.3)]">
        {/* Inner decorative ring */}
        <div className="absolute inset-3 rounded-full border-2 border-gold-600/40" />
        
        {/* Spinning wheel */}
        <div
          className="relative h-full w-full rounded-full transition-transform duration-[3000ms] ease-out"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {segments.map((segment, index) => {
              const startAngle = anglePerSegment * index - 90;
              const endAngle = startAngle + anglePerSegment;
              const isJackpot = segment.isJackpot || segment.label.toLowerCase().includes("jackpot");            return (
              <div
                key={`${segment.label}-${index}`}
                className="absolute inset-0"
                style={{
                  clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((startAngle * Math.PI) / 180)}% ${50 + 50 * Math.sin((startAngle * Math.PI) / 180)}%, ${50 + 50 * Math.cos((endAngle * Math.PI) / 180)}% ${50 + 50 * Math.sin((endAngle * Math.PI) / 180)}%)`,
                }}
              >
                <div className={`h-full w-full bg-gradient-to-br ${isJackpot ? "from-gold-500 to-gold-600" : SEGMENT_COLORS[index % SEGMENT_COLORS.length]}`} />
              </div>
            );
          })}

          {/* Segment labels */}
          {segments.map((segment, index) => {
            const midAngle = anglePerSegment * index + anglePerSegment / 2 - 90;
            const labelRadius = 42;
            const x = 50 + labelRadius * Math.cos((midAngle * Math.PI) / 180);
            const y = 50 + labelRadius * Math.sin((midAngle * Math.PI) / 180);
            const isJackpot = segment.isJackpot || segment.label.toLowerCase().includes("jackpot");
            const probability = segment.weight ? Math.round((segment.weight / totalWeight) * 100) : null;

            return (
              <div
                key={`label-${segment.label}-${index}`}
                className="absolute text-center"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: `translate(-50%, -50%) rotate(${midAngle + 90}deg)`,
                }}
              >
                <span className={`block text-xs font-bold drop-shadow-md ${isJackpot ? "text-slate-900" : "text-white"}`}>
                  {isJackpot && "🎰 "}
                  {segment.label}
                </span>
                {probability !== null && (
                  <span className={`block text-[10px] ${isJackpot ? "text-slate-700" : "text-white/70"}`}>
                    {probability}%
                  </span>
                )}
              </div>
            );
          })}

          {/* Center hub */}
          <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold-400 bg-gradient-to-br from-slate-800 to-slate-900 shadow-lg">
            <div className="flex h-full w-full items-center justify-center text-lg">🎄</div>
          </div>
        </div>
      </div>

      {/* Result indicator */}
      {showResult && selectedIndex !== undefined && segments[selectedIndex] && (
        <div className="animate-bounce-in rounded-xl border border-gold-500/50 bg-gradient-to-r from-emerald-900/90 to-slate-900/90 px-6 py-3 text-center shadow-lg">
          <p className="text-sm text-gold-300">당첨!</p>
          <p className="text-xl font-bold text-white">{segments[selectedIndex].label}</p>
        </div>
      )}
    </div>
  );
};

export default RouletteWheel;

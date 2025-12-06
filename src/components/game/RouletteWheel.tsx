// src/components/game/RouletteWheel.tsx
import React, { useEffect, useMemo, useState } from "react";

interface RouletteWheelProps {
  readonly segments: string[];
  readonly isSpinning: boolean;
  readonly selectedIndex?: number;
}

const RouletteWheel: React.FC<RouletteWheelProps> = ({ segments, isSpinning, selectedIndex }) => {
  const [rotation, setRotation] = useState(0);

  const anglePerSegment = useMemo(() => (segments.length > 0 ? 360 / segments.length : 0), [segments.length]);

  useEffect(() => {
    if (!isSpinning) return;
    const spinTo = selectedIndex !== undefined ? 360 * 4 + anglePerSegment * selectedIndex + anglePerSegment / 2 : 720;
    setRotation(spinTo);
  }, [anglePerSegment, isSpinning, selectedIndex]);

  return (
    <div className="relative mx-auto h-64 w-64 rounded-full border-4 border-emerald-500 bg-slate-800 shadow-inner shadow-emerald-900/40">
      <div
        className="absolute inset-0 flex items-center justify-center rounded-full transition-transform duration-[2000ms] ease-out"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {segments.map((label, index) => (
          <div
            key={label + index.toString()}
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `rotate(${anglePerSegment * index}deg)` }}
          >
            <div
              className="w-1/2 origin-left border-r border-emerald-700/60 py-2 text-center text-xs text-emerald-100"
              style={{ transform: `rotate(${anglePerSegment / 2}deg)` }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 text-emerald-300">▲</div>
    </div>
  );
};

export default RouletteWheel;

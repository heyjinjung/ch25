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

const COLORS = ["#10b981", "#ef4444", "#0ea5e9", "#f59e0b", "#22c55e", "#8b5cf6"];

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

const RouletteWheel: React.FC<RouletteWheelProps> = ({ segments, isSpinning, selectedIndex }) => {
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const segmentCount = segments.length || 6;
  const anglePerSegment = useMemo(() => 360 / segmentCount, [segmentCount]);

  useEffect(() => {
    if (!isSpinning) return;
    setShowResult(false);
    const spinTo =
      selectedIndex !== undefined
        ? 360 * 5 + (360 - anglePerSegment * selectedIndex - anglePerSegment / 2)
        : 360 * 5;
    setRotation(spinTo);

    const timer = setTimeout(() => setShowResult(true), 2500);
    return () => clearTimeout(timer);
  }, [anglePerSegment, isSpinning, selectedIndex]);

  return (
    <div className="relative mx-auto flex flex-col items-center gap-4">
      {/* Pointer */}
      <div className="absolute -top-2 left-1/2 z-20 -translate-x-1/2">
        <div className="h-0 w-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-gold-400 drop-shadow-lg" />
      </div>

      {/* Wheel */}
      <div className="relative aspect-square w-full max-w-[360px] rounded-[32px] border border-emerald-700/40 bg-slate-900/60 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full rounded-full bg-gradient-to-br from-slate-950 to-slate-900 shadow-[0_0_40px_rgba(234,179,8,0.25)]"
          style={{ transform: `rotate(${rotation}deg)`, transition: "transform 3s ease-out" }}
        >
          <circle cx="100" cy="100" r="96" fill="#0f172a" stroke="#fbbf24" strokeWidth="3" />
          {segments.map((segment, index) => {
            const startAngle = anglePerSegment * index;
            const endAngle = startAngle + anglePerSegment;
            const isJackpot = segment.isJackpot || segment.label.toLowerCase().includes("jackpot");
            const path = describeArc(100, 100, 90, startAngle, endAngle);
            const labelAngle = startAngle + anglePerSegment / 2;
            const labelPos = polarToCartesian(100, 100, 55, labelAngle);
            const color = isJackpot ? "#fbbf24" : COLORS[index % COLORS.length];

            return (
              <g key={`${segment.label}-${index}`}>
                <path d={path} fill={color} stroke="#0f172a" strokeWidth="1" />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fill={isJackpot ? "#0f172a" : "#fff"}
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
          <circle cx="100" cy="100" r="18" fill="url(#hub)" stroke="#fbbf24" strokeWidth="2" />
          <text x="100" y="104" textAnchor="middle" fill="#fff" fontWeight="700" fontSize="10">
            WIN
          </text>
          <defs>
            <radialGradient id="hub" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1f2937" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Result indicator */}
      {showResult && selectedIndex !== undefined && segments[selectedIndex] && (
        <div className="animate-bounce-in rounded-xl border border-gold-500/50 bg-gradient-to-r from-emerald-900/90 to-slate-900/90 px-6 py-3 text-center shadow-lg">
          <p className="text-sm text-gold-300">축하합니다!</p>
          <p className="text-xl font-bold text-white">{segments[selectedIndex].label}</p>
        </div>
      )}
    </div>
  );
};

export default RouletteWheel;

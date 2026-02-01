/**
 * QuickStat - 통계 표시 카드 컴포넌트
 * @module mission/components/QuickStat
 */

import { ReactNode } from "react";
import { TrendingUp } from "lucide-react";
import { cn } from "../../../../../lib/utils";

interface QuickStatProps {
  label: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
  color: string;
}

export function QuickStat({
  label,
  value,
  change,
  icon,
  color,
}: QuickStatProps) {
  return (
    <div className={cn("p-4 rounded-xl border", color)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-400 font-medium">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {change !== undefined && (
        <div
          className={cn(
            "text-xs mt-1",
            change >= 0 ? "text-emerald-400" : "text-red-400",
          )}
        >
          <TrendingUp className="w-3 h-3 inline mr-1" />
          {change >= 0 ? "+" : ""}
          {(change * 100).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

export default QuickStat;

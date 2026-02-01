/**
 * 미션 프리뷰 컴포넌트
 */
import { Badge } from "../../../../../components/ui/badge";
import { Label } from "../../../../../components/ui/label";
import { Zap } from "lucide-react";
import {
  isGoldenHourLogicKey,
  getCategoryMeaning,
  normalizeLogicKey,
} from "../utils/missionHelpers";

interface MissionPreviewProps {
  category: string;
  logicKey: string;
  actionType?: string | null;
  targetValue: number;
}

export function MissionPreview({
  category,
  logicKey,
  actionType,
  targetValue,
}: MissionPreviewProps) {
  const golden = isGoldenHourLogicKey(logicKey);
  const action = String(actionType || "").trim() || "(없음)";
  const catMeaning = getCategoryMeaning(category);

  return (
    <div className="rounded-xl border border-white/10 bg-[#0D0D0F] overflow-hidden">
      <div className="px-4 py-3 bg-white/5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            미션 프리뷰
          </span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] uppercase text-zinc-500">
              카테고리
            </Label>
            <div className="text-sm font-medium text-zinc-200 mt-1">
              {catMeaning}
            </div>
          </div>
          <div>
            <Label className="text-[10px] uppercase text-zinc-500">
              트리거
            </Label>
            <div className="font-mono text-sm text-emerald-400 mt-1">
              {action}
            </div>
          </div>
        </div>
        <div>
          <Label className="text-[10px] uppercase text-zinc-500">로직 키</Label>
          <div className="font-mono text-xs text-indigo-400 mt-1 p-2 rounded bg-indigo-500/5 border border-indigo-500/10 break-all">
            {normalizeLogicKey(logicKey) || "UNDEFINED"}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div>
            <Label className="text-[10px] uppercase text-zinc-500">
              목표값
            </Label>
            <div className="text-lg font-bold text-zinc-100">
              {targetValue}회
            </div>
          </div>
          {golden && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              <Zap className="w-3 h-3 mr-1" />
              골든아워
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * CreateMissionDialog - 미션 생성 다이얼로그
 * @module mission/components/CreateMissionDialog
 */

import { Plus, Zap, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../../../components/ui/dialog";
import {
  CATEGORIES,
  ACTION_TYPE_OPTIONS,
  LOGIC_KEY_PRESETS,
  MISSION_REWARD_OPTIONS,
  PRESET_RECOMMENDED_ACTION_TYPE,
} from "../constants/missionConstants";
import {
  isGoldenHourLogicKey,
  normalizeLogicKey,
  getCategoryMeaning,
  getPresetCategory,
  generateLogicKey,
  generateTitle,
} from "../utils/missionHelpers";

export interface CreateMissionForm {
  category: string;
  title: string;
  condition: string;
  rewardType: string;
  rewardAmount: number;
  targetValue: number;
  logicKey: string;
  actionType: string;
}

interface CreateMissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CreateMissionForm;
  selectedPreset: string;
  error: string | null;
  isPending: boolean;
  onFormChange: (form: CreateMissionForm) => void;
  onPresetChange: (preset: string) => void;
  onCreate: () => void;
}

export function CreateMissionDialog({
  open,
  onOpenChange,
  form,
  selectedPreset,
  error,
  isPending,
  onFormChange,
  onPresetChange,
  onCreate,
}: CreateMissionDialogProps) {
  const handlePresetChange = (val: string) => {
    onPresetChange(val);
    const recommendedActionType = PRESET_RECOMMENDED_ACTION_TYPE[val];
    const presetCategory = getPresetCategory(val);
    const newTarget = form.targetValue;
    const newLogicKey = generateLogicKey(val, presetCategory, newTarget);
    const newTitle = generateTitle(val, presetCategory, newTarget);
    onFormChange({
      ...form,
      category: presetCategory,
      logicKey: newLogicKey,
      title: newTitle,
      actionType: recommendedActionType || form.actionType,
    });
  };

  const handleCategoryChange = (val: string) => {
    const newLogicKey = generateLogicKey(selectedPreset, val, form.targetValue);
    const newTitle = generateTitle(selectedPreset, val, form.targetValue);
    onFormChange({
      ...form,
      category: val,
      logicKey: newLogicKey,
      title: newTitle,
    });
  };

  const handleTargetValueChange = (val: number) => {
    const newTarget = Math.max(1, val);
    const newLogicKey = generateLogicKey(
      selectedPreset,
      form.category,
      newTarget,
    );
    const newTitle = generateTitle(selectedPreset, form.category, newTarget);
    onFormChange({
      ...form,
      targetValue: newTarget,
      logicKey: newLogicKey,
      title: newTitle,
    });
  };

  const renderPreview = () => {
    const golden = isGoldenHourLogicKey(form.logicKey);
    const action = String(form.actionType || "").trim() || "(없음)";
    const catMeaning = getCategoryMeaning(form.category);

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
            <Label className="text-[10px] uppercase text-zinc-500">
              로직 키
            </Label>
            <div className="font-mono text-xs text-indigo-400 mt-1 p-2 rounded bg-indigo-500/5 border border-indigo-500/10 break-all">
              {normalizeLogicKey(form.logicKey) || "UNDEFINED"}
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div>
              <Label className="text-[10px] uppercase text-zinc-500">
                목표값
              </Label>
              <div className="text-lg font-bold text-zinc-100">
                {form.targetValue}회
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#09090B] border-white/10 text-white overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" />새 미션 생성
          </DialogTitle>
          <DialogDescription>새로운 미션을 생성합니다.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Left Column */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">프리셋</Label>
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="프리셋 선택..." />
                </SelectTrigger>
                <SelectContent className="bg-[#18181B] border-white/10 text-white max-h-60">
                  {LOGIC_KEY_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">카테고리</Label>
                <Select
                  value={form.category}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-white/10 text-white">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">액션 타입</Label>
                <Select
                  value={form.actionType || "PLAY_GAME"}
                  onValueChange={(val) =>
                    onFormChange({ ...form, actionType: val })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-white/10 text-white">
                    {ACTION_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">미션 제목</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  onFormChange({ ...form, title: e.target.value })
                }
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-emerald-400 font-bold">
                  목표 횟수
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={form.targetValue}
                  onChange={(e) =>
                    handleTargetValueChange(parseInt(e.target.value) || 1)
                  }
                  className="bg-emerald-500/5 border-emerald-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">
                  조건 설명 (선택)
                </Label>
                <Input
                  value={form.condition}
                  onChange={(e) =>
                    onFormChange({ ...form, condition: e.target.value })
                  }
                  className="bg-white/5 border-white/10"
                  placeholder="(선택사항)"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-xs text-zinc-400">보상 타입</Label>
                <Select
                  value={form.rewardType}
                  onValueChange={(val) =>
                    onFormChange({ ...form, rewardType: val })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-white/10 text-white max-h-48">
                    {MISSION_REWARD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28 space-y-2">
                <Label className="text-xs text-zinc-400">보상량</Label>
                <Input
                  type="number"
                  value={form.rewardAmount}
                  onChange={(e) =>
                    onFormChange({
                      ...form,
                      rewardAmount: parseInt(e.target.value) || 0,
                    })
                  }
                  className="bg-white/5 border-white/10 text-right"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="space-y-4">
            {renderPreview()}

            {error && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={onCreate}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                생성 중...
              </>
            ) : (
              "미션 생성"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateMissionDialog;

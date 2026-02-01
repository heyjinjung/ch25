/**
 * EditMissionDialog - 미션 편집 다이얼로그
 * @module mission/components/EditMissionDialog
 */

import { Edit2, Zap, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "../../../../../components/ui/badge";
import { Switch } from "../../../../../components/ui/switch";
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
import { cn } from "../../../../../lib/utils";
import { type AdminMissionDto } from "../../../../../api/adminApi";
import {
  CATEGORIES,
  ACTION_TYPE_OPTIONS,
  MISSION_REWARD_OPTIONS,
} from "../constants/missionConstants";
import {
  isGoldenHourLogicKey,
  normalizeLogicKey,
  getCategoryMeaning,
} from "../utils/missionHelpers";

interface EditMissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: AdminMissionDto | null;
  error: string | null;
  isPending: boolean;
  onFormChange: (form: AdminMissionDto) => void;
  onSave: () => void;
}

export function EditMissionDialog({
  open,
  onOpenChange,
  form,
  error,
  isPending,
  onFormChange,
  onSave,
}: EditMissionDialogProps) {
  if (!form) return null;

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
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-400" />
                미션 편집
              </DialogTitle>
              <DialogDescription>MISSION_ID: #{form.id}</DialogDescription>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase">상태</span>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  onFormChange({ ...form, isActive: checked })
                }
                className="data-[state=checked]:bg-indigo-500"
              />
              <span
                className={cn(
                  "text-[10px] font-bold",
                  form.isActive ? "text-indigo-400" : "text-zinc-600",
                )}
              >
                {form.isActive ? "활성" : "비활성"}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Left Column */}
          <div className="space-y-4">
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
                <Label className="text-xs text-zinc-400">카테고리</Label>
                <Select
                  value={form.category}
                  onValueChange={(val) =>
                    onFormChange({ ...form, category: val as any })
                  }
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
              <Label className="text-xs text-zinc-400">로직 키</Label>
              <Input
                value={form.logicKey}
                onChange={(e) =>
                  onFormChange({ ...form, logicKey: e.target.value })
                }
                className="font-mono text-sm bg-white/5 border-white/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-indigo-400 font-bold">
                  목표값
                </Label>
                <Input
                  type="number"
                  value={form.targetValue}
                  onChange={(e) =>
                    onFormChange({
                      ...form,
                      targetValue: parseInt(e.target.value) || 1,
                    })
                  }
                  className="bg-indigo-500/5 border-indigo-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">조건 설명</Label>
                <Input
                  value={form.condition || ""}
                  onChange={(e) =>
                    onFormChange({ ...form, condition: e.target.value })
                  }
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-xl bg-black/40 border border-white/5">
              <div className="flex-1 space-y-2">
                <Label className="text-xs text-zinc-500 uppercase">
                  보상 타입
                </Label>
                <Select
                  value={form.rewardType}
                  onValueChange={(val) =>
                    onFormChange({ ...form, rewardType: val })
                  }
                >
                  <SelectTrigger className="bg-transparent border-white/10">
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
                <Label className="text-xs text-zinc-500 uppercase">
                  보상량
                </Label>
                <Input
                  type="number"
                  value={form.rewardAmount}
                  onChange={(e) =>
                    onFormChange({
                      ...form,
                      rewardAmount: parseInt(e.target.value) || 0,
                    })
                  }
                  className="bg-transparent border-white/10 text-right font-bold"
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
            onClick={onSave}
            disabled={isPending}
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              "변경사항 저장"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EditMissionDialog;

/**
 * 미션 생성/편집 다이얼로그
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../../../components/ui/dialog";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import { Switch } from "../../../../../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../components/ui/select";
import { Plus, Edit2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "../../../../../lib/utils";
import { MissionPreview } from "./MissionPreview";
import type { AdminMissionDto } from "../../../../../api/adminApi";
import {
  MISSION_REWARD_OPTIONS,
  CATEGORIES,
  ACTION_TYPE_OPTIONS,
  LOGIC_KEY_PRESETS,
  PRESET_RECOMMENDED_ACTION_TYPE,
} from "../constants/missionConstants";
import {
  getPresetCategory,
  generateLogicKey,
  generateTitle,
  normalizeLogicKey,
} from "../utils/missionHelpers";
import type { CreateMissionForm } from "../types";

// ─────────────────────────────────────────────────────────────────
// Create Mission Dialog
// ─────────────────────────────────────────────────────────────────

interface CreateMissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: CreateMissionForm) => void;
  isPending: boolean;
  missions: AdminMissionDto[];
}

export function CreateMissionDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  missions,
}: CreateMissionDialogProps) {
  const [selectedPreset, setSelectedPreset] =
    useState<string>("daily_play_generic");
  const [createForm, setCreateForm] = useState<CreateMissionForm>({
    category: "DAILY",
    title: "일일 게임 플레이 1회",
    condition: "",
    rewardType: "VAULT",
    rewardAmount: 100,
    targetValue: 1,
    logicKey: "DAILY_DAILY_PLAY_GENERIC_1",
    actionType: "PLAY_GAME",
  });
  const [createError, setCreateError] = useState<string | null>(null);

  const findLogicKeyConflict = (logicKey: string) => {
    const normalized = normalizeLogicKey(logicKey);
    if (!normalized) return null;
    return (
      missions.find((m) => normalizeLogicKey(m.logicKey) === normalized) || null
    );
  };

  const findLogicalDuplicate = (
    category: string,
    actionType: string,
    targetValue: number,
  ) => {
    return (
      missions.find(
        (m) =>
          m.category === category &&
          m.actionType === actionType &&
          m.targetValue === targetValue,
      ) || null
    );
  };

  const handleCreate = () => {
    setCreateError(null);
    const nextLogicKey = normalizeLogicKey(createForm.logicKey);
    if (!createForm.title.trim()) {
      setCreateError("제목을 입력하세요.");
      return;
    }
    if (!nextLogicKey) {
      setCreateError("로직 키를 입력하세요.");
      return;
    }

    const keyConflict = findLogicKeyConflict(nextLogicKey);
    if (keyConflict) {
      setCreateError(
        `이미 사용 중인 로직 키입니다. (충돌: ${keyConflict.category} / ${keyConflict.title})`,
      );
      return;
    }

    const logicalDup = findLogicalDuplicate(
      createForm.category,
      createForm.actionType,
      createForm.targetValue,
    );
    if (logicalDup) {
      setCreateError(
        `동일한 조건의 미션이 이미 존재합니다: "${logicalDup.title}"`,
      );
      return;
    }

    onSubmit({ ...createForm, logicKey: nextLogicKey });
  };

  const handlePresetChange = (val: string) => {
    setSelectedPreset(val);
    const recommendedActionType = PRESET_RECOMMENDED_ACTION_TYPE[val];
    const presetCategory = getPresetCategory(val);
    const newTarget = createForm.targetValue;
    const newLogicKey = generateLogicKey(val, presetCategory, newTarget);
    const newTitle = generateTitle(val, presetCategory, newTarget);
    setCreateForm({
      ...createForm,
      category: presetCategory,
      logicKey: newLogicKey,
      title: newTitle,
      actionType: recommendedActionType || createForm.actionType,
    });
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
                  value={createForm.category}
                  onValueChange={(val) => {
                    const newLogicKey = generateLogicKey(
                      selectedPreset,
                      val,
                      createForm.targetValue,
                    );
                    const newTitle = generateTitle(
                      selectedPreset,
                      val,
                      createForm.targetValue,
                    );
                    setCreateForm({
                      ...createForm,
                      category: val,
                      logicKey: newLogicKey,
                      title: newTitle,
                    });
                  }}
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
                  value={createForm.actionType || "PLAY_GAME"}
                  onValueChange={(val) =>
                    setCreateForm({ ...createForm, actionType: val })
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
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm({ ...createForm, title: e.target.value })
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
                  value={createForm.targetValue}
                  onChange={(e) => {
                    const newTarget = Math.max(
                      1,
                      parseInt(e.target.value) || 1,
                    );
                    const newLogicKey = generateLogicKey(
                      selectedPreset,
                      createForm.category,
                      newTarget,
                    );
                    const newTitle = generateTitle(
                      selectedPreset,
                      createForm.category,
                      newTarget,
                    );
                    setCreateForm({
                      ...createForm,
                      targetValue: newTarget,
                      logicKey: newLogicKey,
                      title: newTitle,
                    });
                  }}
                  className="bg-emerald-500/5 border-emerald-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">
                  조건 설명 (선택)
                </Label>
                <Input
                  value={createForm.condition}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, condition: e.target.value })
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
                  value={createForm.rewardType}
                  onValueChange={(val) =>
                    setCreateForm({ ...createForm, rewardType: val })
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
                  value={createForm.rewardAmount}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      rewardAmount: parseInt(e.target.value) || 0,
                    })
                  }
                  className="bg-white/5 border-white/10 text-right"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <MissionPreview
              category={createForm.category}
              logicKey={createForm.logicKey}
              actionType={createForm.actionType}
              targetValue={createForm.targetValue}
            />
            {createError && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {createError}
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
            onClick={handleCreate}
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

// ─────────────────────────────────────────────────────────────────
// Edit Mission Dialog
// ─────────────────────────────────────────────────────────────────

interface EditMissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editForm: AdminMissionDto | null;
  setEditForm: (form: AdminMissionDto | null) => void;
  onSubmit: () => void;
  isPending: boolean;
  missions: AdminMissionDto[];
}

export function EditMissionDialog({
  open,
  onOpenChange,
  editForm,
  setEditForm,
  onSubmit,
  isPending,
  missions,
}: EditMissionDialogProps) {
  const [editError, setEditError] = useState<string | null>(null);

  const findLogicKeyConflict = (logicKey: string, excludeId?: number) => {
    const normalized = normalizeLogicKey(logicKey);
    if (!normalized) return null;
    return (
      missions.find(
        (m) =>
          (excludeId == null || m.id !== excludeId) &&
          normalizeLogicKey(m.logicKey) === normalized,
      ) || null
    );
  };

  const handleSaveEdit = () => {
    if (!editForm) return;
    setEditError(null);
    const nextLogicKey = normalizeLogicKey(editForm.logicKey);
    const conflict = findLogicKeyConflict(nextLogicKey, editForm.id);

    if (!editForm.title.trim()) {
      setEditError("제목을 입력하세요.");
      return;
    }
    if (!nextLogicKey) {
      setEditError("로직 키를 입력하세요.");
      return;
    }
    if (conflict) {
      setEditError(
        `이미 사용 중인 로직 키입니다. (충돌: ${conflict.category} / ${conflict.title})`,
      );
      return;
    }

    onSubmit();
  };

  if (!editForm) return null;

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
              <DialogDescription>MISSION_ID: #{editForm.id}</DialogDescription>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5">
              <span className="text-[10px] text-zinc-500 uppercase">상태</span>
              <Switch
                checked={editForm.isActive}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, isActive: checked })
                }
                className="data-[state=checked]:bg-indigo-500"
              />
              <span
                className={cn(
                  "text-[10px] font-bold",
                  editForm.isActive ? "text-indigo-400" : "text-zinc-600",
                )}
              >
                {editForm.isActive ? "활성" : "비활성"}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">미션 제목</Label>
              <Input
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">카테고리</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(val) =>
                    setEditForm({ ...editForm, category: val as any })
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
                  value={editForm.actionType || "PLAY_GAME"}
                  onValueChange={(val) =>
                    setEditForm({ ...editForm, actionType: val })
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
                value={editForm.logicKey}
                onChange={(e) =>
                  setEditForm({ ...editForm, logicKey: e.target.value })
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
                  value={editForm.targetValue}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      targetValue: parseInt(e.target.value) || 1,
                    })
                  }
                  className="bg-indigo-500/5 border-indigo-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">조건 설명</Label>
                <Input
                  value={editForm.condition || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, condition: e.target.value })
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
                  value={editForm.rewardType}
                  onValueChange={(val) =>
                    setEditForm({ ...editForm, rewardType: val })
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
                  value={editForm.rewardAmount}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      rewardAmount: parseInt(e.target.value) || 0,
                    })
                  }
                  className="bg-transparent border-white/10 text-right font-bold"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <MissionPreview
              category={editForm.category}
              logicKey={editForm.logicKey}
              actionType={editForm.actionType}
              targetValue={editForm.targetValue}
            />
            {editError && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {editError}
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
            onClick={handleSaveEdit}
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

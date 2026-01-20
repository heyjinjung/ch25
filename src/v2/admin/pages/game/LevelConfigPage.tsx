import { useMemo, useState, useEffect } from "react";
import {
  useAdminLevels,
  useAdminUpdateLevel,
  useAdminUpdateLevelGlobalConfig, // Hook for Global Config
} from "../../../hooks/useAdminGame";
import { type AdminLevelDto } from "../../../api/adminApi";
import { REWARD_ITEMS } from "../../../constants/rewardItems";
import {
  RefreshCw,
  Settings2,
  Layers,
  Zap,
  Search,
  Check,
  AlertCircle,
  Trophy,
  MoreHorizontal,
  Save,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";

export default function LevelConfigPage() {
  const { data: levels = [], isLoading, isError, refetch } = useAdminLevels();
  const updateMutation = useAdminUpdateLevel();
  const globalConfigMutation = useAdminUpdateLevelGlobalConfig();

  const [filterLevel, setFilterLevel] = useState("");
  const [isGlobalConfigOpen, setIsGlobalConfigOpen] = useState(false);

  // Local state for each level's edits
  const [localLevels, setLocalLevels] = useState<Record<number, AdminLevelDto>>({});

  useEffect(() => {
    if (levels.length > 0) {
      const levelMap: Record<number, AdminLevelDto> = {};
      levels.forEach(level => {
        levelMap[level.level] = { ...level };
      });
      setLocalLevels(levelMap);
    }
  }, [levels]);

  const handleLocalChange = (
    level: number,
    field: keyof AdminLevelDto,
    value: string | number,
  ) => {
    setLocalLevels(prev => ({
      ...prev,
      [level]: {
        ...prev[level],
        [field]: value,
      },
    }));
  };

  const handleSaveLevel = (level: number) => {
    const localData = localLevels[level];
    if (!localData) return;

    // Only log the data being sent to avoid confusing the user with derived fields like rewardPoint
    console.log("Saving level:", level, "payload:", {
      requiredXp: localData.requiredXp,
      rewardType: localData.rewardType,
      rewardAmount: localData.rewardAmount,
    });

    updateMutation.mutate(
      {
        level,
        data: {
          requiredXp: localData.requiredXp,
          rewardType: localData.rewardType,
          rewardAmount: localData.rewardAmount,
        },
      },
      {
        onSuccess: (updatedLevel) => {
          console.log("Level saved successfully:", updatedLevel);
          refetch();
        },
        onError: (error) => {
          console.error("Failed to save level:", error);
          alert("레벨 저장에 실패했습니다. 콘솔을 확인하세요.");
        },
      }
    );
  };

  const filteredLevels = useMemo(() => {
    if (!filterLevel) return levels;
    const num = parseInt(filterLevel);
    if (isNaN(num)) return levels;
    return levels.filter((l) => l.level === num);
  }, [levels, filterLevel]);

  const levelSummary = useMemo(() => {
    if (!levels.length) return { maxLevel: 0, totalXp: 0 };
    const max = levels[levels.length - 1];
    return {
      maxLevel: max.level,
      totalXp: max.requiredXp,
    };
  }, [levels]);

  // --- Global Config State ---
  const [newMaxLevel, setNewMaxLevel] = useState(20);
  const [newMaxXp, setNewMaxXp] = useState(20000);

  useEffect(() => {
    if (levelSummary.maxLevel > 0) {
      setNewMaxLevel(levelSummary.maxLevel);
      setNewMaxXp(levelSummary.totalXp);
    }
  }, [levelSummary.maxLevel, levelSummary.totalXp]);

  const handleSaveGlobalConfig = async () => {
    await globalConfigMutation.mutateAsync({
      maxLevel: newMaxLevel,
      maxXp: newMaxXp,
    });
    setIsGlobalConfigOpen(false);
  };

  const inputClass =
    "w-full h-9 bg-zinc-900 border border-zinc-700 rounded px-2 text-sm font-mono text-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-colors placeholder:text-zinc-600";

  // --- Render ---

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center gap-3 text-zinc-400">
        <RefreshCw className="animate-spin h-5 w-5 text-indigo-500" />
        <span className="text-base font-medium">
          레벨 설정을 불러오는 중입니다...
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center flex-col gap-4 text-rose-500">
        <div className="bg-rose-500/10 p-5 rounded-full border border-rose-500/20">
          <Settings2 size={36} />
        </div>
        <h3 className="text-xl font-bold">설정을 불러오지 못했습니다.</h3>
        <Button onClick={() => refetch()} variant="secondary">
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <section className="bg-[#09090b] min-h-screen pb-20 p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* --- Header Area --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
            <span>게임 설정</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-200">레벨 시스템</span>
          </div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
            <Layers className="text-indigo-500" size={32} />
            레벨 & 보상 관리
          </h1>
          <p className="text-zinc-400 text-base max-w-2xl">
            사용자 레벨별 경험치 요구량 및 달성 보상을 설정합니다.
            <br />
            <span className="text-zinc-500 text-sm">
              보상 종류와 수량을 유동적으로 변경할 수 있습니다.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Global Stats / Config Trigger */}
          <div
            className="flex items-center gap-6 bg-[#18181b] px-6 py-3 rounded-2xl border border-white/10 shadow-sm hover:border-indigo-500/30 transition-colors cursor-pointer group"
            onClick={() => setIsGlobalConfigOpen(true)}
          >
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                MAX LEVEL
              </span>
              <span className="text-2xl font-black text-white leading-none mt-1 group-hover:text-indigo-200">
                {levelSummary.maxLevel}
              </span>
            </div>

            <div className="w-px h-8 bg-white/10" />

            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                MAX XP
              </span>
              <span className="text-2xl font-black text-emerald-400 leading-none mt-1 group-hover:text-emerald-200">
                {levelSummary.totalXp.toLocaleString()}
              </span>
            </div>

            <div className="ml-2 pl-4 border-l border-white/5 text-zinc-500 group-hover:text-white transition-colors">
              <Settings2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* --- Controls & Filter --- */}
      <div className="flex items-center justify-between bg-[#18181b] p-4 rounded-xl border border-white/5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
            <input
              type="number"
              placeholder="레벨 검색 (예: 10)"
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="pl-10 pr-4 h-11 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:border-indigo-500 outline-none w-56 placeholder:text-zinc-600 transition-all font-medium"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
          >
            <RefreshCw size={16} className="mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* --- Grid Layout --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {filteredLevels.map((level) => {
          const localLevel = localLevels[level.level];
          const hasChanges = localLevel ? (
            localLevel.requiredXp !== level.requiredXp ||
            localLevel.rewardType !== level.rewardType ||
            localLevel.rewardAmount !== level.rewardAmount
          ) : false;

          const displayLevel = localLevel || level;

          return (
            <div
              key={level.level}
              className="group relative bg-[#1e1e24] rounded-2xl border border-zinc-800 hover:border-indigo-500/50 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Level Progress Bar (Visual) */}
              <progress
                value={level.level}
                max={levelSummary.maxLevel || 1}
                className="absolute top-0 left-0 h-1.5 w-full appearance-none overflow-hidden bg-zinc-800 opacity-75 group-hover:opacity-100 [&::-webkit-progress-bar]:bg-zinc-800 [&::-webkit-progress-value]:bg-indigo-500 [&::-moz-progress-bar]:bg-indigo-500"
              />

              <div className="p-6 flex flex-col h-full bg-gradient-to-b from-white/[0.02] to-transparent">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#09090b] flex items-center justify-center border border-zinc-700 text-2xl font-black text-white font-mono shadow-inner relative overflow-hidden group-hover:border-indigo-500/40 transition-colors">
                      <span className="z-10 relative">{level.level}</span>
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                        LEVEL CONFIG
                      </span>
                      <h3 className="text-lg text-zinc-100 font-bold tracking-tight">
                        Lv.{level.level}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 flex-1">
                  {/* XP Requirement */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        필요 경험치 (Required XP)
                      </Label>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={displayLevel.requiredXp}
                        onChange={(e) =>
                          handleLocalChange(
                            level.level,
                            "requiredXp",
                            parseInt(e.target.value) || 0,
                          )
                        }
                        className={`${inputClass} text-right font-bold text-lg h-11 pr-12`}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold pointer-events-none">
                        XP
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-px bg-white/5 my-4" />

                  {/* Rewards Config */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-emerald-400" />
                        <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          달성 보상 (Reward)
                        </Label>
                      </div>
                    </div>

                    <div className="grid grid-cols-[1.5fr_1fr] gap-2">
                      {/* Type Select */}
                      <div className="relative">
                        <select
                          className="w-full h-10 bg-zinc-900 border border-zinc-700 rounded-lg px-3 text-xs font-medium text-zinc-300 focus:border-indigo-500 outline-none appearance-none"
                          value={displayLevel.rewardType || "POINT"}
                          onChange={(e) =>
                            handleLocalChange(
                              level.level,
                              "rewardType",
                              e.target.value,
                            )
                          }
                        >
                          {REWARD_ITEMS.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                          <MoreHorizontal size={14} />
                        </div>
                      </div>

                      {/* Amount Input */}
                      <div className="relative">
                        <input
                          type="number"
                          value={displayLevel.rewardAmount}
                          onChange={(e) =>
                            handleLocalChange(
                              level.level,
                              "rewardAmount",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-full h-10 bg-zinc-900 border border-zinc-700 rounded-lg px-3 text-sm font-bold text-white text-center focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 text-right mt-1">
                      * 보상은 1회 자동 지급됩니다.
                    </p>
                  </div>
                </div>

                {/* Footer with Save Button */}
                <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center gap-2">
                  {hasChanges ? (
                    <Button
                      type="button"
                      onClick={() => {
                        console.log("Button clicked for level:", level.level);
                        handleSaveLevel(level.level);
                      }}
                      disabled={updateMutation.isPending}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-sm font-bold"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateMutation.isPending ? "저장 중..." : "변경사항 저장"}
                    </Button>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-1.5 text-emerald-500/80 bg-emerald-500/10 px-2 py-2 rounded">
                      <Check size={14} />
                      <span className="font-bold text-xs">저장됨</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredLevels.length === 0 && (
          <div className="col-span-full h-80 flex flex-col items-center justify-center gap-6 text-zinc-500 bg-[#18181b] rounded-3xl border border-white/5 border-dashed">
            <div className="p-6 bg-zinc-900/50 rounded-full">
              <Search size={48} className="text-zinc-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-zinc-400">
                검색 결과가 없습니다.
              </p>
              <p className="text-sm mt-1">다른 레벨 숫자로 검색해보세요.</p>
            </div>
          </div>
        )}
      </div>

      {/* --- Global Config Modal --- */}
      <Dialog open={isGlobalConfigOpen} onOpenChange={setIsGlobalConfigOpen}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Settings2 className="w-5 h-5 text-indigo-500" />
              레벨 시스템 전역 설정
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              전체 레벨의 최대치와 경험치 한도를 설정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">최대 레벨 (Max Level)</Label>
                <Input
                  type="number"
                  value={newMaxLevel}
                  onChange={(e) => setNewMaxLevel(parseInt(e.target.value))}
                  className="bg-black/50 border-white/10 text-white font-mono text-lg"
                />
                <p className="text-xs text-zinc-500">
                  * 레벨을 줄이면 상위 레벨 데이터가 삭제됩니다. 주의하세요.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">최대 경험치 (Max XP)</Label>
                <Input
                  type="number"
                  value={newMaxXp}
                  onChange={(e) => setNewMaxXp(parseInt(e.target.value))}
                  className="bg-black/50 border-white/10 text-emerald-400 font-mono text-lg font-bold"
                />
                <p className="text-xs text-zinc-500">
                  * 마지막 {newMaxLevel}레벨 달성에 필요한 경험치입니다.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-amber-500/10 p-3 border border-amber-500/20 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-200/80 leading-relaxed">
                이 설정은 전체 게임 경제에 즉시 영향을 미칩니다. 변경 전 반드시
                기획팀과 협의하세요.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsGlobalConfigOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              취소
            </Button>
            <Button
              onClick={handleSaveGlobalConfig}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={globalConfigMutation.isPending}
            >
              {globalConfigMutation.isPending ? "저장 중..." : "설정 저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

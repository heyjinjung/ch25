import { useMemo, useState, useEffect } from "react";
import {
  useAdminLevels,
  useAdminUpdateLevel,
  useAdminUpdateLevelGlobalConfig,
  useAdminUserLevel,
  useAdminAdjustUserLevelXp,
  useAdminSetUserLevel,
} from "../../../hooks/useAdminGame";
import { type AdminLevelDto } from "../../../api/adminApi";
import { REWARD_ITEMS } from "../../../constants/rewardItems";
import {
  RefreshCw,
  Search,
  AlertCircle,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";

export default function LevelConfigPage() {
  const { data: levels = [], isLoading, refetch } = useAdminLevels();
  const updateLevel = useAdminUpdateLevel();
  const updateGlobalConfig = useAdminUpdateLevelGlobalConfig();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"config" | "user">("config");
  const [isGlobalConfigOpen, setIsGlobalConfigOpen] = useState(false);
  const [globalConfig, setGlobalConfig] = useState({
    maxLevel: 100,
    maxXp: 1000000,
  });
  const [ccId, setCcId] = useState("");
  const [deltaXp, setDeltaXp] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [setLevelValue, setSetLevelValue] = useState<number | "">("");
  const [setXpValue, setSetXpValue] = useState<number | "">("");
  const [setReason, setSetReason] = useState("");
  const {
    data: userLevel,
    refetch: refetchUserLevel,
    isFetching: isUserLevelLoading,
  } = useAdminUserLevel(ccId);
  const adjustUserLevelXp = useAdminAdjustUserLevelXp();
  const setUserLevel = useAdminSetUserLevel();
  const rewardTypeSet = useMemo(
    () => new Set(REWARD_ITEMS.map((item) => item.value)),
    [],
  );
  const isGlobalConfigValid =
    Number.isFinite(globalConfig.maxLevel) &&
    globalConfig.maxLevel > 0 &&
    Number.isFinite(globalConfig.maxXp) &&
    globalConfig.maxXp > 0;

  const [editingLevels, setEditingLevels] = useState<
    Record<number, AdminLevelDto>
  >({});
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  useEffect(() => {
    if (levels.length > 0) {
      const maxLvl = Math.max(...levels.map((l) => l.level));
      const maxXP = Math.max(...levels.map((l) => l.requiredXp));
      setGlobalConfig({
        maxLevel: maxLvl,
        maxXp: maxXP,
      });
    }
  }, [levels]);

  const filteredLevels = useMemo(() => {
    return levels.filter((l) => String(l.level).includes(searchTerm));
  }, [levels, searchTerm]);

  const handleLevelFieldChange = (
    level: number,
    field: keyof AdminLevelDto,
    value: any,
  ) => {
    const original = levels.find((l) => l.level === level);
    if (!original) return;

    setEditingLevels((prev) => ({
      ...prev,
      [level]: {
        ...(prev[level] || original),
        [field]: value,
      },
    }));
  };

  const handleBulkSave = async () => {
    const editedLevelNumbers = Object.keys(editingLevels).map(Number);
    if (editedLevelNumbers.length === 0) return;

    setIsBulkSaving(true);
    try {
      // Save all edited levels sequentially
      for (const level of editedLevelNumbers) {
        const data = editingLevels[level];
        if (data) {
          await updateLevel.mutateAsync({ level, data });
        }
      }
      // Clear all edits after successful save
      setEditingLevels({});
      await refetch();
    } catch (error) {
      console.error("Bulk save failed:", error);
    } finally {
      setIsBulkSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-20 max-w-[1600px] mx-auto text-white">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            레벨 시스템 설정 (Leveling)
          </h1>
          <p className="text-zinc-400">
            유저 레벨 구간별 경험치 요구량과 획득 보상을 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog
            open={isGlobalConfigOpen}
            onOpenChange={setIsGlobalConfigOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-white/10 hover:bg-white/5"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                전체 설정
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>레벨 시스템 전체 설정</DialogTitle>
                <DialogDescription>
                  시스템의 최대 레벨 및 경험치 한계를 설정합니다.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>최대 레벨 (Max Level)</Label>
                  <Input
                    type="number"
                    value={globalConfig.maxLevel}
                    onChange={(e) =>
                      setGlobalConfig({
                        ...globalConfig,
                        maxLevel: Number(e.target.value) || 0,
                      })
                    }
                    className="bg-black/20 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>최대 경험치 (Max XP)</Label>
                  <Input
                    type="number"
                    value={globalConfig.maxXp}
                    onChange={(e) =>
                      setGlobalConfig({
                        ...globalConfig,
                        maxXp: Number(e.target.value) || 0,
                      })
                    }
                    className="bg-black/20 border-white/10"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  className="border-white/10"
                  onClick={() => setIsGlobalConfigOpen(false)}
                >
                  닫기
                </Button>
                <Button
                  disabled={
                    !isGlobalConfigValid || updateGlobalConfig.isPending
                  }
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={async () => {
                    await updateGlobalConfig.mutateAsync(globalConfig);
                    setIsGlobalConfigOpen(false);
                    await refetch();
                  }}
                >
                  저장
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "config" | "user")}
        className="w-full"
      >
        <TabsList className="bg-zinc-900 border border-white/10 p-1">
          <TabsTrigger
            value="config"
            className="px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            레벨 테이블
          </TabsTrigger>
          <TabsTrigger
            value="user"
            className="px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            유저 레벨 관리
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-6 space-y-4">
          {/* Stats Bar */}
          <Card className="bg-zinc-900 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-6 flex-wrap">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">총 레벨:</span>
                    <span className="text-base font-bold text-white font-mono">
                      {levels.length}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">최대 XP:</span>
                    <span className="text-base font-bold text-white font-mono">
                      {globalConfig.maxXp.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">최대 레벨:</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">
                      {globalConfig.maxLevel}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">미저장 변경:</span>
                    <Badge
                      variant="secondary"
                      className={`${
                        Object.keys(editingLevels).length > 0
                          ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
                          : "bg-white/5 text-zinc-400 border border-white/10"
                      }`}
                    >
                      {Object.keys(editingLevels).length}
                    </Badge>
                  </div>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-white hover:bg-white/5"
                    >
                      <AlertCircle className="w-4 h-4 mr-2" />
                      주의사항
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    className="bg-zinc-800 border-white/10 text-zinc-300 w-96"
                  >
                    <div className="space-y-2 text-xs leading-relaxed">
                      <p className="font-semibold text-amber-400 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5" />
                        주의사항
                      </p>
                      <p>• 레벨 구간 설정 변경은 전체 게임 경제에 즉시 영향을 미칩니다.</p>
                      <p>• 레벨업 보상은 우편함 또는 인벤토리로 즉시 지급됩니다.</p>
                      <p>• 경험치 요구량은 다음 레벨로 가기 위한 누적 경험치입니다.</p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Level Table */}
          <Card className="bg-zinc-900 border-white/10 overflow-hidden">
            <div className="flex flex-col gap-3 p-4 border-b border-white/10 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="레벨 번호로 검색 (예: 1, 10, 20...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-950/40 border-white/10"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span>
                    표시:{" "}
                    <span className="font-mono text-zinc-300">
                      {filteredLevels.length}
                    </span>{" "}
                    / {levels.length}
                  </span>
                </div>
                <Button
                  size="sm"
                  disabled={Object.keys(editingLevels).length === 0 || isBulkSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  onClick={handleBulkSave}
                >
                  {isBulkSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      일괄 저장 ({Object.keys(editingLevels).length})
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="max-h-[68vh] overflow-auto">
              <Table>
                <TableHeader className="bg-white/5 sticky top-0 z-10">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-zinc-400 w-28">
                      Level
                    </TableHead>
                    <TableHead className="text-zinc-400 w-[240px]">
                      요구 경험치 (XP)
                    </TableHead>
                    <TableHead className="text-zinc-400">
                      보상 종류
                    </TableHead>
                    <TableHead className="text-zinc-400 w-[240px]">
                      보상 수량
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLevels.map((lvl) => {
                    const editData = editingLevels[lvl.level] || lvl;
                    const isEdited = !!editingLevels[lvl.level];
                    const isInvalidRewardType = !rewardTypeSet.has(
                      editData.rewardType,
                    );

                    return (
                      <TableRow
                        key={lvl.level}
                        className={`border-white/5 hover:bg-white/5 group ${
                          isEdited ? "bg-indigo-500/5" : ""
                        } ${isBulkSaving ? "opacity-70" : ""}`}
                      >
                        <TableCell className="align-middle">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-indigo-300 text-base font-mono">
                              {lvl.level}
                            </span>
                            {isEdited && (
                              <Badge
                                variant="secondary"
                                className="bg-indigo-500/15 text-indigo-200 border border-indigo-500/20"
                              >
                                변경
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-middle">
                          <Input
                            type="number"
                            value={editData.requiredXp}
                            disabled={isBulkSaving}
                            onChange={(e) =>
                              handleLevelFieldChange(
                                lvl.level,
                                "requiredXp",
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="h-9 bg-zinc-950/40 border-white/10 font-mono text-sm text-right"
                          />
                        </TableCell>
                        <TableCell className="align-middle">
                          <Select
                            value={editData.rewardType}
                            onValueChange={(value) =>
                              handleLevelFieldChange(
                                lvl.level,
                                "rewardType",
                                value,
                              )
                            }
                            disabled={isBulkSaving}
                          >
                            <SelectTrigger className="h-9 bg-zinc-950/40 border-white/10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                              {REWARD_ITEMS.map((item) => (
                                <SelectItem
                                  key={item.value}
                                  value={item.value}
                                >
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isInvalidRewardType && (
                            <p className="text-xs text-red-400 mt-1">
                              SoT 밖 보상 타입입니다.
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="align-middle">
                          <Input
                            type="number"
                            value={editData.rewardAmount}
                            disabled={isBulkSaving}
                            onChange={(e) =>
                              handleLevelFieldChange(
                                lvl.level,
                                "rewardAmount",
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="h-9 bg-zinc-950/40 border-white/10 font-mono text-sm text-right"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="user" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="bg-zinc-900 border-white/10 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                  유저 조회
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">
                    CC ID / 닉네임 / 텔레그램
                  </Label>
                  <Input
                    value={ccId}
                    onChange={(e) => setCcId(e.target.value)}
                    placeholder="예: 0126, Jimin, @username"
                    className="bg-black/20 border-white/10"
                  />
                </div>
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={!ccId || isUserLevelLoading}
                  onClick={() => refetchUserLevel()}
                >
                  {isUserLevelLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="ml-2">조회중...</span>
                    </>
                  ) : (
                    "조회"
                  )}
                </Button>
                {userLevel && (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300 space-y-2">
                    <div className="flex justify-between">
                      <span>레벨</span>
                      <span className="font-mono text-emerald-400">
                        {userLevel.level}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>XP</span>
                      <span className="font-mono text-white">
                        {userLevel.xp}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>다음 레벨</span>
                      <span className="font-mono text-white">
                        {userLevel.nextLevel ?? "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>다음 필요 XP</span>
                      <span className="font-mono text-white">
                        {userLevel.nextRequiredXp ?? "-"}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-white/10 lg:col-span-3">
              <CardHeader className="space-y-2">
                <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                  레벨/XP 조정
                </CardTitle>
                <p className="text-xs text-zinc-500">
                  SoT 기준: 레벨포인트는 GAME_XP만 사용. 보상 지급 없음.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">XP 가산 (delta)</Label>
                    <Input
                      type="number"
                      value={deltaXp}
                      onChange={(e) =>
                        setDeltaXp(parseInt(e.target.value) || 0)
                      }
                      className="bg-black/20 border-white/10"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-zinc-400">사유</Label>
                    <Input
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      placeholder="예: 수동 보정 (GAME_XP)"
                      className="bg-black/20 border-white/10"
                    />
                  </div>
                </div>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={
                    !ccId ||
                    !adjustReason ||
                    deltaXp === 0 ||
                    adjustUserLevelXp.isPending
                  }
                  onClick={async () => {
                    await adjustUserLevelXp.mutateAsync({
                      ccId,
                      deltaXp,
                      reason: adjustReason,
                    });
                    await refetchUserLevel();
                  }}
                >
                  {adjustUserLevelXp.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="ml-2">적용중...</span>
                    </>
                  ) : (
                    "XP 가산 적용"
                  )}
                </Button>

                <div className="border-t border-white/10 pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-zinc-400">레벨(강제)</Label>
                      <Input
                        type="number"
                        value={setLevelValue}
                        onChange={(e) =>
                          setSetLevelValue(
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value),
                          )
                        }
                        className="bg-black/20 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400">XP(강제)</Label>
                      <Input
                        type="number"
                        value={setXpValue}
                        onChange={(e) =>
                          setSetXpValue(
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value),
                          )
                        }
                        className="bg-black/20 border-white/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">사유</Label>
                    <Input
                      value={setReason}
                      onChange={(e) => setSetReason(e.target.value)}
                      placeholder="예: 강제 레벨/XP 설정 (보상 없음)"
                      className="bg-black/20 border-white/10"
                    />
                  </div>
                  <Button
                    className="bg-amber-600 hover:bg-amber-700"
                    disabled={
                      !ccId ||
                      !setReason ||
                      (setLevelValue === "" && setXpValue === "") ||
                      setUserLevel.isPending
                    }
                    onClick={async () => {
                      await setUserLevel.mutateAsync({
                        ccId,
                        level:
                          setLevelValue === ""
                            ? undefined
                            : Number(setLevelValue),
                        xp: setXpValue === "" ? undefined : Number(setXpValue),
                        reason: setReason,
                      });
                      await refetchUserLevel();
                    }}
                  >
                    {setUserLevel.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="ml-2">적용중...</span>
                      </>
                    ) : (
                      "강제 설정 적용"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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
import { RefreshCw, Search, AlertCircle, Trophy, Loader2 } from "lucide-react";
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

  const handleSaveLevel = async (level: number) => {
    const data = editingLevels[level];
    if (!data) return;

    await updateLevel.mutateAsync({ level, data });
    setEditingLevels((prev) => {
      const next = { ...prev };
      delete next[level];
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 pb-20 max-w-[1600px] mx-auto text-white">
      {/* Header */}
      <div className="flex justify-between items-center">
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

        <TabsContent value="config" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Info Card */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="bg-zinc-900 border-white/10">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    주의사항
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-zinc-500 leading-relaxed space-y-2">
                  <p>
                    • 레벨 구간 설정 변경은 전체 게임 경제에 즉시 영향을
                    미칩니다.
                  </p>
                  <p>• 레벨업 보상은 우편함 또는 인벤토리로 즉시 지급됩니다.</p>
                  <p>
                    • 경험치 요구량은 다음 레벨로 가기 위한 누적 경험치입니다.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-white/10">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    현재 상태
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">
                      정의된 레벨 수:
                    </span>
                    <span className="text-sm font-bold text-white font-mono">
                      {levels.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">최대 레벨:</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {globalConfig.maxLevel}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Level List */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center gap-4 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="레벨 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-zinc-900 border-white/10"
                  />
                </div>
              </div>

              <Card className="bg-zinc-900 border-white/10 overflow-hidden">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-zinc-400 w-20">
                        Level
                      </TableHead>
                      <TableHead className="text-zinc-400">
                        요구 경험치 (XP)
                      </TableHead>
                      <TableHead className="text-zinc-400">보상 종류</TableHead>
                      <TableHead className="text-zinc-400">보상 수량</TableHead>
                      <TableHead className="text-zinc-400 w-24 text-right">
                        관리
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
                          className="border-white/5 hover:bg-white/5 group"
                        >
                          <TableCell className="font-black text-indigo-400 text-lg font-mono">
                            {lvl.level}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editData.requiredXp}
                              onChange={(e) =>
                                handleLevelFieldChange(
                                  lvl.level,
                                  "requiredXp",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="bg-black/20 border-white/10"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={editData.rewardType}
                              onValueChange={(value) =>
                                handleLevelFieldChange(
                                  lvl.level,
                                  "rewardType",
                                  value,
                                )
                              }
                            >
                              <SelectTrigger className="bg-black/20 border-white/10">
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
                          <TableCell>
                            <Input
                              type="number"
                              value={editData.rewardAmount}
                              onChange={(e) =>
                                handleLevelFieldChange(
                                  lvl.level,
                                  "rewardAmount",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="bg-black/20 border-white/10"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              disabled={!isEdited}
                              onClick={() => handleSaveLevel(lvl.level)}
                            >
                              저장
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="user" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-zinc-900 border-white/10 lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                  유저 조회 (CC ID)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">CC ID</Label>
                  <Input
                    value={ccId}
                    onChange={(e) => setCcId(e.target.value)}
                    placeholder="예: 0126"
                    className="bg-black/20 border-white/10"
                  />
                </div>
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={!ccId || isUserLevelLoading}
                  onClick={() => refetchUserLevel()}
                >
                  {isUserLevelLoading ? "조회중..." : "조회"}
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

            <Card className="bg-zinc-900 border-white/10 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-white">레벨/XP 조정</CardTitle>
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
                  disabled={!ccId || !adjustReason || deltaXp === 0}
                  onClick={async () => {
                    await adjustUserLevelXp.mutateAsync({
                      ccId,
                      deltaXp,
                      reason: adjustReason,
                    });
                    await refetchUserLevel();
                  }}
                >
                  XP 가산 적용
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
                      (setLevelValue === "" && setXpValue === "")
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
                    강제 설정 적용
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

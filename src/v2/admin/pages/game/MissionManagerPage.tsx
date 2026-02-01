import { useState, useEffect, useMemo } from "react";
import {
  useAdminMissions,
  useAdminUpdateMission,
  useAdminCreateMission,
  useAdminDeleteMission,
  useAdminUserMissionHistory,
  useAdminForceCompleteMission,
  useAdminUpdateUserMissionProgress,
  useAdminResetUserMissionProgress,
  useAdminClaimUserMissionReward,
  useAdminUserStreak,
  useAdminResetUserStreak,
  useAdminSetUserStreakCount,
  useAdminUserMilestoneProgress,
  useAdminForceGrantMilestone,
  useAdminResetUserMissions,
  useAdminLoginMissionVerify,
  useAdminMissionStats,
  useAdminActiveUserStats,
} from "../../../hooks/useAdminGame";
import {
  useAdminUiConfig,
  useAdminUpdateUiConfig,
} from "../../../hooks/useAdminUiConfig";
import styles from "./MissionManagerPage.module.css";
import { cn } from "../../../lib/utils";
import {
  resolveAdminUserIdentifier,
  type AdminMissionDto,
} from "../../../api/adminApi";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Switch } from "../../../components/ui/switch";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import {
  Plus,
  Trash2,
  Edit2,
  Users,
  TrendingUp,
  Award,
  RotateCcw,
  Flame,
  Target,
  BarChart3,
  Settings,
  Save,
  Search,
  ListChecks,
  UserCog,
  PieChart,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

// 분리된 컴포넌트들 import
import {
  CollapsibleSection,
  QuickStat,
  MissionCard,
} from "./mission/components";

// 상수 및 헬퍼 함수 import
import {
  MISSION_REWARD_OPTIONS,
  CATEGORIES,
  ACTION_TYPE_OPTIONS,
  LOGIC_KEY_PRESETS,
  PRESET_RECOMMENDED_ACTION_TYPE,
  CATEGORY_COLORS,
} from "./mission/constants/missionConstants";

import {
  isGoldenHourLogicKey,
  getCategoryMeaning,
  getPresetCategory,
  generateLogicKey,
  generateTitle,
  normalizeLogicKey,
  getTrendHeightClass,
} from "./mission/utils/missionHelpers";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface StreakGrant {
  kind: "WALLET" | "INVENTORY";
  token_type: string;
  amount: number;
}

interface StreakRule {
  day: number;
  enabled: boolean;
  grants: StreakGrant[];
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export default function MissionManagerPage() {
  // ─── API Hooks ───
  const { data: missions = [], isLoading } = useAdminMissions();
  const updateMutation = useAdminUpdateMission();
  const createMutation = useAdminCreateMission();
  const deleteMutation = useAdminDeleteMission();

  // User Mission Management
  const [userMissionUserIdInput, setUserMissionUserIdInput] = useState("");
  const [userMissionUserId, setUserMissionUserId] = useState<number | null>(
    null,
  );
  const [userMissionUserLabel, setUserMissionUserLabel] = useState<string>("");
  const [userMissionError, setUserMissionError] = useState<string | null>(null);
  const [userMissionNotice, setUserMissionNotice] = useState<string | null>(
    null,
  );
  const [progressEdits, setProgressEdits] = useState<Record<number, string>>(
    {},
  );

  const { data: userMissions = [], isLoading: isUserMissionsLoading } =
    useAdminUserMissionHistory(userMissionUserId ?? undefined);
  const forceCompleteMutation = useAdminForceCompleteMission();
  const updateProgressMutation = useAdminUpdateUserMissionProgress();
  const resetProgressMutation = useAdminResetUserMissionProgress();
  const claimRewardMutation = useAdminClaimUserMissionReward();

  // Streak & Milestone
  const [streakUserIdInput, setStreakUserIdInput] = useState("");
  const [streakUserId, setStreakUserId] = useState<number | null>(null);
  const [streakEditValue, setStreakEditValue] = useState("");
  const [milestoneDay, setMilestoneDay] = useState(3);
  const [milestoneReason, setMilestoneReason] = useState("");

  const { data: streakData, isLoading: isStreakLoading } = useAdminUserStreak(
    streakUserId ?? undefined,
  );
  const { data: milestoneData, isLoading: isMilestoneLoading } =
    useAdminUserMilestoneProgress(streakUserId ?? undefined);
  const resetStreakMutation = useAdminResetUserStreak();
  const setStreakCountMutation = useAdminSetUserStreakCount();
  const forceGrantMilestoneMutation = useAdminForceGrantMilestone();

  // Mission Reset
  const [missionResetReason, setMissionResetReason] = useState("");
  const [selectedMissionIdForReset, setSelectedMissionIdForReset] = useState<
    number | null
  >(null);
  const resetUserMissionsMutation = useAdminResetUserMissions();

  // Streak Rules
  const [editingRules, setEditingRules] = useState<StreakRule[]>([]);
  const [isRulesEditing, setIsRulesEditing] = useState(false);
  const { data: streakRulesConfig, isLoading: isRulesLoading } =
    useAdminUiConfig("streak_reward_rules");
  const updateRulesMutation = useAdminUpdateUiConfig();

  useEffect(() => {
    if (streakRulesConfig?.value) {
      const config = streakRulesConfig.value as { rules?: StreakRule[] };
      setEditingRules(config.rules || []);
    }
  }, [streakRulesConfig]);

  // Stats
  const { data: missionStats, isLoading: isMissionStatsLoading } =
    useAdminMissionStats();
  const { data: loginVerifyData, isLoading: isLoginVerifyLoading } =
    useAdminLoginMissionVerify({ limit: 20 });
  const { data: activeUserStats, isLoading: isActiveUserStatsLoading } =
    useAdminActiveUserStats(7);

  // UI State
  const [mainTab, setMainTab] = useState<"missions" | "users" | "stats">(
    "missions",
  );
  const [categoryTab, setCategoryTab] = useState("DAILY");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<AdminMissionDto | null>(null);
  const [selectedPreset, setSelectedPreset] =
    useState<string>("daily_play_generic");
  const [createForm, setCreateForm] = useState(() => ({
    category: "DAILY",
    title: "일일 게임 플레이 1회",
    condition: "",
    rewardType: "VAULT",
    rewardAmount: 100,
    targetValue: 1,
    logicKey: "DAILY_DAILY_PLAY_GENERIC_1",
    actionType: "PLAY_GAME",
  }));
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // ─── Computed Values ───
  const filteredMissions = useMemo(
    () => missions.filter((m) => m.category === categoryTab),
    [missions, categoryTab],
  );

  const missionCounts = useMemo(
    () => ({
      total: missions.length,
      active: missions.filter((m) => m.isActive).length,
      daily: missions.filter((m) => m.category === "DAILY").length,
      weekly: missions.filter((m) => m.category === "WEEKLY").length,
      newUser: missions.filter((m) => m.category === "NEW_USER").length,
      special: missions.filter((m) => m.category === "SPECIAL_EVENT").length,
    }),
    [missions],
  );

  // ─── Handlers ───
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

  const findLogicalDuplicate = (
    category: string,
    actionType: string,
    targetValue: number,
    excludeId?: number,
  ) => {
    return (
      missions.find(
        (m) =>
          (excludeId == null || m.id !== excludeId) &&
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

    createMutation.mutate(
      { ...createForm, logicKey: nextLogicKey },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          setSelectedPreset("daily_play_generic");
          setCreateForm({
            category: "DAILY",
            title: "일일 게임 플레이 1회",
            condition: "",
            rewardType: "VAULT",
            rewardAmount: 100,
            targetValue: 1,
            logicKey: "DAILY_DAILY_PLAY_GENERIC_1",
            actionType: "PLAY_GAME",
          });
          setCreateError(null);
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("정말 이 미션을 삭제하시겠습니까?")) {
      deleteMutation.mutate(id);
    }
  };

  const openEdit = (mission: AdminMissionDto) => {
    setEditForm({ ...mission });
    setEditError(null);
    setIsEditOpen(true);
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

    updateMutation.mutate(
      {
        id: editForm.id,
        data: {
          category: editForm.category,
          title: editForm.title,
          condition: editForm.condition,
          targetValue: editForm.targetValue,
          logicKey: nextLogicKey,
          actionType: editForm.actionType,
          rewardType: editForm.rewardType,
          rewardAmount: editForm.rewardAmount,
          isActive: editForm.isActive,
        },
      },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          setEditError(null);
        },
      },
    );
  };

  const handleUpdate = (
    id: number,
    field: keyof AdminMissionDto,
    value: any,
  ) => {
    updateMutation.mutate({ id, data: { [field]: value } });
  };

  const handleDuplicate = (mission: AdminMissionDto) => {
    const newLogicKey = `${mission.logicKey}_COPY`;
    createMutation.mutate({
      category: mission.category,
      title: `${mission.title} (복사본)`,
      condition: mission.condition || "",
      rewardType: mission.rewardType,
      rewardAmount: mission.rewardAmount,
      targetValue: mission.targetValue,
      logicKey: newLogicKey,
      actionType: mission.actionType || "PLAY_GAME",
    });
  };

  // User Mission Handlers
  const handleLoadUserMissions = async () => {
    const raw = userMissionUserIdInput.trim();
    if (!raw) {
      setUserMissionError("유저 ID 또는 닉네임을 입력하세요.");
      setUserMissionNotice(null);
      return;
    }

    if (/^\d+$/.test(raw)) {
      const parsed = parseInt(raw, 10);
      if (!parsed || parsed <= 0) {
        setUserMissionError("유저 ID 또는 닉네임을 입력하세요.");
        return;
      }
      setUserMissionError(null);
      setUserMissionNotice(null);
      setUserMissionUserId(parsed);
      setUserMissionUserLabel(`USER #${parsed}`);
      return;
    }

    try {
      setUserMissionError(null);
      const resolved = await resolveAdminUserIdentifier(raw);
      setUserMissionUserId(resolved.userId);
      setUserMissionUserLabel(
        `${resolved.nickname} (USER #${resolved.userId})`,
      );
    } catch {
      setUserMissionUserId(null);
      setUserMissionUserLabel("");
      setUserMissionError("닉네임으로 유저를 찾을 수 없습니다.");
    }
  };

  const handleProgressChange = (missionId: number, value: string) => {
    setProgressEdits((prev) => ({ ...prev, [missionId]: value }));
  };

  const handleSaveProgress = (missionId: number, fallback: number) => {
    if (!userMissionUserId) return;
    const raw = progressEdits[missionId];
    const parsed =
      raw === undefined || raw.trim() === "" ? fallback : Number(raw);
    if (Number.isNaN(parsed) || parsed < 0) {
      setUserMissionError("진행값은 0 이상의 숫자여야 합니다.");
      return;
    }
    setUserMissionError(null);
    updateProgressMutation.mutate({
      userId: userMissionUserId,
      missionId,
      payload: { currentValue: parsed },
    });
  };

  const handleResetProgress = (missionId: number) => {
    if (!userMissionUserId) return;
    resetProgressMutation.mutate({ userId: userMissionUserId, missionId });
  };

  const handleForceComplete = (missionId: number) => {
    if (!userMissionUserId) return;
    forceCompleteMutation.mutate({ userId: userMissionUserId, missionId });
  };

  const handleClaimReward = async (missionId: number) => {
    if (!userMissionUserId) return;
    setUserMissionError(null);
    setUserMissionNotice(null);
    try {
      const res = await claimRewardMutation.mutateAsync({
        userId: userMissionUserId,
        missionId,
      });
      if (!res.success) {
        setUserMissionError(res.message || "보상 지급 실패");
        return;
      }
      const rewardLabel = res.rewardType ? `${res.rewardType}` : "보상";
      setUserMissionNotice(`${rewardLabel} ${res.rewardAmount ?? 0} 지급 완료`);
    } catch {
      setUserMissionError("보상 지급 실패");
    }
  };

  // ─── Render Preview ───
  const renderMissionPreview = (vars: {
    category: string;
    logicKey: string;
    actionType?: string | null;
    targetValue: number;
  }) => {
    const golden = isGoldenHourLogicKey(vars.logicKey);
    const action = String(vars.actionType || "").trim() || "(없음)";
    const catMeaning = getCategoryMeaning(vars.category);

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
              {normalizeLogicKey(vars.logicKey) || "UNDEFINED"}
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div>
              <Label className="text-[10px] uppercase text-zinc-500">
                목표값
              </Label>
              <div className="text-lg font-bold text-zinc-100">
                {vars.targetValue}회
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

  // ─── Loading State ───
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white p-6 h-full overflow-y-auto">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            미션 관리
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            미션 설정, 유저 진행 관리, 통계 분석
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          >
            시즌 25 활성
          </Badge>
          <Button
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="w-4 h-4" />새 미션
          </Button>
        </div>
      </div>

      {/* ─── Quick Stats ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickStat
          label="전체 미션"
          value={missionCounts.total}
          icon={<ListChecks className="w-4 h-4 text-zinc-400" />}
          color="bg-zinc-900/50 border-white/5"
        />
        <QuickStat
          label="활성 미션"
          value={missionCounts.active}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          color="bg-emerald-500/5 border-emerald-500/20"
        />
        <QuickStat
          label="오늘 DAU"
          value={activeUserStats?.stats?.dau?.toLocaleString() ?? "-"}
          change={activeUserStats?.stats?.dau_change}
          icon={<Users className="w-4 h-4 text-indigo-400" />}
          color="bg-indigo-500/5 border-indigo-500/20"
        />
        <QuickStat
          label="오늘 완료율"
          value={
            loginVerifyData
              ? `${(loginVerifyData.completion_rate * 100).toFixed(0)}%`
              : "-"
          }
          icon={<Target className="w-4 h-4 text-amber-400" />}
          color="bg-amber-500/5 border-amber-500/20"
        />
      </div>

      {/* ─── Main Tabs ─── */}
      <Tabs
        value={mainTab}
        onValueChange={(v) => setMainTab(v as any)}
        className="w-full"
      >
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 bg-[#18181B] border border-white/5">
          <TabsTrigger
            value="missions"
            className="gap-2 data-[state=active]:bg-zinc-800"
          >
            <ListChecks className="w-4 h-4" />
            <span className="hidden sm:inline">미션 설정</span>
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="gap-2 data-[state=active]:bg-zinc-800"
          >
            <UserCog className="w-4 h-4" />
            <span className="hidden sm:inline">유저 관리</span>
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="gap-2 data-[state=active]:bg-zinc-800"
          >
            <PieChart className="w-4 h-4" />
            <span className="hidden sm:inline">통계 분석</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Missions Tab ─── */}
        <TabsContent value="missions" className="space-y-6 mt-6">
          {/* Category Tabs */}
          <Tabs
            value={categoryTab}
            onValueChange={setCategoryTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 bg-[#18181B] border border-white/5">
              {CATEGORIES.map((cat) => {
                const count = missions.filter((m) => m.category === cat).length;
                const style: { bg: string; text: string; border: string } =
                  CATEGORY_COLORS[cat] ?? {
                    bg: "bg-emerald-500/10",
                    text: "text-emerald-400",
                    border: "border-emerald-500/20",
                  };
                return (
                  <TabsTrigger
                    key={cat}
                    value={cat}
                    className={cn(
                      "gap-2 data-[state=active]:bg-zinc-800",
                      `data-[state=active]:${style.text}`,
                    )}
                  >
                    {cat}
                    <Badge
                      variant="secondary"
                      className="text-[10px] h-4 px-1.5 bg-white/5"
                    >
                      {count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={categoryTab} className="mt-4 space-y-3">
              {filteredMissions.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 border border-dashed border-white/10 rounded-xl">
                  <ListChecks className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>등록된 미션이 없습니다.</p>
                  <Button
                    variant="link"
                    className="text-emerald-400 mt-2"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    새 미션 만들기
                  </Button>
                </div>
              ) : (
                filteredMissions.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    onEdit={() => openEdit(mission)}
                    onDelete={() => handleDelete(mission.id)}
                    onToggleActive={(active) =>
                      handleUpdate(mission.id, "isActive", active)
                    }
                    onDuplicate={() => handleDuplicate(mission)}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>

          {/* Streak Rules Section - Full CRUD */}
          <CollapsibleSection
            title="스트릭 보상 규칙 설정"
            subtitle="연속 출석 일수별 보상 조건 관리 (CRUD)"
            icon={<Settings className="w-4 h-4" />}
            iconColor="text-blue-400"
            badge={
              <Badge
                variant="outline"
                className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]"
              >
                {editingRules.length}개 규칙
              </Badge>
            }
          >
            <div className="space-y-4">
              {/* Action Buttons */}
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  {isRulesEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => {
                        const existingDays = editingRules.map((r) => r.day);
                        let newDay = 1;
                        while (existingDays.includes(newDay)) newDay++;
                        const newRule: StreakRule = {
                          day: newDay,
                          enabled: true,
                          grants: [
                            {
                              kind: "WALLET" as const,
                              token_type: "ROULETTE_TICKET",
                              amount: 1,
                            },
                          ],
                        };
                        setEditingRules(
                          [...editingRules, newRule].sort(
                            (a, b) => a.day - b.day,
                          ),
                        );
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      규칙 추가
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isRulesEditing ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (streakRulesConfig?.value) {
                            const config = streakRulesConfig.value as {
                              rules?: StreakRule[];
                            };
                            setEditingRules(config.rules || []);
                          }
                          setIsRulesEditing(false);
                        }}
                      >
                        취소
                      </Button>
                      <Button
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600"
                        disabled={updateRulesMutation.isPending}
                        onClick={() => {
                          updateRulesMutation.mutate({
                            key: "streak_reward_rules",
                            payload: { value: { rules: editingRules } },
                          });
                          setIsRulesEditing(false);
                        }}
                      >
                        {updateRulesMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-1" />
                        )}
                        저장
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setIsRulesEditing(true)}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      편집 모드
                    </Button>
                  )}
                </div>
              </div>

              {/* Rules Grid */}
              {isRulesLoading ? (
                <div className="flex items-center justify-center py-8 text-zinc-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  로딩 중...
                </div>
              ) : editingRules.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                  <Flame className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
                  <p className="text-zinc-500 mb-4">
                    등록된 보상 규칙이 없습니다.
                  </p>
                  <Button
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600"
                    onClick={() => {
                      setEditingRules([
                        {
                          day: 3,
                          enabled: true,
                          grants: [
                            {
                              kind: "WALLET",
                              token_type: "ROULETTE_TICKET",
                              amount: 1,
                            },
                            {
                              kind: "WALLET",
                              token_type: "DICE_TICKET",
                              amount: 1,
                            },
                            {
                              kind: "WALLET",
                              token_type: "LOTTERY_TICKET",
                              amount: 1,
                            },
                          ],
                        },
                        {
                          day: 7,
                          enabled: true,
                          grants: [
                            {
                              kind: "WALLET",
                              token_type: "DIAMOND",
                              amount: 1,
                            },
                          ],
                        },
                        {
                          day: 14,
                          enabled: true,
                          grants: [
                            {
                              kind: "WALLET",
                              token_type: "DIAMOND",
                              amount: 2,
                            },
                          ],
                        },
                        {
                          day: 30,
                          enabled: true,
                          grants: [
                            {
                              kind: "WALLET",
                              token_type: "DIAMOND",
                              amount: 5,
                            },
                          ],
                        },
                      ]);
                      setIsRulesEditing(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    기본 규칙 생성
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {editingRules.map((rule, ruleIdx) => (
                    <div
                      key={`rule-${rule.day}-${ruleIdx}`}
                      className={cn(
                        "p-4 rounded-xl border transition-all",
                        rule.enabled
                          ? "bg-gradient-to-r from-black/40 to-black/20 border-white/10"
                          : "bg-zinc-900/30 border-white/5 opacity-50",
                      )}
                    >
                      {/* Rule Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          {isRulesEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                max={365}
                                value={rule.day}
                                onChange={(e) => {
                                  const newDay = parseInt(e.target.value) || 1;
                                  const newRules = [...editingRules];
                                  newRules[ruleIdx] = { ...rule, day: newDay };
                                  setEditingRules(
                                    newRules.sort((a, b) => a.day - b.day),
                                  );
                                }}
                                className="w-20 h-8 bg-black/50 border-white/10 text-center font-bold"
                              />
                              <span className="text-zinc-400 text-sm">
                                일차
                              </span>
                            </div>
                          ) : (
                            <Badge
                              className={cn(
                                "text-base px-3 py-1",
                                rule.day <= 3
                                  ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                  : rule.day <= 7
                                    ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                                    : rule.day <= 14
                                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                              )}
                            >
                              <Flame className="w-4 h-4 mr-1" />
                              {rule.day}일차
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">
                              활성화
                            </span>
                            <Switch
                              checked={rule.enabled}
                              disabled={!isRulesEditing}
                              onCheckedChange={(checked) => {
                                const newRules = [...editingRules];
                                newRules[ruleIdx] = {
                                  ...rule,
                                  enabled: checked,
                                };
                                setEditingRules(newRules);
                              }}
                            />
                          </div>
                          {isRulesEditing && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                              onClick={() =>
                                setEditingRules(
                                  editingRules.filter((_, i) => i !== ruleIdx),
                                )
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Grants List */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-zinc-500 uppercase">
                            보상 목록
                          </Label>
                          {isRulesEditing && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs text-emerald-400 hover:bg-emerald-500/10"
                              onClick={() => {
                                const newRules = [...editingRules];
                                newRules[ruleIdx] = {
                                  ...rule,
                                  grants: [
                                    ...rule.grants,
                                    {
                                      kind: "WALLET",
                                      token_type: "ROULETTE_TICKET",
                                      amount: 1,
                                    },
                                  ],
                                };
                                setEditingRules(newRules);
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              보상 추가
                            </Button>
                          )}
                        </div>

                        <div className="grid gap-2">
                          {rule.grants.map((grant, grantIdx) => (
                            <div
                              key={`grant-${ruleIdx}-${grantIdx}`}
                              className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-black/30 border border-white/5"
                            >
                              {isRulesEditing ? (
                                <>
                                  <Select
                                    value={grant.kind}
                                    onValueChange={(
                                      value: "WALLET" | "INVENTORY",
                                    ) => {
                                      const newRules = [...editingRules];
                                      const targetRule = newRules[ruleIdx];
                                      if (targetRule) {
                                        targetRule.grants[grantIdx] = {
                                          ...grant,
                                          kind: value,
                                        };
                                      }
                                      setEditingRules(newRules);
                                    }}
                                  >
                                    <SelectTrigger className="w-28 h-8 bg-black/50 border-white/10 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#18181B] border-white/10 text-white">
                                      <SelectItem value="WALLET">
                                        WALLET
                                      </SelectItem>
                                      <SelectItem value="INVENTORY">
                                        INVENTORY
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>

                                  <Select
                                    value={grant.token_type}
                                    onValueChange={(value) => {
                                      const newRules = [...editingRules];
                                      const targetRule = newRules[ruleIdx];
                                      if (targetRule) {
                                        targetRule.grants[grantIdx] = {
                                          ...grant,
                                          token_type: value,
                                        };
                                      }
                                      setEditingRules(newRules);
                                    }}
                                  >
                                    <SelectTrigger className="flex-1 min-w-32 h-8 bg-black/50 border-white/10 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#18181B] border-white/10 text-white max-h-48">
                                      <SelectItem value="ROULETTE_TICKET">
                                        룰렛 티켓
                                      </SelectItem>
                                      <SelectItem value="DICE_TICKET">
                                        주사위 티켓
                                      </SelectItem>
                                      <SelectItem value="LOTTERY_TICKET">
                                        복권 티켓
                                      </SelectItem>
                                      <SelectItem value="GOLD_KEY">
                                        골드 키
                                      </SelectItem>
                                      <SelectItem value="DIAMOND">
                                        다이아몬드
                                      </SelectItem>
                                      <SelectItem value="VAULT">
                                        금고 적립금
                                      </SelectItem>
                                      <SelectItem value="XP">경험치</SelectItem>
                                    </SelectContent>
                                  </Select>

                                  <Input
                                    type="number"
                                    min={1}
                                    value={grant.amount}
                                    onChange={(e) => {
                                      const newRules = [...editingRules];
                                      const targetRule = newRules[ruleIdx];
                                      if (targetRule) {
                                        targetRule.grants[grantIdx] = {
                                          ...grant,
                                          amount: parseInt(e.target.value) || 1,
                                        };
                                      }
                                      setEditingRules(newRules);
                                    }}
                                    className="w-20 h-8 bg-black/50 border-white/10 text-center text-xs"
                                  />

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                                    onClick={() => {
                                      const newRules = [...editingRules];
                                      const targetRule = newRules[ruleIdx];
                                      if (targetRule) {
                                        targetRule.grants = rule.grants.filter(
                                          (_, i) => i !== grantIdx,
                                        );
                                      }
                                      setEditingRules(newRules);
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Badge
                                    variant="outline"
                                    className="bg-white/5 border-white/10 text-[10px]"
                                  >
                                    {grant.kind}
                                  </Badge>
                                  <span className="text-zinc-300 text-sm">
                                    {grant.token_type === "ROULETTE_TICKET"
                                      ? "룰렛 티켓"
                                      : grant.token_type === "DICE_TICKET"
                                        ? "주사위 티켓"
                                        : grant.token_type === "LOTTERY_TICKET"
                                          ? "복권 티켓"
                                          : grant.token_type === "GOLD_KEY"
                                            ? "골드 키"
                                            : grant.token_type === "DIAMOND"
                                              ? "다이아몬드"
                                              : grant.token_type === "VAULT"
                                                ? "금고 적립금"
                                                : grant.token_type === "XP"
                                                  ? "경험치"
                                                  : grant.token_type}
                                  </span>
                                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                    x{grant.amount}
                                  </Badge>
                                </>
                              )}
                            </div>
                          ))}
                          {rule.grants.length === 0 && (
                            <div className="text-center py-3 text-zinc-500 text-xs border border-dashed border-white/10 rounded-lg">
                              보상이 없습니다. 추가해주세요.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Info Box */}
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-start gap-2 text-xs text-blue-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">스트릭 보상 작동 방식</p>
                    <ul className="text-blue-400/80 space-y-0.5">
                      <li>• 유저가 해당 일차에 도달하면 보상 클레임 가능</li>
                      <li>• 한 번 클레임한 마일스톤은 다시 클레임 불가</li>
                      <li>• 비활성화된 규칙은 보상 지급되지 않음</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </TabsContent>

        {/* ─── Users Tab ─── */}
        <TabsContent value="users" className="space-y-6 mt-6">
          {/* User Mission Management */}
          <Card className="bg-[#18181B] border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCog className="w-5 h-5 text-emerald-400" />
                유저 미션 관리
              </CardTitle>
              <p className="text-xs text-zinc-500">
                진행값 수정, 강제 완료, 보상 지급
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    value={userMissionUserIdInput}
                    onChange={(e) => setUserMissionUserIdInput(e.target.value)}
                    placeholder="유저 ID 또는 닉네임"
                    className="pl-10 bg-black/50 border-white/10"
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleLoadUserMissions()
                    }
                  />
                </div>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600"
                  onClick={handleLoadUserMissions}
                >
                  조회
                </Button>
                {userMissionUserId && (
                  <Badge
                    variant="outline"
                    className="bg-white/5 text-zinc-300 border-white/10"
                  >
                    {userMissionUserLabel}
                  </Badge>
                )}
              </div>

              {userMissionError && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {userMissionError}
                </div>
              )}
              {userMissionNotice && (
                <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                  {userMissionNotice}
                </div>
              )}

              {isUserMissionsLoading ? (
                <div className="flex items-center justify-center py-8 text-zinc-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  로딩 중...
                </div>
              ) : userMissionUserId && userMissions.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  유저 미션 기록이 없습니다.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {userMissions.map((mission) => (
                    <div
                      key={mission.id}
                      className="p-4 rounded-lg border border-white/5 bg-black/30 hover:bg-black/50 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div>
                          <div className="font-semibold text-zinc-200">
                            {mission.missionTitle}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {mission.category} · 진행: {mission.progress}/
                            {mission.maxProgress}
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            mission.status === "COMPLETED"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : mission.status === "FAILED"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-zinc-500/20 text-zinc-400",
                          )}
                        >
                          {mission.status === "COMPLETED"
                            ? "완료"
                            : mission.status === "FAILED"
                              ? "실패"
                              : mission.status === "IN_PROGRESS"
                                ? "진행중"
                                : mission.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          value={
                            progressEdits[mission.missionId] ??
                            String(mission.progress)
                          }
                          onChange={(e) =>
                            handleProgressChange(
                              mission.missionId,
                              e.target.value,
                            )
                          }
                          className="w-24 bg-black/50 border-white/10 text-right"
                          type="number"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            handleSaveProgress(
                              mission.missionId,
                              mission.progress,
                            )
                          }
                        >
                          저장
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleResetProgress(mission.missionId)}
                        >
                          리셋
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleForceComplete(mission.missionId)}
                        >
                          강제완료
                        </Button>
                        <Button
                          size="sm"
                          className="bg-indigo-500/90 hover:bg-indigo-500"
                          onClick={() => handleClaimReward(mission.missionId)}
                        >
                          보상지급
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Streak & Milestone Section */}
          <CollapsibleSection
            title="스트릭 & 마일스톤"
            subtitle="유저 스트릭 조회/수정, 마일스톤 보상"
            icon={<Flame className="w-4 h-4" />}
            iconColor="text-orange-400"
            defaultOpen
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={streakUserIdInput}
                  onChange={(e) => setStreakUserIdInput(e.target.value)}
                  placeholder="유저 ID"
                  className="w-32 bg-black/50 border-white/10"
                />
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={() => {
                    const parsed = parseInt(streakUserIdInput, 10);
                    if (parsed > 0) setStreakUserId(parsed);
                  }}
                >
                  조회
                </Button>
                {streakUserId && (
                  <Badge
                    variant="outline"
                    className="bg-white/5 text-zinc-300 border-white/10"
                  >
                    USER #{streakUserId}
                  </Badge>
                )}
              </div>

              {isStreakLoading && (
                <div className="text-sm text-zinc-500">로딩 중...</div>
              )}

              {streakData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-black/30 border border-white/5">
                  <div>
                    <div className="text-xs text-zinc-500">스트릭 일수</div>
                    <div className="text-2xl font-bold text-orange-400">
                      {streakData.streak_days}일
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">상태</div>
                    <div className="flex gap-2 mt-1">
                      {streakData.is_hot && (
                        <Badge className="bg-red-500/20 text-red-400">
                          HOT
                        </Badge>
                      )}
                      {streakData.is_legend && (
                        <Badge className="bg-purple-500/20 text-purple-400">
                          LEGEND
                        </Badge>
                      )}
                      {!streakData.is_hot && !streakData.is_legend && (
                        <Badge className="bg-zinc-500/20 text-zinc-400">
                          일반
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">다음 마일스톤</div>
                    <div className="text-lg font-semibold text-zinc-200">
                      {streakData.next_milestone ?? "-"}일
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">배율</div>
                    <div className="text-lg font-semibold text-emerald-400">
                      x{streakData.current_multiplier}
                    </div>
                  </div>
                </div>
              )}

              {streakUserId && (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={streakEditValue}
                    onChange={(e) => setStreakEditValue(e.target.value)}
                    placeholder="스트릭 일수"
                    className="w-28 bg-black/50 border-white/10"
                    type="number"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const val = parseInt(streakEditValue, 10);
                      if (val >= 0 && streakUserId) {
                        setStreakCountMutation.mutate({
                          userId: streakUserId,
                          payload: { streak_days: val },
                        });
                      }
                    }}
                    disabled={setStreakCountMutation.isPending}
                  >
                    스트릭 설정
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-red-400"
                    onClick={() => {
                      if (
                        streakUserId &&
                        confirm("스트릭을 0으로 초기화하시겠습니까?")
                      ) {
                        resetStreakMutation.mutate(streakUserId);
                      }
                    }}
                    disabled={resetStreakMutation.isPending}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    리셋
                  </Button>
                </div>
              )}

              {/* Milestone Progress */}
              {isMilestoneLoading && (
                <div className="text-sm text-zinc-500">마일스톤 로딩 중...</div>
              )}
              {milestoneData && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-zinc-300">
                    마일스톤 진행 현황
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {milestoneData.milestones.map((m) => (
                      <div
                        key={m.day}
                        className={cn(
                          "px-3 py-2 rounded-lg border",
                          m.claimed
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : m.achieved
                              ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                              : "bg-zinc-800/50 border-white/5 text-zinc-500",
                        )}
                      >
                        <div className="text-xs font-bold">{m.day}일</div>
                        <div className="text-[10px]">
                          {m.claimed
                            ? "수령완료"
                            : m.achieved
                              ? "달성"
                              : "미달성"}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Force Grant Milestone */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Select
                      value={String(milestoneDay)}
                      onValueChange={(v) => setMilestoneDay(Number(v))}
                    >
                      <SelectTrigger className="w-24 bg-black/50 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#18181B] border-white/10 text-white">
                        {[3, 7, 14, 30].map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            {d}일
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={milestoneReason}
                      onChange={(e) => setMilestoneReason(e.target.value)}
                      placeholder="지급 사유"
                      className="w-40 bg-black/50 border-white/10"
                    />
                    <Button
                      size="sm"
                      className="bg-purple-500 hover:bg-purple-600"
                      onClick={() => {
                        if (streakUserId && milestoneReason) {
                          forceGrantMilestoneMutation.mutate({
                            userId: streakUserId,
                            payload: {
                              milestone_day: milestoneDay,
                              reason: milestoneReason,
                            },
                          });
                        }
                      }}
                      disabled={forceGrantMilestoneMutation.isPending}
                    >
                      <Award className="w-4 h-4 mr-1" />
                      마일스톤 지급
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Mission Reset Section */}
          <CollapsibleSection
            title="미션 일괄 리셋"
            subtitle="특정 유저의 미션 진행 상태 초기화"
            icon={<RotateCcw className="w-4 h-4" />}
            iconColor="text-red-400"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={userMissionUserIdInput}
                onChange={(e) => setUserMissionUserIdInput(e.target.value)}
                placeholder="유저 ID"
                className="w-32 bg-black/50 border-white/10"
              />
              <Select
                value={
                  selectedMissionIdForReset === null
                    ? "all"
                    : String(selectedMissionIdForReset)
                }
                onValueChange={(v) =>
                  setSelectedMissionIdForReset(v === "all" ? null : Number(v))
                }
              >
                <SelectTrigger className="w-48 bg-black/50 border-white/10">
                  <SelectValue placeholder="미션 선택" />
                </SelectTrigger>
                <SelectContent className="bg-[#18181B] border-white/10 text-white max-h-60">
                  <SelectItem value="all">전체 미션</SelectItem>
                  {missions.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={missionResetReason}
                onChange={(e) => setMissionResetReason(e.target.value)}
                placeholder="리셋 사유"
                className="w-40 bg-black/50 border-white/10"
              />
              <Button
                className="bg-red-500 hover:bg-red-600"
                onClick={() => {
                  const userId = parseInt(userMissionUserIdInput, 10);
                  if (userId > 0 && missionResetReason) {
                    resetUserMissionsMutation.mutate({
                      userId,
                      payload: {
                        mission_id: selectedMissionIdForReset,
                        reason: missionResetReason,
                      },
                    });
                  }
                }}
                disabled={resetUserMissionsMutation.isPending}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                리셋
              </Button>
            </div>
            {resetUserMissionsMutation.isSuccess &&
              resetUserMissionsMutation.data && (
                <div className="mt-3 text-sm text-emerald-400">
                  리셋 완료: {resetUserMissionsMutation.data.reset_count}개 미션
                </div>
              )}
          </CollapsibleSection>
        </TabsContent>

        {/* ─── Stats Tab ─── */}
        <TabsContent value="stats" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mission Stats */}
            <Card className="bg-[#18181B] border-white/5">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  미션 통계
                </CardTitle>
                <p className="text-xs text-zinc-500">
                  미션별 완료율 및 클레임 현황
                </p>
              </CardHeader>
              <CardContent>
                {isMissionStatsLoading ? (
                  <div className="flex items-center justify-center py-8 text-zinc-500">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    로딩 중...
                  </div>
                ) : missionStats ? (
                  <div className="space-y-4">
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-zinc-500">전체: </span>
                        <span className="font-bold text-zinc-200">
                          {missionStats.total_missions}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">활성: </span>
                        <span className="font-bold text-emerald-400">
                          {missionStats.active_missions}
                        </span>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {missionStats.stats.slice(0, 10).map((stat) => (
                        <div
                          key={stat.mission_id}
                          className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-zinc-200 truncate">
                              {stat.title}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {stat.category}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="text-center">
                              <div className="text-zinc-500">완료</div>
                              <div className="font-bold text-emerald-400">
                                {stat.completed_count}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-zinc-500">클레임</div>
                              <div className="font-bold text-indigo-400">
                                {stat.claimed_count}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-zinc-500">완료율</div>
                              <div className="font-bold text-yellow-400">
                                {(stat.completion_rate * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Login Mission Verify */}
            <Card className="bg-[#18181B] border-white/5">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="w-5 h-5 text-cyan-400" />
                  로그인 미션 검증
                </CardTitle>
                <p className="text-xs text-zinc-500">
                  오늘 로그인 미션 완료 현황
                </p>
              </CardHeader>
              <CardContent>
                {isLoginVerifyLoading ? (
                  <div className="flex items-center justify-center py-8 text-zinc-500">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    로딩 중...
                  </div>
                ) : loginVerifyData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded bg-black/30 border border-white/5">
                        <div className="text-xs text-zinc-500">전체</div>
                        <div className="text-lg font-bold text-zinc-200">
                          {loginVerifyData.total_users}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                        <div className="text-xs text-zinc-500">완료</div>
                        <div className="text-lg font-bold text-emerald-400">
                          {loginVerifyData.completed_today}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                        <div className="text-xs text-zinc-500">미완료</div>
                        <div className="text-lg font-bold text-red-400">
                          {loginVerifyData.not_completed_today}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                        <div className="text-xs text-zinc-500">완료율</div>
                        <div className="text-lg font-bold text-yellow-400">
                          {(loginVerifyData.completion_rate * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {loginVerifyData.users.slice(0, 10).map((user) => (
                        <div
                          key={user.user_id}
                          className="flex items-center justify-between p-2 rounded bg-black/30 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-400">
                              #{user.user_id}
                            </span>
                            <span className="text-zinc-200">
                              {user.nickname}
                            </span>
                          </div>
                          <Badge
                            className={
                              user.today_login_completed
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-zinc-500/20 text-zinc-400"
                            }
                          >
                            {user.today_login_completed ? "완료" : "미완료"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* Active User Stats */}
          <Card className="bg-[#18181B] border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-emerald-400" />
                활성 유저 통계
              </CardTitle>
              <p className="text-xs text-zinc-500">
                DAU / WAU / MAU 및 신규 가입자 현황
              </p>
            </CardHeader>
            <CardContent>
              {isActiveUserStatsLoading ? (
                <div className="flex items-center justify-center py-8 text-zinc-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  로딩 중...
                </div>
              ) : activeUserStats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-black/30 border border-white/5">
                      <div className="text-xs text-zinc-500">DAU (오늘)</div>
                      <div className="text-2xl font-bold text-emerald-400">
                        {activeUserStats.stats.dau.toLocaleString()}
                      </div>
                      <div
                        className={cn(
                          "text-xs",
                          activeUserStats.stats.dau_change >= 0
                            ? "text-emerald-400"
                            : "text-red-400",
                        )}
                      >
                        <TrendingUp className="w-3 h-3 inline mr-1" />
                        {activeUserStats.stats.dau_change >= 0 ? "+" : ""}
                        {(activeUserStats.stats.dau_change * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-black/30 border border-white/5">
                      <div className="text-xs text-zinc-500">WAU (7일)</div>
                      <div className="text-2xl font-bold text-indigo-400">
                        {activeUserStats.stats.wau.toLocaleString()}
                      </div>
                      <div
                        className={cn(
                          "text-xs",
                          activeUserStats.stats.wau_change >= 0
                            ? "text-emerald-400"
                            : "text-red-400",
                        )}
                      >
                        <TrendingUp className="w-3 h-3 inline mr-1" />
                        {activeUserStats.stats.wau_change >= 0 ? "+" : ""}
                        {(activeUserStats.stats.wau_change * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-black/30 border border-white/5">
                      <div className="text-xs text-zinc-500">MAU (30일)</div>
                      <div className="text-2xl font-bold text-yellow-400">
                        {activeUserStats.stats.mau.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-black/30 border border-white/5">
                      <div className="text-xs text-zinc-500">
                        신규 (오늘/이번주)
                      </div>
                      <div className="text-xl font-bold text-cyan-400">
                        {activeUserStats.stats.new_users_today} /{" "}
                        {activeUserStats.stats.new_users_this_week}
                      </div>
                    </div>
                  </div>

                  {/* 7-day DAU Trend */}
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-zinc-300">
                      7일 DAU 추이
                    </div>
                    <div className="flex items-end gap-1 h-24 p-4 rounded-lg bg-black/30 border border-white/5">
                      {activeUserStats.trend.map((day, idx) => {
                        const maxDau = Math.max(
                          ...activeUserStats.trend.map((d) => d.dau),
                          1,
                        );
                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center gap-1"
                          >
                            <div
                              className={cn(
                                "w-full bg-emerald-500/50 rounded-t",
                                styles.trendBar,
                                getTrendHeightClass(day.dau, maxDau),
                              )}
                              title={`${day.date}: ${day.dau}명`}
                            />
                            <div className="text-[10px] text-zinc-500">
                              {day.date.slice(5)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Create Mission Dialog ─── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
                <Select
                  value={selectedPreset}
                  onValueChange={(val) => {
                    setSelectedPreset(val);
                    const recommendedActionType =
                      PRESET_RECOMMENDED_ACTION_TYPE[val];
                    const presetCategory = getPresetCategory(val);
                    const newTarget = createForm.targetValue;
                    const newLogicKey = generateLogicKey(
                      val,
                      presetCategory,
                      newTarget,
                    );
                    const newTitle = generateTitle(
                      val,
                      presetCategory,
                      newTarget,
                    );
                    setCreateForm({
                      ...createForm,
                      category: presetCategory,
                      logicKey: newLogicKey,
                      title: newTitle,
                      actionType:
                        recommendedActionType || createForm.actionType,
                    });
                  }}
                >
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
                      setCreateForm({
                        ...createForm,
                        condition: e.target.value,
                      })
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

            {/* Right Column: Preview */}
            <div className="space-y-4">
              {renderMissionPreview({
                category: createForm.category,
                logicKey: createForm.logicKey,
                actionType: createForm.actionType,
                targetValue: createForm.targetValue,
              })}

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
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {createMutation.isPending ? (
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

      {/* ─── Edit Mission Dialog ─── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl bg-[#09090B] border-white/10 text-white overflow-hidden max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-indigo-400" />
                  미션 편집
                </DialogTitle>
                <DialogDescription>
                  MISSION_ID: #{editForm?.id}
                </DialogDescription>
              </div>
              {editForm && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-[10px] text-zinc-500 uppercase">
                    상태
                  </span>
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
              )}
            </div>
          </DialogHeader>

          {editForm && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {/* Left Column */}
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

              {/* Right Column: Preview */}
              <div className="space-y-4">
                {renderMissionPreview({
                  category: editForm.category,
                  logicKey: editForm.logicKey,
                  actionType: editForm.actionType,
                  targetValue: editForm.targetValue,
                })}

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
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500"
            >
              {updateMutation.isPending ? (
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
    </div>
  );
}

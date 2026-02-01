import { useState, useMemo } from "react";
import {
  useAdminMissions,
  useAdminUpdateMission,
  useAdminCreateMission,
  useAdminDeleteMission,
} from "../../../hooks/useAdminGame";
import { cn } from "../../../lib/utils";
import { type AdminMissionDto } from "../../../api/adminApi";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Plus,
  Users,
  Target,
  ListChecks,
  UserCog,
  PieChart,
  CheckCircle2,
  Loader2,
} from "lucide-react";

// 분리된 컴포넌트들 import
import {
  QuickStat,
  MissionCard,
  UsersTabContent,
  StatsTabContent,
  CreateMissionDialog,
  EditMissionDialog,
} from "./mission/components";
import { StreakRulesSection } from "./mission/components/StreakRulesSection";

// 상수 import
import { CATEGORIES, CATEGORY_COLORS } from "./mission/constants/missionConstants";
import { normalizeLogicKey } from "./mission/utils/missionHelpers";
import { useAdminLoginMissionVerify, useAdminActiveUserStats } from "../../../hooks/useAdminGame";
import type { CreateMissionForm } from "./mission/types";

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export default function MissionManagerPage() {
  // ─── API Hooks ───
  const { data: missions = [], isLoading } = useAdminMissions();
  const updateMutation = useAdminUpdateMission();
  const createMutation = useAdminCreateMission();
  const deleteMutation = useAdminDeleteMission();

  // Stats (for QuickStat in header)
  const { data: loginVerifyData } = useAdminLoginMissionVerify({ limit: 20 });
  const { data: activeUserStats } = useAdminActiveUserStats(7);

  // UI State
  const [mainTab, setMainTab] = useState<"missions" | "users" | "stats">("missions");
  const [categoryTab, setCategoryTab] = useState("DAILY");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<AdminMissionDto | null>(null);

  // ─── Computed Values ───
  const filteredMissions = useMemo(
    () => missions.filter((m) => m.category === categoryTab),
    [missions, categoryTab]
  );

  const missionCounts = useMemo(
    () => ({
      total: missions.length,
      active: missions.filter((m) => m.isActive).length,
    }),
    [missions]
  );

  // ─── Handlers ───
  const handleCreate = (form: CreateMissionForm) => {
    const nextLogicKey = normalizeLogicKey(form.logicKey);
    createMutation.mutate(
      { ...form, logicKey: nextLogicKey },
      {
        onSuccess: () => setIsCreateOpen(false),
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("정말 이 미션을 삭제하시겠습니까?")) {
      deleteMutation.mutate(id);
    }
  };

  const openEdit = (mission: AdminMissionDto) => {
    setEditForm({ ...mission });
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editForm) return;
    const nextLogicKey = normalizeLogicKey(editForm.logicKey);
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
        onSuccess: () => setIsEditOpen(false),
      }
    );
  };

  const handleUpdate = (id: number, field: keyof AdminMissionDto, value: unknown) => {
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
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">미션 관리</h1>
          <p className="text-sm text-zinc-400 mt-1">미션 설정, 유저 진행 관리, 통계 분석</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
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
          value={loginVerifyData ? `${(loginVerifyData.completion_rate * 100).toFixed(0)}%` : "-"}
          icon={<Target className="w-4 h-4 text-amber-400" />}
          color="bg-amber-500/5 border-amber-500/20"
        />
      </div>

      {/* ─── Main Tabs ─── */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)} className="w-full">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 bg-[#18181B] border border-white/5">
          <TabsTrigger value="missions" className="gap-2 data-[state=active]:bg-zinc-800">
            <ListChecks className="w-4 h-4" />
            <span className="hidden sm:inline">미션 설정</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-zinc-800">
            <UserCog className="w-4 h-4" />
            <span className="hidden sm:inline">유저 관리</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2 data-[state=active]:bg-zinc-800">
            <PieChart className="w-4 h-4" />
            <span className="hidden sm:inline">통계 분석</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Missions Tab ─── */}
        <TabsContent value="missions" className="space-y-6 mt-6">
          {/* Category Tabs */}
          <Tabs value={categoryTab} onValueChange={setCategoryTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-[#18181B] border border-white/5">
              {CATEGORIES.map((cat) => {
                const count = missions.filter((m) => m.category === cat).length;
                const style = CATEGORY_COLORS[cat] ?? {
                  bg: "bg-emerald-500/10",
                  text: "text-emerald-400",
                  border: "border-emerald-500/20",
                };
                return (
                  <TabsTrigger
                    key={cat}
                    value={cat}
                    className={cn("gap-2 data-[state=active]:bg-zinc-800", `data-[state=active]:${style.text}`)}
                  >
                    {cat}
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-white/5">
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
                  <Button variant="link" className="text-emerald-400 mt-2" onClick={() => setIsCreateOpen(true)}>
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
                    onToggleActive={(active) => handleUpdate(mission.id, "isActive", active)}
                    onDuplicate={() => handleDuplicate(mission)}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>

          {/* Streak Rules Section */}
          <StreakRulesSection />
        </TabsContent>

        {/* ─── Users Tab ─── */}
        <TabsContent value="users" className="space-y-6 mt-6">
          <UsersTabContent missions={missions} />
        </TabsContent>

        {/* ─── Stats Tab ─── */}
        <TabsContent value="stats" className="space-y-6 mt-6">
          <StatsTabContent />
        </TabsContent>
      </Tabs>

      {/* ─── Dialogs ─── */}
      <CreateMissionDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
        missions={missions}
      />
      <EditMissionDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        editForm={editForm}
        setEditForm={setEditForm}
        onSubmit={handleSaveEdit}
        isPending={updateMutation.isPending}
        missions={missions}
      />
    </div>
  );
}

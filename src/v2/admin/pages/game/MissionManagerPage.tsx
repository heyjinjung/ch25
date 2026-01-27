import { useState } from "react";
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
} from "../../../hooks/useAdminGame";
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
import { Card } from "../../../components/ui/card";
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
  DialogFooter,
  DialogDescription,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Ticket, Gift, Coins, Plus, Trash2, Edit2 } from "lucide-react";
import { REWARD_ITEMS } from "../../../constants/rewardItems";

/**
 * V2 SoT-compliant mission reward options
 * 근거: docs/v2_specs/01_core/v2_reward_type_standard_sot_ko.md
 */
// Mapped for Backend MissionRewardType Enum match
const REWARD_TYPE_MAPPING: Record<string, string> = {
  ROULETTE_TICKET: "TICKET_ROULETTE",
  DICE_TICKET: "TICKET_DICE",
  LOTTERY_TICKET: "TICKET_LOTTERY",
  GOLD_KEY_TICKET: "GOLD_KEY",
  DIAMOND_TICKET: "DIAMOND_KEY",
};

const MISSION_REWARD_OPTIONS = REWARD_ITEMS.map((item) => ({
  ...item,
  value: REWARD_TYPE_MAPPING[item.value] || item.value,
}));

// Mock Categories for Tabs
// BE MissionCategory enum: DAILY/WEEKLY/NEW_USER/SPECIAL
const CATEGORIES = ["DAILY", "WEEKLY", "NEW_USER", "SPECIAL"];

const ACTION_TYPE_OPTIONS = [
  { value: "PLAY_GAME", label: "게임 플레이 (PLAY_GAME)" },
  { value: "LOGIN", label: "로그인/출석 (LOGIN)" },
  { value: "JOIN_CHANNEL", label: "채널 입장 (JOIN_CHANNEL)" },
  { value: "SHARE_STORY", label: "스토리 공유 (SHARE_STORY)" },
  { value: "INVITE_FRIEND", label: "친구 초대 (INVITE_FRIEND)" },
  { value: "BUY_SHOP_ITEM", label: "상점 아이템 구매 (BUY_SHOP_ITEM)" },
];

const LOGIC_KEY_PRESETS = [
  { value: "daily_play_generic", label: "일일 게임 플레이 (Generic)" },
  { value: "daily_shop_purchase", label: "일일 상점 구매 (Shop Buy)" },
  { value: "streak_challenge_3", label: "3일 연속 출석/플레이 (Streak)" },
  { value: "daily_login_gift", label: "일일 출석 선물 (Fixed)" },
  { value: "golden_hour", label: "골든 아워 (Golden Hour)" },
];

const isGoldenHourLogicKey = (logicKey: string) =>
  String(logicKey || "")
    .toLowerCase()
    .includes("golden_hour");

const getCategoryMeaning = (category: string) => {
  const cat = String(category || "").toUpperCase();
  if (cat === "DAILY") return "일일(09:00 KST 리셋)";
  if (cat === "WEEKLY") return "주간(ISO Week 리셋)";
  if (cat === "NEW_USER") return "신규 유저(가입 7일 이내)만 진행";
  if (cat === "SPECIAL") return "스페셜(리셋 없음 / NON_RESET)";
  return cat;
};

const PRESET_RECOMMENDED_ACTION_TYPE: Record<string, string | undefined> = {
  daily_play_generic: "PLAY_GAME",
  daily_shop_purchase: "BUY_SHOP_ITEM",
  daily_login_gift: "LOGIN",
  golden_hour: "PLAY_GAME",
  streak_challenge_3: "LOGIN",
};

// 프리셋 한글 라벨 (자동 제목 생성용)
const PRESET_TITLE_LABELS: Record<string, string> = {
  daily_play_generic: "게임 플레이",
  daily_shop_purchase: "상점 구매",
  daily_login_gift: "출석 선물",
  golden_hour: "골든아워 게임",
  streak_challenge_3: "연속 출석",
};

// 카테고리 한글 접두어
const CATEGORY_PREFIX: Record<string, string> = {
  DAILY: "일일",
  WEEKLY: "주간",
  NEW_USER: "신규",
  SPECIAL: "스페셜",
};

/**
 * 프리셋 + 카테고리 + 목표값으로 고유 logicKey 자동 생성
 * 예: daily_play_generic + DAILY + 5 → DAILY_PLAY_GENERIC_5
 */
const generateLogicKey = (
  preset: string,
  category: string,
  targetValue: number,
) => {
  const base = String(preset || "custom").toUpperCase();
  const cat = String(category || "DAILY").toUpperCase();
  const tv = Math.max(1, Math.floor(Number(targetValue) || 1));
  return `${cat}_${base}_${tv}`;
};

/**
 * 프리셋 + 카테고리 + 목표값으로 제목 자동 생성
 * 예: daily_play_generic + DAILY + 5 → "일일 게임 플레이 5회"
 */
const generateTitle = (
  preset: string,
  category: string,
  targetValue: number,
) => {
  const catLabel = CATEGORY_PREFIX[category] || category;
  const presetLabel = PRESET_TITLE_LABELS[preset] || "미션";
  const tv = Math.max(1, Math.floor(Number(targetValue) || 1));
  return `${catLabel} ${presetLabel} ${tv}회`;
};

export default function MissionManagerPage() {
  const { data: missions = [], isLoading } = useAdminMissions();
  const updateMutation = useAdminUpdateMission();
  const createMutation = useAdminCreateMission();
  const deleteMutation = useAdminDeleteMission();
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

  const [activeTab, setActiveTab] = useState("DAILY");
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

  const { data: userMissions = [], isLoading: isUserMissionsLoading } =
    useAdminUserMissionHistory(userMissionUserId ?? undefined);
  const forceCompleteMutation = useAdminForceCompleteMission();
  const updateProgressMutation = useAdminUpdateUserMissionProgress();
  const resetProgressMutation = useAdminResetUserMissionProgress();
  const claimRewardMutation = useAdminClaimUserMissionReward();

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

  /**
   * 논리적 중복 검사: 같은 카테고리 + 같은 액션타입 + 같은 목표값이면 중복
   * logicKey가 달라도 실제로는 같은 미션이므로 경고
   */
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

  const normalizeLogicKey = (value: string) =>
    String(value || "")
      .trim()
      .toUpperCase();

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

    // 1. logicKey 중복 검사
    const keyConflict = findLogicKeyConflict(nextLogicKey);
    if (keyConflict) {
      setCreateError(
        `이미 사용 중인 로직 키입니다. (충돌: ${keyConflict.category} / ${keyConflict.title})`,
      );
      return;
    }

    // 2. 논리적 중복 검사 (같은 카테고리+액션+목표값)
    const logicalDup = findLogicalDuplicate(
      createForm.category,
      createForm.actionType,
      createForm.targetValue,
    );
    if (logicalDup) {
      setCreateError(
        `동일한 조건의 미션이 이미 존재합니다: "${logicalDup.title}" (${logicalDup.category}, 목표 ${logicalDup.targetValue})`,
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

  // Filter missions by active tab
  const filteredMissions = missions.filter((m) => m.category === activeTab);

  const renderMissionAssemblyPreview = (vars: {
    category: string;
    logicKey: string;
    actionType?: string | null;
    targetValue: number;
    condition?: string | null;
  }) => {
    const golden = isGoldenHourLogicKey(vars.logicKey);
    const action = String(vars.actionType || "").trim() || "(없음)";
    const catMeaning = getCategoryMeaning(vars.category);
    const warnings: string[] = [];

    if (golden && action !== "PLAY_GAME") {
      warnings.push(
        "골든아워 미션은 logicKey에 golden_hour 포함으로 판정됩니다. 게임플레이 기반이면 Action Type=PLAY_GAME를 권장합니다.",
      );
    }
    if (vars.category === "DAILY" && !action) {
      warnings.push(
        "DAILY는 리셋 정책(09:00 KST)이며, 트리거는 Action Type로 결정됩니다.",
      );
    }

    return (
      <div className="col-span-4 mt-2 rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="text-xs font-semibold text-zinc-200">
          미션 조립 프리뷰
        </div>
        <div className="mt-2 grid gap-1 text-xs text-zinc-300">
          <div>
            <span className="text-zinc-400">카테고리(리셋):</span> {catMeaning}
          </div>
          <div>
            <span className="text-zinc-400">트리거(Action Type):</span> {action}
            <span className="ml-2 text-zinc-500">
              (게임 3종은 BE에서 update_progress("PLAY_GAME") 호출)
            </span>
          </div>
          <div>
            <span className="text-zinc-400">logicKey(전역 UNIQUE):</span>{" "}
            {normalizeLogicKey(vars.logicKey) || "(없음)"}
          </div>
          <div>
            <span className="text-zinc-400">목표:</span>{" "}
            {Number(vars.targetValue || 0).toLocaleString()}
          </div>
          <div>
            <span className="text-zinc-400">설명(표시용):</span>{" "}
            {vars.condition?.trim() || "(비어있음)"}
            <span className="ml-2 text-zinc-500">(실제 로직 조건이 아님)</span>
          </div>
          <div>
            <span className="text-zinc-400">골든아워 판정:</span>{" "}
            {golden ? "YES (logicKey contains golden_hour)" : "NO"}
          </div>
        </div>
        {warnings.length > 0 && (
          <div className="mt-2 rounded-md border border-amber-400/20 bg-amber-500/10 p-2 text-xs text-amber-200">
            {warnings[0]}
          </div>
        )}
        <div className="mt-2 text-[11px] text-zinc-500">
          핵심: 카테고리=리셋정책, Action Type=진행 트리거, logicKey=식별자(전역
          UNIQUE). 골든하워는 별도 스케줄이 아니라 logicKey 규칙+설정값으로
          게이트됩니다.
        </div>
      </div>
    );
  };

  const handleUpdate = (
    id: number,
    field: keyof AdminMissionDto,
    value: any,
  ) => {
    updateMutation.mutate({ id, data: { [field]: value } });
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      // V2 SoT: Game Tickets (MissionRewardType)
      case "TICKET_ROULETTE":
      case "TICKET_DICE":
      case "TICKET_LOTTERY":
      case "ROULETTE_TICKET": // Fallback
      case "DICE_TICKET":
      case "LOTTERY_TICKET":
        return <Ticket className="w-4 h-4 text-emerald-400" />;
      // V2 SoT: Vault
      case "VAULT":
        return <Coins className="w-4 h-4 text-yellow-400" />;
      // V2 SoT: Currency
      case "DIAMOND":
        return <Coins className="w-4 h-4 text-sky-400" />;
      // V2 SoT: Premium Tickets (MissionRewardType)
      case "GOLD_KEY":
      case "DIAMOND_KEY":
      case "GOLD_KEY_TICKET": // Fallback
      case "DIAMOND_TICKET":
        return <Gift className="w-4 h-4 text-purple-400" />;
      // V2 SoT: Fragments
      case "GOLD_KEY_FRAGMENT":
      case "DIAMOND_FRAGMENT":
        return <Gift className="w-4 h-4 text-amber-400" />;
      // V2 SoT: Puzzle Pieces
      case "PUZZLE_C1":
      case "PUZZLE_C2":
      case "PUZZLE_J":
      case "PUZZLE_M":
        return <Gift className="w-4 h-4 text-indigo-400" />;
      // V2 SoT: Gifticons
      case "CHICKEN_GIFTICON_5000":
      case "CHICKEN_GIFTICON_10000":
      case "STARBUCKS_GIFTICON_2000":
      case "STARBUCKS_GIFTICON_10000":
      case "PIZZA_GIFTICON_5000":
      case "PIZZA_GIFTICON_10000":
      case "GOOGLE_GIFTICON_5000":
      case "GOOGLE_GIFTICON_10000":
      case "GIFTICON_BAEMIN":
      case "GIFTICON_COMPOSE":
        return <Gift className="w-4 h-4 text-pink-400" />;
      // V2 SoT: Special
      case "NONE":
        return null;
      case "POINT":
      case "CC_POINT":
        return <Coins className="w-4 h-4 text-yellow-400 opacity-80" />;
      default:
        return null;
    }
  };

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
        setUserMissionNotice(null);
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
      setUserMissionNotice(null);
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
      setUserMissionNotice(null);
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
    setUserMissionError(null);
    setUserMissionNotice(null);
    resetProgressMutation.mutate({ userId: userMissionUserId, missionId });
  };

  const handleForceComplete = (missionId: number) => {
    if (!userMissionUserId) return;
    setUserMissionError(null);
    setUserMissionNotice(null);
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
      const rewardAmount = res.rewardAmount ?? 0;
      setUserMissionNotice(`${rewardLabel} ${rewardAmount} 지급 완료`);
    } catch {
      setUserMissionError("보상 지급 실패");
    }
  };

  return (
    <div className="space-y-6 text-white p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            미션 관리 (Mission Ops)
          </h1>
          <p className="text-sm text-zinc-400">
            데일리 미션 리스트 및 보상을 설정합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          >
            Active Season 25
          </Badge>
          <Button
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="w-4 h-4" />
            미션 생성
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <Tabs
          defaultValue="DAILY"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4 bg-[#18181B] border border-white/5">
            {CATEGORIES.map((cat) => (
              <TabsTrigger
                key={cat}
                value={cat}
                className="data-[state=active]:bg-zinc-800"
              >
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-4">
            {isLoading ? (
              <div className="text-center py-20 text-zinc-500">
                Loading missions...
              </div>
            ) : filteredMissions.length === 0 ? (
              <div className="text-center py-20 text-zinc-500 border border-dashed border-white/10 rounded-xl">
                등록된 미션이 없습니다.
              </div>
            ) : (
              filteredMissions.map((mission) => (
                <Card
                  key={mission.id}
                  className="bg-[#18181B] border-white/5 transition-all hover:border-white/10"
                >
                  <div className="flex items-center p-4 gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-base text-zinc-200">
                          {mission.title}
                        </h4>
                        {!mission.isActive && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5"
                          >
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {mission.condition}
                      </p>
                    </div>

                    {/* Reward Config */}
                    <div className="flex items-center gap-3 bg-black/30 px-4 py-3 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2 min-w-[160px]">
                        {getRewardIcon(mission.rewardType)}
                        <Select
                          defaultValue={mission.rewardType}
                          onValueChange={(val) =>
                            handleUpdate(mission.id, "rewardType", val)
                          }
                        >
                          <SelectTrigger className="h-9 text-sm bg-transparent border-none font-medium text-zinc-200 hover:text-white focus:ring-0 focus:ring-offset-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#18181B] border-white/10 text-white max-h-[300px]">
                            {MISSION_REWARD_OPTIONS.map((item) => (
                              <SelectItem
                                key={item.value}
                                value={item.value}
                                className="text-sm py-2.5 cursor-pointer hover:bg-white/5 focus:bg-white/10"
                              >
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="h-9 w-24 text-right bg-black/50 border-white/10 text-sm font-mono text-white focus:border-emerald-500/50 focus-visible:ring-1 focus-visible:ring-emerald-500/20"
                          defaultValue={mission.rewardAmount}
                          onBlur={(e) =>
                            handleUpdate(
                              mission.id,
                              "rewardAmount",
                              parseInt(e.target.value),
                            )
                          }
                        />
                        <span className="text-xs text-zinc-500 font-medium">
                          개
                        </span>
                      </div>
                    </div>

                    <Switch
                      checked={mission.isActive}
                      onCheckedChange={(checked) =>
                        handleUpdate(mission.id, "isActive", checked)
                      }
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10"
                      onClick={() => openEdit(mission)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDelete(mission.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Card className="bg-[#18181B] border-white/5">
        <div className="p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              유저 미션 관리
            </h2>
            <p className="text-xs text-zinc-500">
              진행값 수정/리셋, 강제 완료, 보상 지급을 지원합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={userMissionUserIdInput}
              onChange={(e) => setUserMissionUserIdInput(e.target.value)}
              placeholder="유저 ID 또는 닉네임"
              className="w-40 bg-black/50 border-white/10"
            />
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={handleLoadUserMissions}
            >
              조회
            </Button>
            {userMissionUserId && (
              <Badge
                variant="outline"
                className="bg-white/5 text-zinc-300 border-white/10"
              >
                {userMissionUserLabel || `USER #${userMissionUserId}`}
              </Badge>
            )}
          </div>

          {userMissionError && (
            <p className="text-xs text-red-400">{userMissionError}</p>
          )}
          {userMissionNotice && (
            <p className="text-xs text-emerald-400">{userMissionNotice}</p>
          )}

          {isUserMissionsLoading ? (
            <div className="text-sm text-zinc-500">미션 로딩 중...</div>
          ) : userMissionUserId && userMissions.length === 0 ? (
            <div className="text-sm text-zinc-500">
              유저 미션 기록이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {userMissions.map((mission) => (
                <div
                  key={mission.id}
                  className="flex flex-col gap-3 rounded-lg border border-white/5 bg-black/30 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-200">
                        {mission.missionTitle}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {mission.category} · {mission.progress}/
                        {mission.maxProgress}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-white/5 text-zinc-300 border-white/10"
                    >
                      {mission.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={
                        progressEdits[mission.missionId] ??
                        String(mission.progress)
                      }
                      onChange={(e) =>
                        handleProgressChange(mission.missionId, e.target.value)
                      }
                      className="w-28 bg-black/50 border-white/10 text-right"
                      type="number"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        handleSaveProgress(mission.missionId, mission.progress)
                      }
                    >
                      진행값 저장
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
                      강제 완료
                    </Button>
                    <Button
                      size="sm"
                      className="bg-indigo-500/90 hover:bg-indigo-500 text-white"
                      onClick={() => handleClaimReward(mission.missionId)}
                    >
                      보상 지급
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>새 미션 생성</DialogTitle>
            <DialogDescription className="text-zinc-400">
              신규 미션의 기본 정보와 보상을 설정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Step 1: 프리셋 선택 (가장 먼저) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-zinc-400 font-semibold">
                1. 프리셋
              </Label>
              <Select
                value={selectedPreset}
                onValueChange={(val) => {
                  setSelectedPreset(val);
                  const recommendedActionType =
                    PRESET_RECOMMENDED_ACTION_TYPE[val];
                  const newLogicKey = generateLogicKey(
                    val,
                    createForm.category,
                    createForm.targetValue,
                  );
                  const newTitle = generateTitle(
                    val,
                    createForm.category,
                    createForm.targetValue,
                  );
                  setCreateForm({
                    ...createForm,
                    logicKey: newLogicKey,
                    title: newTitle,
                    actionType: recommendedActionType || createForm.actionType,
                  });
                }}
              >
                <SelectTrigger className="col-span-3 bg-emerald-500/10 border-emerald-500/30">
                  <SelectValue placeholder="프리셋을 먼저 선택하세요..." />
                </SelectTrigger>
                <SelectContent className="bg-[#18181B] border-white/10 text-white">
                  {LOGIC_KEY_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: 카테고리 선택 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right text-zinc-400">
                2. 카테고리
              </Label>
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
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#18181B] border-white/10 text-white">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat} ({getCategoryMeaning(cat)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3: 제목 (자동 생성되지만 수정 가능) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right text-zinc-400">
                3. 제목
              </Label>
              <Input
                id="title"
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm({ ...createForm, title: e.target.value })
                }
                className="col-span-3"
                placeholder="자동 생성됨 (수정 가능)"
              />
            </div>

            {/* 로직 키 (자동 생성, 읽기 전용 표시) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="logicKey" className="text-right text-zinc-400">
                로직 키
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="logicKey"
                  value={createForm.logicKey}
                  readOnly
                  className="bg-white/5 border-white/10 text-zinc-400 cursor-not-allowed"
                />
                <span className="text-xs text-zinc-500 whitespace-nowrap">
                  자동 생성
                </span>
              </div>
            </div>

            {createError && (
              <div className="col-span-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                ⚠️ {createError}
              </div>
            )}

            {/* Step 4: 목표 횟수 (변경 시 logicKey와 제목 자동 업데이트) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="targetValue"
                className="text-right text-zinc-400 font-semibold"
              >
                4. 목표 횟수
              </Label>
              <Input
                id="targetValue"
                type="number"
                min={1}
                value={createForm.targetValue}
                onChange={(e) => {
                  const newTarget = Math.max(1, parseInt(e.target.value) || 1);
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
                className="col-span-3 bg-emerald-500/10 border-emerald-500/30"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="actionType" className="text-right text-zinc-400">
                Action Type
              </Label>
              <Select
                value={createForm.actionType || "PLAY_GAME"}
                onValueChange={(val) =>
                  setCreateForm({ ...createForm, actionType: val })
                }
              >
                <SelectTrigger className="col-span-3">
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

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="condition" className="text-right text-zinc-400">
                설명(표시용)
              </Label>
              <Input
                id="condition"
                value={createForm.condition}
                onChange={(e) =>
                  setCreateForm({ ...createForm, condition: e.target.value })
                }
                className="col-span-3"
                placeholder="유저에게 보여지는 설명 (선택사항)"
              />
            </div>

            {renderMissionAssemblyPreview({
              category: createForm.category,
              logicKey: createForm.logicKey,
              actionType: createForm.actionType,
              targetValue: createForm.targetValue,
              condition: createForm.condition,
            })}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reward" className="text-right text-zinc-400">
                보상
              </Label>
              <div className="col-span-3 flex gap-2">
                <Select
                  value={createForm.rewardType}
                  onValueChange={(val) =>
                    setCreateForm({ ...createForm, rewardType: val })
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-white/10 text-white max-h-[200px]">
                    {MISSION_REWARD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  className="w-24"
                  value={createForm.rewardAmount}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      rewardAmount: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>미션 편집</DialogTitle>
            <DialogDescription className="text-zinc-400">
              기존 미션의 조건/보상을 수정합니다.
            </DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-zinc-400">카테고리</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(val) =>
                    setEditForm({ ...editForm, category: val as any })
                  }
                >
                  <SelectTrigger className="col-span-3">
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

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-zinc-400">제목</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-zinc-400">로직 키</Label>
                <Input
                  value={editForm.logicKey}
                  onChange={(e) =>
                    setEditForm({ ...editForm, logicKey: e.target.value })
                  }
                  className="col-span-3"
                />
                <div className="col-start-2 col-span-3">
                  <Select
                    onValueChange={(val) => {
                      const recommendedActionType =
                        PRESET_RECOMMENDED_ACTION_TYPE[val];
                      setEditForm({
                        ...editForm,
                        logicKey: val,
                        actionType:
                          recommendedActionType || editForm.actionType,
                      });
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10">
                      <SelectValue placeholder="프리셋 선택..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#18181B] border-white/10 text-white">
                      {LOGIC_KEY_PRESETS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-zinc-400">Action Type</Label>
                <Select
                  value={editForm.actionType || "PLAY_GAME"}
                  onValueChange={(val) =>
                    setEditForm({ ...editForm, actionType: val })
                  }
                >
                  <SelectTrigger className="col-span-3">
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
              {editError && (
                <p className="text-xs text-red-400 text-right">{editError}</p>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-zinc-400">설명(표시용)</Label>
                <Input
                  value={editForm.condition}
                  onChange={(e) =>
                    setEditForm({ ...editForm, condition: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>

              {renderMissionAssemblyPreview({
                category: editForm.category,
                logicKey: editForm.logicKey,
                actionType: editForm.actionType,
                targetValue: editForm.targetValue,
                condition: editForm.condition,
              })}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-zinc-400">목표 점수</Label>
                <Input
                  type="number"
                  value={editForm.targetValue}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      targetValue: parseInt(e.target.value),
                    })
                  }
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-zinc-400">보상</Label>
                <div className="col-span-3 flex gap-2">
                  <Select
                    value={editForm.rewardType}
                    onValueChange={(val) =>
                      setEditForm({ ...editForm, rewardType: val })
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#18181B] border-white/10 text-white max-h-[200px]">
                      {MISSION_REWARD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    className="w-24"
                    value={editForm.rewardAmount}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        rewardAmount: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Switch
                  checked={editForm.isActive}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, isActive: checked })
                  }
                />
                <span className="ml-2 text-sm text-zinc-400">활성</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsEditOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              취소
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

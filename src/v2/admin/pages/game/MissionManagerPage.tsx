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
  { value: "PLAY_DICE", label: "주사위 게임 (PLAY_DICE)" },
  { value: "PLAY_ROULETTE", label: "룰렛 게임 (PLAY_ROULETTE)" },
  { value: "PLAY_LOTTERY", label: "복권 게임 (PLAY_LOTTERY)" },
  { value: "LOGIN", label: "로그인/출석 (LOGIN)" },
  { value: "GOLDEN_HOUR_PLAY", label: "골든아워 참가 (GOLDEN_HOUR_PLAY)" },
  { value: "BUY_SHOP_ITEM", label: "상점 구매 (BUY_SHOP_ITEM)" },
  { value: "CC_DEPOSIT", label: "CC 입금 (CC_DEPOSIT)" },
  {
    value: "JOIN_TELEGRAM_CHANNEL",
    label: "텔레그램 채널 입장 (JOIN_TELEGRAM_CHANNEL)",
  },
  { value: "JOIN_CC_CHANNEL", label: "CC 공식채널 입장 (JOIN_CC_CHANNEL)" },
  { value: "CONSECUTIVE_LOGIN", label: "다음날 로그인 (CONSECUTIVE_LOGIN)" },
  { value: "JOIN_CHANNEL", label: "채널 입장 (JOIN_CHANNEL)" },
  { value: "SHARE_STORY", label: "스토리 공유 (SHARE_STORY)" },
  { value: "INVITE_FRIEND", label: "친구 초대 (INVITE_FRIEND)" },
];

/**
 * 프리셋 목록 - 카테고리별로 분류
 * DAILY: 일일 미션
 * WEEKLY: 주간 미션
 * NEW_USER: 신규 유저 전용
 * SPECIAL: 특수 미션
 */
const LOGIC_KEY_PRESETS = [
  // ── DAILY 프리셋 ──
  {
    value: "daily_play_generic",
    label: "📅 일일 | 게임 플레이 (전체)",
    category: "DAILY",
  },
  {
    value: "daily_play_dice",
    label: "📅 일일 | 주사위 게임",
    category: "DAILY",
  },
  {
    value: "daily_play_roulette",
    label: "📅 일일 | 룰렛 게임",
    category: "DAILY",
  },
  {
    value: "daily_play_lottery",
    label: "📅 일일 | 복권 게임",
    category: "DAILY",
  },
  {
    value: "daily_golden_hour",
    label: "📅 일일 | 골든아워 참가",
    category: "DAILY",
  },
  {
    value: "daily_shop_purchase",
    label: "📅 일일 | 상점 구매",
    category: "DAILY",
  },
  {
    value: "daily_login_gift",
    label: "📅 일일 | 출석 체크",
    category: "DAILY",
  },
  { value: "daily_cc_deposit", label: "📅 일일 | CC 입금", category: "DAILY" },
  // ── WEEKLY 프리셋 ──
  {
    value: "weekly_play_generic",
    label: "📆 주간 | 게임 플레이 (전체)",
    category: "WEEKLY",
  },
  {
    value: "weekly_play_dice",
    label: "📆 주간 | 주사위 게임",
    category: "WEEKLY",
  },
  {
    value: "weekly_play_roulette",
    label: "📆 주간 | 룰렛 게임",
    category: "WEEKLY",
  },
  {
    value: "weekly_play_lottery",
    label: "📆 주간 | 복권 게임",
    category: "WEEKLY",
  },
  {
    value: "weekly_golden_hour",
    label: "📆 주간 | 골든아워 참가",
    category: "WEEKLY",
  },
  {
    value: "weekly_shop_purchase",
    label: "📆 주간 | 상점 구매",
    category: "WEEKLY",
  },
  {
    value: "weekly_login_streak",
    label: "📆 주간 | 로그인",
    category: "WEEKLY",
  },
  {
    value: "weekly_cc_deposit",
    label: "📆 주간 | CC 입금",
    category: "WEEKLY",
  },
  // ── NEW_USER 프리셋 ──
  {
    value: "new_user_first_login",
    label: "🆕 신규 | 첫 로그인",
    category: "NEW_USER",
  },
  {
    value: "new_user_first_game",
    label: "🆕 신규 | 첫 게임 플레이",
    category: "NEW_USER",
  },
  {
    value: "new_user_telegram_join",
    label: "🆕 신규 | 텔레그램 채널 입장",
    category: "NEW_USER",
  },
  {
    value: "new_user_cc_channel_join",
    label: "🆕 신규 | CC 공식채널 입장",
    category: "NEW_USER",
  },
  {
    value: "new_user_next_day_login",
    label: "🆕 신규 | 다음날 로그인",
    category: "NEW_USER",
  },
  // ── SPECIAL 프리셋 ──
  {
    value: "streak_challenge_3",
    label: "⭐ 스페셜 | 3일 연속 출석",
    category: "SPECIAL",
  },
  {
    value: "golden_hour",
    label: "⭐ 스페셜 | 골든아워 (레거시)",
    category: "SPECIAL",
  },
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

/**
 * 프리셋 → 추천 액션타입 매핑
 */
const PRESET_RECOMMENDED_ACTION_TYPE: Record<string, string | undefined> = {
  // DAILY
  daily_play_generic: "PLAY_GAME",
  daily_play_dice: "PLAY_DICE",
  daily_play_roulette: "PLAY_ROULETTE",
  daily_play_lottery: "PLAY_LOTTERY",
  daily_golden_hour: "GOLDEN_HOUR_PLAY",
  daily_shop_purchase: "BUY_SHOP_ITEM",
  daily_login_gift: "LOGIN",
  daily_cc_deposit: "CC_DEPOSIT",
  // WEEKLY
  weekly_play_generic: "PLAY_GAME",
  weekly_play_dice: "PLAY_DICE",
  weekly_play_roulette: "PLAY_ROULETTE",
  weekly_play_lottery: "PLAY_LOTTERY",
  weekly_golden_hour: "GOLDEN_HOUR_PLAY",
  weekly_shop_purchase: "BUY_SHOP_ITEM",
  weekly_login_streak: "LOGIN",
  weekly_cc_deposit: "CC_DEPOSIT",
  // NEW_USER
  new_user_first_login: "LOGIN",
  new_user_first_game: "PLAY_GAME",
  new_user_telegram_join: "JOIN_TELEGRAM_CHANNEL",
  new_user_cc_channel_join: "JOIN_CC_CHANNEL",
  new_user_next_day_login: "CONSECUTIVE_LOGIN",
  // SPECIAL
  streak_challenge_3: "LOGIN",
  golden_hour: "PLAY_GAME",
};

/**
 * 프리셋 한글 라벨 (자동 제목 생성용)
 */
const PRESET_TITLE_LABELS: Record<string, string> = {
  // DAILY
  daily_play_generic: "게임 플레이",
  daily_play_dice: "주사위",
  daily_play_roulette: "룰렛",
  daily_play_lottery: "복권",
  daily_golden_hour: "골든아워",
  daily_shop_purchase: "상점 구매",
  daily_login_gift: "출석 체크",
  daily_cc_deposit: "CC 입금",
  // WEEKLY
  weekly_play_generic: "게임 플레이",
  weekly_play_dice: "주사위",
  weekly_play_roulette: "룰렛",
  weekly_play_lottery: "복권",
  weekly_golden_hour: "골든아워",
  weekly_shop_purchase: "상점 구매",
  weekly_login_streak: "로그인",
  weekly_cc_deposit: "CC 입금",
  // NEW_USER
  new_user_first_login: "첫 로그인",
  new_user_first_game: "첫 게임",
  new_user_telegram_join: "텔레그램 입장",
  new_user_cc_channel_join: "CC 채널 입장",
  new_user_next_day_login: "다음날 로그인",
  // SPECIAL
  streak_challenge_3: "연속 출석",
  golden_hour: "골든아워 게임",
};

// 카테고리 한글 접두어
const CATEGORY_PREFIX: Record<string, string> = {
  DAILY: "일일",
  WEEKLY: "주간",
  NEW_USER: "신규",
  SPECIAL: "스페셜",
};

/**
 * 프리셋 → 추천 카테고리 매핑
 */
const getPresetCategory = (preset: string): string => {
  const p = LOGIC_KEY_PRESETS.find((item) => item.value === preset);
  return p?.category || "DAILY";
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
      <div className="col-span-full mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#09090B] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Mission System Blueprint
            </span>
          </div>
          <span className="font-mono text-[10px] text-zinc-600">
            v2.ops.engine
          </span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-zinc-500 font-bold">
                Category Scope
              </Label>
              <div className="text-sm font-medium text-zinc-200">
                {catMeaning}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-zinc-500 font-bold">
                Trigger Event
              </Label>
              <div className="font-mono text-sm text-emerald-400">{action}</div>
            </div>
            <div className="col-span-full space-y-1 py-2 border-y border-white/5">
              <Label className="text-[10px] uppercase text-zinc-500 font-bold">
                Global Identifier (Logic Key)
              </Label>
              <div className="font-mono text-sm tracking-tight text-indigo-400 break-all bg-indigo-500/5 p-2 rounded border border-indigo-500/10">
                {normalizeLogicKey(vars.logicKey) || "UNDEFINED_KEY"}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-zinc-500 font-bold">
                Target Threshold
              </Label>
              <div className="text-xl font-bold text-zinc-100 italic">
                {Number(vars.targetValue || 0).toLocaleString()}
                <span className="ml-1 text-xs font-normal text-zinc-500 not-italic">
                  counts
                </span>
              </div>
            </div>
            <div className="space-y-1 text-right">
              <Label className="text-[10px] uppercase text-zinc-500 font-bold">
                Golden Hour Check
              </Label>
              <div
                className={`text-sm font-bold ${golden ? "text-amber-400" : "text-zinc-600"}`}
              >
                {golden ? "MATCHED" : "OFF"}
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-3 text-[11px] text-zinc-500 leading-relaxed border-t border-white/5 pt-3">
            <div className="h-4 w-1 bg-zinc-800 rounded-full shrink-0" />
            <p>
              Logic Key acts as a unique global ID. The mission engine evaluates
              progress based on the Action Type trigger and Category reset
              policy.
            </p>
          </div>

          {warnings.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
              <span className="text-amber-400 shrink-0">⚠️</span>
              <p className="text-[11px] text-amber-200/80 leading-snug">
                {warnings[0]}
              </p>
            </div>
          )}
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
        <DialogContent className="max-w-3xl bg-[#09090B] border-white/10 text-white p-0 overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0" />

          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Plus className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Mission Creator
                </DialogTitle>
                <DialogDescription className="text-zinc-500 text-xs">
                  Create a new operational mission for Season 25.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Basic Info & Logic */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    01. Identity & Config
                  </span>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">
                    Mission Preset
                  </Label>
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
                    <SelectTrigger className="bg-white/5 border-white/10 hover:border-emerald-500/30 transition-colors">
                      <SelectValue placeholder="Select a preset..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#18181B] border-white/10 text-white">
                      {LOGIC_KEY_PRESETS.map((p) => (
                        <SelectItem
                          key={p.value}
                          value={p.value}
                          className="focus:bg-emerald-500/10 focus:text-emerald-400"
                        >
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Category</Label>
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
                    <Label className="text-xs text-zinc-400">Action Type</Label>
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
                  <Label className="text-xs text-zinc-400">Display Title</Label>
                  <Input
                    value={createForm.title}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, title: e.target.value })
                    }
                    className="bg-white/5 border-white/10 focus:border-emerald-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400 font-bold text-emerald-500/80">
                      Target Count
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
                      className="bg-emerald-500/5 border-emerald-500/20 text-emerald-400 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">
                      Display Condition
                    </Label>
                    <Input
                      value={createForm.condition}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          condition: e.target.value,
                        })
                      }
                      placeholder="(Optional)"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    02. Reward Package
                  </span>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs text-zinc-400">Asset Type</Label>
                    <Select
                      value={createForm.rewardType}
                      onValueChange={(val) =>
                        setCreateForm({ ...createForm, rewardType: val })
                      }
                    >
                      <SelectTrigger className="bg-white/5 border-white/10">
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
                  </div>
                  <div className="w-32 space-y-2">
                    <Label className="text-xs text-zinc-400">Amount</Label>
                    <Input
                      type="number"
                      value={createForm.rewardAmount}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          rewardAmount: parseInt(e.target.value) || 0,
                        })
                      }
                      className="bg-white/5 border-white/10 font-mono text-right"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Preview & Errors */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    03. Logic Preview
                  </span>
                </div>

                {renderMissionAssemblyPreview({
                  category: createForm.category,
                  logicKey: createForm.logicKey,
                  actionType: createForm.actionType,
                  targetValue: createForm.targetValue,
                  condition: createForm.condition,
                })}

                {createError && (
                  <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-2 text-red-400 mb-1">
                      <span className="text-sm font-bold">
                        CONFIGURATION ERROR
                      </span>
                    </div>
                    <p className="text-xs text-red-300 opacity-90 leading-snug">
                      {createError}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-8 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-zinc-500 hover:text-white hover:bg-white/5 px-8"
                >
                  DISCARD
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-10 shadow-lg shadow-emerald-900/20"
                >
                  {createMutation.isPending
                    ? "INITIALIZING..."
                    : "EXECUTE DEPLOY"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl bg-[#09090B] border-white/10 text-white p-0 overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-indigo-500/0" />

          <DialogHeader className="p-6 pb-0">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <Edit2 className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight">
                    Modify Parameters
                  </DialogTitle>
                  <DialogDescription className="text-zinc-500 text-xs font-mono">
                    MISSION_ID: #{editForm?.id}
                  </DialogDescription>
                </div>
              </div>

              {editForm && (
                <div className="flex items-center gap-3 bg-black/40 px-3 py-2 rounded-lg border border-white/5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">
                    Status
                  </span>
                  <span className="flex items-center gap-2">
                    <Switch
                      checked={editForm.isActive}
                      onCheckedChange={(checked) =>
                        setEditForm({ ...editForm, isActive: checked })
                      }
                      className="data-[state=checked]:bg-indigo-500"
                    />
                    <span
                      className={`text-[10px] font-bold uppercase ${editForm.isActive ? "text-indigo-400" : "text-zinc-600"}`}
                    >
                      {editForm.isActive ? "Active" : "Disabled"}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </DialogHeader>

          {editForm && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      01. Identity & Condition
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">
                      Display Title
                    </Label>
                    <Input
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm({ ...editForm, title: e.target.value })
                      }
                      className="bg-white/5 border-white/10 focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-400">
                        Category Scope
                      </Label>
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
                      <Label className="text-xs text-zinc-400">
                        Action Type
                      </Label>
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
                    <Label className="text-xs text-zinc-400">
                      Identifier (Logic Key)
                    </Label>
                    <div className="space-y-2">
                      <Input
                        value={editForm.logicKey}
                        onChange={(e) =>
                          setEditForm({ ...editForm, logicKey: e.target.value })
                        }
                        className="font-mono text-sm bg-white/5 border-white/10 focus:border-indigo-500/50"
                      />
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
                        <SelectTrigger className="h-8 text-xs bg-indigo-500/5 border-indigo-500/20 text-indigo-400">
                          <SelectValue placeholder="Override with Preset..." />
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
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2 pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      02. Threshold & Reward
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-indigo-400">
                        Target Value
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
                        className="bg-indigo-500/5 border-indigo-500/20 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-400">
                        Display Desc
                      </Label>
                      <Input
                        value={editForm.condition || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            condition: e.target.value,
                          })
                        }
                        className="bg-white/5 border-white/10"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 rounded-xl bg-black/40 border border-white/5">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs text-zinc-500 uppercase font-bold tracking-tighter">
                        Award Asset
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
                        <SelectContent className="bg-[#18181B] border-white/10 text-white max-h-[200px]">
                          {MISSION_REWARD_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-28 space-y-2">
                      <Label className="text-xs text-zinc-500 uppercase font-bold tracking-tighter">
                        Amount
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
                        className="bg-transparent border-white/10 font-mono text-xl font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      03. Deployment Preview
                    </span>
                  </div>

                  {renderMissionAssemblyPreview({
                    category: editForm.category,
                    logicKey: editForm.logicKey,
                    actionType: editForm.actionType,
                    targetValue: editForm.targetValue,
                    condition: editForm.condition,
                  })}

                  {editError && (
                    <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 animate-in fade-in">
                      <div className="flex items-center gap-2 text-red-400 mb-1">
                        <span className="text-sm font-bold uppercase">
                          Update Blocked
                        </span>
                      </div>
                      <p className="text-xs text-red-300 leading-snug">
                        {editError}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-8 flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setIsEditOpen(false)}
                    className="text-zinc-500 hover:text-white hover:bg-white/5 px-8"
                  >
                    ABORT
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={updateMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-10 shadow-lg shadow-indigo-900/20"
                  >
                    {updateMutation.isPending
                      ? "PATCHING..."
                      : "COMMIT CHANGES"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

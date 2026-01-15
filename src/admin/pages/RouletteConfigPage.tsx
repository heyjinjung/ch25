import React, { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  Plus,
  Trash2,
  X,
  Dices,
  RefreshCw,
  ChevronRight,
  CircleDot,
  LayoutGrid,
  Calendar,
  Users,
  Zap,
  AlertCircle,
  Info,
  Settings2,
  ArrowRight,
} from "lucide-react";
import {
  AdminRouletteConfig,
  AdminRouletteConfigPayload,
  AdminRouletteSegmentPayload,
  createRouletteConfig,
  deleteRouletteConfig,
  fetchRouletteConfigs,
  updateRouletteConfig,
} from "../api/adminRouletteApi";
import { REWARD_TYPES } from "../constants/rewardTypes";
import { useToast } from "../../components/common/ToastProvider";
import type { AdminRewardType } from "../types/adminReward";

const gifticonBrands = [
  { value: "CC_COIN", label: "씨씨코인" },
  { value: "BAEMIN", label: "배민" },
  { value: "COMPOSE", label: "컴포즈커피" },
  { value: "STARBUCKS", label: "스타벅스" },
  { value: "CU", label: "CU" },
  { value: "GS25", label: "GS25" },
  { value: "CUSTOM", label: "직접 입력" },
] as const;

const isGifticonType = (value?: string | null) => Boolean(value && value.toUpperCase().includes("GIFTICON"));

const getGifticonBrand = (value?: string | null) => {
  if (!isGifticonType(value)) return "";
  const raw = String(value ?? "").toUpperCase();

  // Special Case: CC_COIN (CC_COIN_GIFTICON)
  if (raw.startsWith("CC_COIN")) return "CC_COIN";

  // Standard: GIFTICON_BRAND
  if (raw.startsWith("GIFTICON_")) {
    return raw.replace("GIFTICON_", "");
  }

  // Legacy/Fallback: BRAND_GIFTICON
  return raw.replace(/_GIFTICON.*/i, "") || "";
};

const buildGifticonType = (brand: string) => {
  // Special Case
  if (brand === "CC_COIN") return "CC_COIN_GIFTICON";
  // Standard
  return `GIFTICON_${brand}`;
};

const segmentSchema = z.object({
  label: z.string().min(1, "라벨을 입력하세요"),
  weight: z.number().int().nonnegative("가중치는 0 이상"),
  reward_type: z.string().min(1, "보상 타입을 선택하세요"),
  reward_value: z.number().int().nonnegative("보상 값은 0 이상"),
});

const rouletteSchema = z
  .object({
    name: z.string().min(1, "이름을 입력하세요"),
    ticket_type: z.enum(["ROULETTE_COIN", "TRIAL_TOKEN", "GOLD_KEY", "DIAMOND_KEY"]).default("ROULETTE_COIN"),
    is_active: z.boolean().default(false),
    max_daily_spins: z.number().int().nonnegative("0이면 무제한"),
    segments: z.array(segmentSchema).length(6, "세그먼트는 6개가 필요합니다"),
  })
  .refine((value) => value.segments.reduce((sum, seg) => sum + seg.weight, 0) > 0, {
    message: "가중치 합은 0보다 커야 합니다",
    path: ["segments"],
  });

type RouletteFormValues = z.infer<typeof rouletteSchema>;

const buildDefaultSegments = (): RouletteFormValues["segments"] =>
  Array.from({ length: 6 }).map((_, idx) => ({
    label: `Slot ${idx + 1}`,
    weight: 1,
    reward_type: "POINT",
    reward_value: 0,
  }));

const normalizeToSixSegments = (segments: AdminRouletteSegmentPayload[]): RouletteFormValues["segments"] => {
  const base = buildDefaultSegments();
  return Array.from({ length: 6 }).map((_, idx) => {
    const raw =
      segments.find((s: any) => {
        const sidx = typeof (s as any).index === "number" ? (s as any).index : (s as any).slot_index;
        return sidx === idx;
      }) || ({} as Partial<AdminRouletteSegmentPayload> & { reward_amount?: number; slot_index?: number });

    return {
      label: raw.label ?? base[idx].label,
      weight: raw.weight ?? base[idx].weight,
      reward_type: raw.reward_type ?? base[idx].reward_type,
      reward_value: (raw as any).reward_value ?? (raw as any).reward_amount ?? base[idx].reward_value,
    };
  });
};

// Simulation Helper
const runSimulation = (segments: RouletteFormValues["segments"], iterations = 1000) => {
  const totalWeight = segments.reduce((acc, s) => acc + (s.weight || 0), 0);
  if (totalWeight <= 0) return Array(6).fill(0);

  const hits = Array(6).fill(0);
  for (let i = 0; i < iterations; i++) {
    const r = Math.random() * totalWeight;
    let accum = 0;
    for (let idx = 0; idx < segments.length; idx++) {
      accum += segments[idx].weight || 0;
      if (r < accum) {
        hits[idx]++;
        break;
      }
    }
  }
  return hits;
};

const mapErrorDetail = (error: unknown): string => {
  const detail = (error as any)?.response?.data?.detail;
  if (typeof detail === "string") {
    const map: Record<string, string> = {
      INVALID_ROULETTE_CONFIG: "룰렛 설정 값이 올바르지 않습니다.",
      ROULETTE_CONFIG_NOT_FOUND: "룰렛 설정을 찾을 수 없습니다.",
    };
    return map[detail] ?? detail;
  }
  return (error as any)?.message ?? "요청 처리 중 오류가 발생했습니다.";
};

const getProbabilityInfo = (weight: number, totalWeight: number) => {
  if (totalWeight <= 0) return { percent: 0, label: "-", textClass: "text-zinc-500", badgeClass: "bg-zinc-800/50 text-zinc-500 border-zinc-700/50", barClass: "bg-zinc-800", expected100: 0 };

  const percent = (weight / totalWeight) * 100;
  let label: string;
  let textClass: string;
  let badgeClass: string;
  let barClass: string;

  if (percent >= 30) {
    label = "COMMON";
    textClass = "text-zinc-400";
    badgeClass = "bg-zinc-800/50 text-zinc-400 border-zinc-700/50";
    barClass = "bg-zinc-700";
  } else if (percent >= 15) {
    label = "RARE";
    textClass = "text-blue-400";
    badgeClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
    barClass = "bg-blue-500/50";
  } else if (percent >= 5) {
    label = "EPIC";
    textClass = "text-purple-400";
    badgeClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
    barClass = "bg-purple-500/50";
  } else if (percent >= 1) {
    label = "MYSTIC";
    textClass = "text-amber-400";
    badgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    barClass = "bg-amber-500/50";
  } else {
    label = "LEGEND";
    textClass = "text-admin-brand";
    badgeClass = "bg-admin-brand/10 text-admin-brand border-admin-brand/20";
    barClass = "bg-admin-brand/50";
  }

  const expected100 = Math.round(percent);
  return { percent, label, textClass, badgeClass, barClass, expected100 };
};

const RouletteConfigPage: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdminRouletteConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [simResults, setSimResults] = useState<number[] | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "roulette"],
    queryFn: fetchRouletteConfigs,
  });

  const activeCount = useMemo(() => (data ?? []).filter(c => c.is_active).length, [data]);

  const initialValues = useMemo<RouletteFormValues>(
    () => ({
      name: "",
      ticket_type: "ROULETTE_COIN",
      is_active: false,
      max_daily_spins: 0,
      segments: buildDefaultSegments(),
    }),
    []
  );

  const form = useForm<RouletteFormValues>({
    resolver: zodResolver(rouletteSchema),
    defaultValues: initialValues,
  });

  const segments = useFieldArray({ control: form.control, name: "segments" });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    form.reset(initialValues);
    setSimResults(null);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen]);

  const mutation = useMutation({
    mutationFn: (payload: AdminRouletteConfigPayload) =>
      editing ? updateRouletteConfig(editing.id, payload) : createRouletteConfig(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "roulette"] });
      addToast("저장 완료", "success");
      closeModal();
    },
    onError: (err) => addToast(mapErrorDetail(err), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRouletteConfig(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "roulette"] });
      addToast("삭제 완료", "success");
    },
    onError: (err) => addToast(mapErrorDetail(err), "error"),
  });

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
    form.reset(initialValues);
  };

  const openEdit = (config: AdminRouletteConfig) => {
    setEditing(config);
    setIsModalOpen(true);
    form.reset({
      name: config.name,
      ticket_type: config.ticket_type ?? "ROULETTE_COIN",
      is_active: config.is_active,
      max_daily_spins: config.max_daily_spins,
      segments: normalizeToSixSegments(config.segments ?? []),
    });
  };

  const onEqualizeWeights = () => {
    const current = form.getValues().segments;
    current.forEach((_, idx) => {
      form.setValue(`segments.${idx}.weight`, 100);
    });
    setSimResults(null);
  };

  const onRunSimulation = () => {
    const current = form.getValues().segments;
    const results = runSimulation(current, 1000);
    setSimResults(results);
  };

  const onSubmit = form.handleSubmit((values) => {
    const payload: AdminRouletteConfigPayload = {
      name: values.name.trim(),
      ticket_type: values.ticket_type,
      is_active: values.is_active,
      max_daily_spins: values.max_daily_spins,
      segments: values.segments.map((seg, idx) => ({
        index: idx,
        label: seg.label.trim(),
        weight: seg.weight,
        reward_type: seg.reward_type as AdminRewardType,
        reward_value: seg.reward_value as number,
      })),
    };
    mutation.mutate(payload);
  });

  const totalWeightWatch = form.watch("segments")?.reduce((sum, s) => sum + (Number(s.weight) || 0), 0) || 0;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
            <span>시스템 관리</span>
            <ChevronRight size={12} />
            <span className="text-zinc-300">룰렛 설정</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
            <Dices className="text-admin-brand" size={28} />
            룰렛 환경 설정
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "roulette"] })}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition-all text-sm font-bold"
          >
            <RefreshCw size={16} />
            새로고침
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-admin-brand hover:brightness-110 text-black rounded-xl transition-all text-sm font-black shadow-lg shadow-admin-brand/20"
          >
            <Plus size={16} />
            새 룰렛 추가
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="admin-card p-4 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Configs</p>
              <h3 className="text-2xl font-black text-white mt-1 tabular-nums">{data?.length || 0}</h3>
            </div>
            <div className="p-2 bg-zinc-800 text-zinc-400 rounded-lg group-hover:scale-110 transition-transform">
              <LayoutGrid size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-zinc-500 font-medium font-mono">
            <Calendar size={12} />
            <span>CONFIG REPO</span>
          </div>
        </div>
        <div className="admin-card p-4 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Now</p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1 tabular-nums">{activeCount}</h3>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-110 transition-transform shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]">
              <Zap size={20} />
            </div>
          </div>
        </div>
        <div className="admin-card p-4 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Avg Segments</p>
              <h3 className="text-2xl font-black text-white mt-1 tabular-nums">6.0</h3>
            </div>
            <div className="p-2 bg-zinc-800 text-zinc-400 rounded-lg group-hover:scale-110 transition-transform">
              <CircleDot size={20} />
            </div>
          </div>
        </div>
        <div className="admin-card p-4 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Participants</p>
              <h3 className="text-2xl font-black text-white mt-1 tabular-nums">-</h3>
            </div>
            <div className="p-2 bg-zinc-800 text-zinc-400 rounded-lg group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="admin-card p-12 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="animate-spin text-zinc-600" size={32} />
          <p className="text-sm font-medium text-zinc-500">데이터를 불러오는 중입니다...</p>
        </div>
      ) : isError ? (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 flex items-center gap-4">
          <AlertCircle className="text-rose-400" size={24} />
          <div>
            <p className="text-sm font-bold text-rose-400">데이터 로드 실패</p>
            <p className="text-xs text-rose-400/80 mt-0.5">{mapErrorDetail(error)}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {(data ?? []).map((config) => (
            <div key={config.id} className={`admin-card p-5 border-l-4 transition-all hover:bg-zinc-800/30 ${config.is_active ? 'border-l-admin-brand' : 'border-l-zinc-800 opacity-60'}`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-5">
                  <div className={`p-3 rounded-2xl ${config.is_active ? 'bg-admin-brand/10 text-admin-brand shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]' : 'bg-zinc-800 text-zinc-500'}`}>
                    <Dices size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white tracking-tight">{config.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight border ${config.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                        {config.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <Zap size={14} className="text-admin-brand" />
                        <span className="font-mono text-zinc-300">{config.ticket_type}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 border-l border-zinc-800 pl-4">
                        <CircleDot size={14} className="text-zinc-500" />
                        <span>{config.segments?.length || 0} Slots</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 border-l border-zinc-800 pl-4">
                        <Calendar size={14} className="text-zinc-500" />
                        <span>Limit: {config.max_daily_spins === 0 ? "Unlimited" : config.max_daily_spins.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end lg:self-center">
                  <button
                    onClick={() => openEdit(config)}
                    className="h-10 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 flex items-center gap-2 transition-all text-sm font-bold"
                  >
                    <Edit size={16} />
                    수정
                  </button>
                  <button
                    onClick={() => {
                      if (!window.confirm("이 설정을 삭제할까요?")) return;
                      deleteMutation.mutate(config.id);
                    }}
                    disabled={deleteMutation.isPending}
                    aria-label="Delete Config"
                    className="h-10 w-10 flex items-center justify-center bg-zinc-800 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 rounded-xl border border-zinc-700 hover:border-rose-500/30 transition-all disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {(data ?? []).length === 0 && (
            <div className="admin-card p-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-zinc-900 rounded-full text-zinc-700 border border-zinc-800">
                <Plus size={40} />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-white">등록된 룰렛이 없습니다</p>
                <p className="text-sm text-zinc-500">새로운 룰렛 설정을 추가하여 운영을 시작하세요.</p>
              </div>
              <button
                onClick={openCreate}
                className="px-6 py-2.5 bg-admin-brand text-black rounded-xl text-sm font-black mt-4"
              >
                첫 번째 룰렛 추가
              </button>
            </div>
          )}
        </div>
      )}

      {/* Redesigned Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 mb-safe">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-5xl bg-zinc-900 rounded-[32px] border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-admin-brand/10 text-admin-brand rounded-2xl">
                  <Settings2 size={24} />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xl font-black text-white tracking-tight">
                    {editing ? "룰렛 설정 수정" : "새 룰렛 설정 추가"}
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">Rule ID: {editing?.id || 'NEW'}</p>
                </div>
              </div>
              <button onClick={closeModal} aria-label="Close Modal" className="h-10 w-10 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <form id="roulette-form" onSubmit={onSubmit} className="space-y-8">
                {/* Basic Info Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-admin-brand">
                    <Info size={16} />
                    <h4 className="text-sm font-black uppercase tracking-widest">기본 정보 (Basic Information)</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">룰렛 관리자 명칭</label>
                      <input
                        type="text"
                        className="w-full h-12 bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 text-sm text-white focus:border-admin-brand outline-none transition-colors"
                        placeholder="예: 기간한정 다이아 룰렛"
                        {...form.register("name")}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">소모 티켓 타입</label>
                      <select
                        className="w-full h-12 bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 text-sm text-white focus:border-admin-brand outline-none transition-colors appearance-none"
                        {...form.register("ticket_type")}
                      >
                        <option value="ROULETTE_COIN">코인 (ROULETTE_COIN)</option>
                        <option value="TRIAL_TOKEN">체험권 (TRIAL_TOKEN)</option>
                        <option value="GOLD_KEY">골드키 (GOLD_KEY)</option>
                        <option value="DIAMOND_KEY">다이아키 (DIAMOND_KEY)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">일일 스핀 제한 (0=무제한)</label>
                      <input
                        type="number"
                        className="w-full h-12 bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 text-sm text-white font-mono focus:border-admin-brand outline-none transition-colors"
                        {...form.register("max_daily_spins", { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-xl border border-zinc-800 cursor-pointer group w-fit pr-6">
                    <div className={`w-10 h-6 rounded-full relative transition-colors ${form.watch("is_active") ? 'bg-admin-brand' : 'bg-zinc-700'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.watch("is_active") ? 'left-5' : 'left-1'}`} />
                    </div>
                    <input type="checkbox" className="hidden" {...form.register("is_active")} />
                    <span className={`text-sm font-bold ${form.watch("is_active") ? 'text-white' : 'text-zinc-500'}`}>
                      시스템 활성화 여부
                    </span>
                  </label>
                </div>

                {/* Segment Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-admin-brand">
                      <LayoutGrid size={16} />
                      <h4 className="text-sm font-black uppercase tracking-widest">세그먼트 설정 (Slots & Probability)</h4>
                      <button
                        type="button"
                        onClick={onEqualizeWeights}
                        className="ml-4 px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded border border-zinc-700 text-[10px] font-bold transition-all"
                      >
                        EQUALIZE (ALL 100)
                      </button>
                    </div>
                    <div className="text-[11px] font-black text-zinc-500 flex items-center gap-4">
                      <span>TOTAL WEIGHT: <span className="text-white font-mono">{totalWeightWatch}</span></span>
                      <span>CHECK: <span className={totalWeightWatch > 0 ? 'text-emerald-400' : 'text-rose-400'}>{totalWeightWatch > 0 ? 'VALID' : 'INVALID'}</span></span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {segments.fields.map((field, idx) => {
                      const currentWeight = Number(form.watch(`segments.${idx}.weight`)) || 0;
                      const info = getProbabilityInfo(currentWeight, totalWeightWatch);

                      return (
                        <div key={field.id} className="p-4 rounded-xl bg-zinc-900/20 border border-zinc-800/50 hover:border-zinc-700 transition-all group">
                          <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-12 gap-4 items-start">

                              {/* Label Section */}
                              <div className="col-span-12 md:col-span-4 lg:col-span-3 space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Segment Label</label>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-11 rounded-xl bg-zinc-800 text-xs font-black flex items-center justify-center text-zinc-500">#{idx + 1}</div>
                                  <input
                                    placeholder="Label"
                                    className="w-full h-11 bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-sm text-white font-bold focus:border-admin-brand outline-none transition-all placeholder:text-zinc-700 placeholder:font-normal"
                                    {...form.register(`segments.${idx}.label`)}
                                  />
                                </div>
                              </div>

                              {/* Weight Section */}
                              <div className="col-span-6 md:col-span-4 lg:col-span-3 space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Weight Config</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    className="w-full h-11 bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-sm text-white font-mono focus:border-admin-brand outline-none transition-all"
                                    {...form.register(`segments.${idx}.weight`, { valueAsNumber: true })}
                                  />
                                  <div className="absolute right-3 top-3.5 pointer-events-none">
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${info.badgeClass} opacity-80`}>{info.percent.toFixed(1)}%</span>
                                  </div>
                                </div>
                                {/* Mini Bar */}
                                <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                  <div className={`h-full transition-all duration-500 ${info.barClass} w-[${Math.min(info.percent, 100)}%]`} />
                                </div>
                              </div>

                              {/* Reward Section */}
                              <div className="col-span-6 md:col-span-4 lg:col-span-6 space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Reward Definition (Type & Amount)</label>
                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <select
                                      className="w-full h-11 bg-zinc-900 border border-zinc-800 rounded-xl px-3 text-xs text-white focus:border-admin-brand outline-none appearance-none font-medium"
                                      {...form.register(`segments.${idx}.reward_type`)}
                                    >
                                      {Object.entries(REWARD_TYPES.reduce((acc, item) => {
                                        const g = (item as any).group || 'Other';
                                        if (!acc[g]) acc[g] = [];
                                        acc[g].push(item);
                                        return acc;
                                      }, {} as Record<string, typeof REWARD_TYPES[number][]>)).map(([group, items]) => (
                                        <optgroup key={group} label={group}>
                                          {items.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                                        </optgroup>
                                      ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                                      <ArrowRight size={14} />
                                    </div>
                                  </div>
                                  <input
                                    type="number"
                                    placeholder="Qty"
                                    className="w-24 h-11 bg-zinc-900 border border-zinc-800 rounded-xl px-3 text-xs text-white font-mono focus:border-admin-brand outline-none transition-all placeholder:text-zinc-700"
                                    {...form.register(`segments.${idx}.reward_value`, { valueAsNumber: true })}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Gifticon Panel */}
                            {isGifticonType(form.watch(`segments.${idx}.reward_type`)) && (
                              <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50 flex flex-col md:flex-row gap-3 items-center animate-in fade-in zoom-in-95 duration-200">
                                <div className="text-[10px] font-bold text-zinc-500 whitespace-nowrap px-1">GIFTICON OPTION</div>
                                <div className="flex-1 flex gap-2 w-full">
                                  <select
                                    className="flex-1 h-9 bg-zinc-800 border border-zinc-700 rounded-lg px-2 text-[11px] text-white outline-none focus:border-admin-brand appearance-none"
                                    value={gifticonBrands.some(b => b.value === getGifticonBrand(form.watch(`segments.${idx}.reward_type`))) ? getGifticonBrand(form.watch(`segments.${idx}.reward_type`)) : "CUSTOM"}
                                    onChange={(e) => {
                                      if (e.target.value === "CUSTOM") return;
                                      form.setValue(`segments.${idx}.reward_type`, buildGifticonType(e.target.value));
                                    }}
                                  >
                                    {gifticonBrands.map(b => (
                                      <option key={b.value} value={b.value}>{b.label}</option>
                                    ))}
                                  </select>
                                  {(!gifticonBrands.some(b => b.value === getGifticonBrand(form.watch(`segments.${idx}.reward_type`))) || getGifticonBrand(form.watch(`segments.${idx}.reward_type`)) === "CUSTOM") && (
                                    <input
                                      className="flex-1 h-9 bg-zinc-800 border border-zinc-700 rounded-lg px-2 text-[11px] text-white outline-none focus:border-admin-brand placeholder:text-zinc-600"
                                      placeholder="Brand Code (e.g. SBUX)"
                                      defaultValue={getGifticonBrand(form.watch(`segments.${idx}.reward_type`))}
                                      onBlur={(e) => form.setValue(`segments.${idx}.reward_type`, buildGifticonType(e.target.value.trim() || "CUSTOM"))}
                                    />
                                  )}
                                </div>
                                <div className="text-[10px] text-zinc-600 font-medium whitespace-nowrap">
                                  Code: <span className="text-zinc-400 font-mono">{form.watch(`segments.${idx}.reward_type`)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Verification Section */}
                <div className="pt-6 border-t border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-admin-brand">
                      <RefreshCw size={16} /> 검증 시뮬레이션 (Verification)
                    </h4>
                    <button
                      type="button"
                      onClick={onRunSimulation}
                      className="px-4 py-2 bg-admin-brand text-black text-xs font-black rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-admin-brand/20"
                    >
                      RUN 1,000 SPINS
                    </button>
                  </div>

                  {simResults ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {simResults.map((hits, idx) => {
                        const totalW = totalWeightWatch || 1;
                        const w = form.getValues().segments[idx].weight || 0;
                        const expectedPct = (w / totalW) * 100;
                        const actualPct = (hits / 1000) * 100;
                        const diff = actualPct - expectedPct;

                        return (
                          <div key={idx} className="p-3 bg-zinc-800/40 border border-zinc-700/50 rounded-xl flex flex-col items-center gap-1">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase">Slot #{idx + 1}</span>
                            <span className="text-2xl font-black text-white tabular-nums">{hits}</span>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-mono text-zinc-400">Act: {actualPct.toFixed(1)}%</span>
                              <span className="text-[9px] font-mono text-zinc-600">Exp: {expectedPct.toFixed(1)}%</span>
                            </div>
                            <span className={`text-[10px] font-bold mt-1 ${Math.abs(diff) < 2 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 bg-zinc-800/30 border border-zinc-800 border-dashed rounded-2xl text-center">
                      <p className="text-xs text-zinc-500 font-medium">위 버튼을 눌러 현재 설정된 확률대로 1,000회 시뮬레이션을 실행하여 결과를 검증합니다.</p>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex flex-col sm:flex-row gap-3 justify-end items-center">
              <div className="flex-1 text-xs text-zinc-500 hidden sm:block">
                <span className="font-bold text-zinc-400">NOTE:</span> 변경된 설정은 저장 즉시 시스템에 반영됩니다.
              </div>
              <button
                onClick={closeModal}
                className="w-full sm:w-auto px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl text-sm font-black transition-all"
              >
                취소
              </button>
              <button
                form="roulette-form"
                type="submit"
                disabled={mutation.isPending}
                className="w-full sm:w-auto px-10 py-2.5 bg-admin-brand hover:brightness-110 text-black rounded-xl text-sm font-black transition-all shadow-lg shadow-admin-brand/20 disabled:opacity-50"
              >
                {mutation.isPending ? "저장 중..." : "설정 저장 (Save Config)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouletteConfigPage;

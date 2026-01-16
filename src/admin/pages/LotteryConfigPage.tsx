import React, { useState, useEffect, useMemo } from "react";
import clsx from "clsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trophy, AlertCircle, RefreshCw, LayoutGrid, BarChart3, Edit3, Gamepad2, ChevronRight, Settings2, Save, Info, CheckCircle2, ShieldAlert, Plus, Trash2, X, History, Package, ChevronDown
} from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdminLotteryConfig, AdminLotteryConfigPayload, createLotteryConfig, fetchLotteryConfigs, updateLotteryConfig } from "../api/adminLotteryApi";
import { REWARD_TYPES } from "../constants/rewardTypes";
import { useToast } from "../../components/common/ToastProvider";
import type { AdminRewardType } from "../types/adminReward";

const normalizeStock = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const prizeSchema = z.object({
  id: z.number().optional(),
  label: z.string().min(1, "상품명을 입력하세요"),
  weight: z.number().int().nonnegative("가중치는 0 이상이어야 합니다"),
  stock: z.preprocess(normalizeStock, z.number().int().nonnegative("재고는 0 이상이어야 합니다").nullable()),
  reward_type: z.string().min(1, "보상 타입을 선택하세요"),
  reward_value: z.number().int().nonnegative("보상 값은 0 이상이어야 합니다"),
  is_active: z.boolean().default(true),
});

const lotterySchema = z
  .object({
    name: z.string().min(1, "이름을 입력하세요"),
    is_active: z.boolean().default(false),
    max_daily_plays: z.number().int().nonnegative("0이면 무제한입니다"),
    prizes: z.array(prizeSchema).min(1, "상품은 1개 이상 추가하세요"),
  })
  .refine((value) => {
    const labels = value.prizes.map((p) => p.label.trim());
    return new Set(labels).size === labels.length;
  }, {
    message: "상품명이 중복될 수 없습니다",
    path: ["prizes"],
  })
  .refine((value) => value.prizes.some((p) => p.is_active && p.weight > 0), {
    message: "활성 상품 중 가중치가 0보다 큰 항목이 1개 이상 필요합니다",
    path: ["prizes"],
  })
  .refine((value) => value.prizes.reduce((sum, p) => sum + p.weight, 0) > 0, {
    message: "전체 가중치 합은 0보다 커야 합니다",
    path: ["prizes"],
  });

type LotteryFormValues = z.infer<typeof lotterySchema>;

const mapErrorDetail = (error: unknown): string => {
  const detail = (error as any)?.response?.data?.detail;
  if (typeof detail === "string") {
    const map: Record<string, string> = {
      LOTTERY_CONFIG_NOT_FOUND: "복권 설정을 찾을 수 없습니다.",
      INVALID_LOTTERY_WEIGHT: "가중치는 0 이상이어야 합니다.",
      INVALID_LOTTERY_STOCK: "재고는 0 이상 또는 빈칸(무제한)입니다.",
      DUPLICATE_PRIZE_LABEL: "상품명이 중복되었습니다.",
      NO_ACTIVE_PRIZE: "활성 상품(가중치>0)이 1개 이상 필요합니다.",
      ZERO_TOTAL_WEIGHT: "전체 가중치 합은 0보다 커야 합니다.",
      INVALID_LOTTERY_CONFIG: "복권 설정 값이 올바르지 않습니다.",
    };
    return map[detail] ?? detail;
  }
  return (error as any)?.message ?? "요청 처리 중 오류가 발생했습니다.";
};

const getProbabilityInfo = (weight: number, totalWeight: number) => {
  if (totalWeight <= 0) {
    return {
      percent: 0,
      label: "N/A",
      textClass: "text-zinc-500",
      barClass: "bg-zinc-800",
      chipClass: "bg-zinc-800 text-zinc-500",
      expected100: 0,
    };
  }

  const percent = (weight / totalWeight) * 100;

  let label: string;
  let textClass: string;
  let barClass: string;
  let chipClass: string;

  if (percent >= 30) {
    label = "자주";
    textClass = "text-emerald-400";
    barClass = "bg-emerald-500";
    chipClass = "bg-emerald-500/10 text-emerald-400";
  } else if (percent >= 15) {
    label = "보통";
    textClass = "text-admin-brand";
    barClass = "bg-admin-brand";
    chipClass = "bg-admin-brand/10 text-admin-brand";
  } else if (percent >= 5) {
    label = "희귀";
    textClass = "text-amber-400";
    barClass = "bg-amber-500";
    chipClass = "bg-amber-500/10 text-amber-400";
  } else if (percent >= 1) {
    label = "매우 희귀";
    textClass = "text-rose-400";
    barClass = "bg-rose-500";
    chipClass = "bg-rose-500/10 text-rose-400";
  } else {
    label = "전설";
    textClass = "text-admin-brand";
    barClass = "bg-admin-brand";
    chipClass = "bg-admin-brand/20 text-admin-brand shadow-[0_0_10px_rgba(99,102,241,0.3)]";
  }

  const expected100 = Math.round(percent);

  return { percent, label, textClass, barClass, chipClass, expected100 };
};

const LotteryConfigPage: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdminLotteryConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: configs, isLoading } = useQuery({
    queryKey: ["admin", "lottery"],
    queryFn: fetchLotteryConfigs,
  });

  const initialValues = useMemo<LotteryFormValues>(
    () => ({
      name: "",
      is_active: false,
      max_daily_plays: 0,
      prizes: [
        {
          label: "",
          weight: 0,
          stock: null,
          reward_type: "POINT",
          reward_value: 0,
          is_active: true,
        },
      ],
    }),
    []
  );

  const form = useForm<LotteryFormValues>({
    resolver: zodResolver(lotterySchema),
    defaultValues: initialValues,
  });

  const prizesField = useFieldArray({
    control: form.control,
    name: "prizes",
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    form.reset(initialValues);
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
    mutationFn: (payload: AdminLotteryConfigPayload) =>
      editing ? updateLotteryConfig(editing.id, payload) : createLotteryConfig(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "lottery"] });
      addToast("저장 완료", "success");
      closeModal();
    },
    onError: (err) => {
      addToast(mapErrorDetail(err), "error");
    },
  });

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
    form.reset(initialValues);
  };

  const openEdit = (config: AdminLotteryConfig) => {
    setEditing(config);
    setIsModalOpen(true);
    form.reset({
      name: config.name,
      is_active: config.is_active,
      max_daily_plays: config.max_daily_plays,
      prizes: config.prizes.map((p) => ({
        id: p.id,
        label: p.label,
        weight: p.weight,
        stock: normalizeStock(p.stock),
        reward_type: p.reward_type,
        reward_value: (p.reward_value ?? (p as any).reward_amount ?? 0) as number,
        is_active: p.is_active,
      })),
    });
  };

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "lottery"] });
  };

  const onSubmit = form.handleSubmit((values) => {
    const payload: AdminLotteryConfigPayload = {
      name: values.name.trim(),
      is_active: values.is_active,
      max_daily_plays: values.max_daily_plays,
      prizes: values.prizes.map((p) => ({
        ...p,
        label: String(p.label ?? "").trim(),
        stock: normalizeStock(p.stock),
        reward_type: p.reward_type as AdminRewardType,
      })),
    };
    mutation.mutate(payload);
  });

  const stats = useMemo(() => {
    const list = configs ?? [];
    const activeCount = list.filter(c => c.is_active).length;
    const totalPrizes = list.reduce((sum, c) => sum + c.prizes.length, 0);
    const lowStockAlerts = list.flatMap(c => (c.prizes ?? [])).filter(item => item.stock !== null && item.stock !== undefined && item.stock <= 10).length;
    return { activeCount, totalPrizes, lowStockAlerts };
  }, [configs]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <RefreshCw className="h-10 w-10 text-admin-brand animate-spin" />
        <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">복권 시스템 데이터 동기화 중...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-zinc-500 text-sm font-medium">
            <span>시스템 관리</span>
            <ChevronRight size={12} />
            <span className="text-zinc-300">복권 설정</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
            <Trophy className="text-admin-brand" size={28} />
            복권 운영 커맨드 센터
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition-all text-sm font-bold"
          >
            <RefreshCw size={16} />
            데이터 새로고침
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-admin-brand hover:brightness-110 text-black rounded-xl transition-all text-sm font-black shadow-lg shadow-admin-brand/20"
          >
            <Plus size={16} />
            새 설정 추가
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="admin-card p-4 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Active Engines</p>
              <h3 className="text-2xl font-black text-white mt-1 tabular-nums">
                {stats.activeCount} / {configs?.length || 0}
              </h3>
            </div>
            <div className="p-2 bg-admin-brand/10 text-admin-brand rounded-lg group-hover:scale-110 transition-transform">
              <Gamepad2 size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500 font-medium">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span>OPERATIONAL</span>
          </div>
        </div>

        <div className="admin-card p-4 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Total Prizes</p>
              <h3 className="text-2xl font-black text-white mt-1 tabular-nums">{stats.totalPrizes.toLocaleString()}</h3>
            </div>
            <div className="p-2 bg-zinc-800 text-zinc-400 rounded-lg group-hover:scale-110 transition-transform">
              <Package size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500 font-medium">
            <Info size={12} />
            <span>Across all configs</span>
          </div>
        </div>

        <div className="admin-card p-4 relative overflow-hidden group border-admin-danger/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Low Stock Alerts</p>
              <h3 className={`text-2xl font-black mt-1 tabular-nums ${stats.lowStockAlerts > 0 ? "text-rose-400" : "text-white"}`}>
                {stats.lowStockAlerts}
              </h3>
            </div>
            <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${stats.lowStockAlerts > 0 ? "bg-rose-500/10 text-rose-400" : "bg-zinc-800 text-zinc-400"}`}>
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500 font-medium">
            <div className={`w-2 h-2 rounded-full ${stats.lowStockAlerts > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
            <span>{stats.lowStockAlerts > 0 ? "REPLENISHMENT REQUIRED" : "STABLE INVENTORY"}</span>
          </div>
        </div>

        <div className="admin-card p-4 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Global Status</p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1 uppercase tracking-tight">Healthy</h3>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-110 transition-transform shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]">
              <BarChart3 size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <LayoutGrid className="h-4 w-4 text-admin-brand" />
          <h2 className="text-base font-black text-white uppercase tracking-wider">복권 운영 설정 목록 (Lottery Fleet)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(configs ?? []).map((config) => (
            <div
              key={config.id}
              className={`admin-card overflow-hidden border-t-4 transition-all hover:scale-[1.01] duration-300 ${config.is_active ? 'border-t-admin-brand shadow-admin-glow' : 'border-t-zinc-800 opacity-60'}`}
            >
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${config.is_active ? 'bg-admin-brand/10 text-admin-brand' : 'bg-zinc-800 text-zinc-500'}`}>
                      <Trophy size={24} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white tracking-tight">{config.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-sm font-black uppercase tracking-tight border ${config.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                          {config.is_active ? 'ACTIVE' : 'STANDBY'}
                        </span>
                        <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest border border-zinc-800 px-2 py-0.5 rounded">
                          {config.max_daily_plays === 0 ? 'Unlimited' : `Limit: ${config.max_daily_plays}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(config)}
                    className="p-2 text-zinc-500 hover:text-admin-brand hover:bg-admin-brand/10 rounded-lg transition-all"
                    title="설정 편집"
                  >
                    <Edit3 size={20} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm font-black text-zinc-500 uppercase tracking-widest px-1">
                    <span>Main Prizes</span>
                    <span>{config.prizes.length} Items</span>
                  </div>
                  <div className="space-y-2">
                    {config.prizes.slice(0, 3).map((prize, idx) => {
                      const totalWeight = config.prizes.reduce((sum, p) => sum + p.weight, 0);
                      const info = getProbabilityInfo(prize.weight, totalWeight);
                      return (
                        <div key={idx} className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-1.5 rounded-full ${info.barClass}`} />
                            <span className="text-base font-bold text-zinc-300">{prize.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-black px-2 py-0.5 rounded ${info.chipClass}`}>
                              {info.percent.toFixed(1)}%
                            </span>
                            <span className="text-sm font-mono text-zinc-500">
                              Stock: {(prize.stock === null || prize.stock === undefined) ? '∞' : prize.stock.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {config.prizes.length > 3 && (
                      <p className="text-center text-sm text-zinc-600 font-bold uppercase tracking-widest pt-1">
                        + {config.prizes.length - 3} more prizes
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5 text-sm text-zinc-500 font-bold">
                    <History size={12} />
                    <span>Last updated: {new Date(config.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {(configs ?? []).length === 0 && (
            <div className="md:col-span-2 py-24 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-[32px] opacity-40 grayscale hover:grayscale-0 transition-all">
              <Trophy size={48} className="text-zinc-600 mb-4" />
              <p className="text-sm font-bold text-zinc-500">운영 중인 복권 설정이 없습니다.</p>
              <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-widest">새 설정을 추가하여 엔진을 가동하세요.</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="admin-card w-full max-w-6xl max-h-[90dvh] flex flex-col shadow-admin-glow border-admin-brand/30 overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-admin-brand/20 text-admin-brand">
                  <Settings2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    {editing ? "복권 엔진 메커니즘 수정" : "신규 복권 메커니즘 구축"}
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">{editing ? editing.name : "데이터베이스에 동기화될 새로운 구성을 입력하세요"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
                aria-label="모달 닫기"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">엔진 고유 식별 명칭</label>
                  <input
                    type="text"
                    className="w-full h-12 bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 text-sm text-white focus:border-admin-brand focus:ring-1 focus:ring-admin-brand/20 outline-none transition-all"
                    placeholder="예: 2024 신년 특별 복권"
                    {...form.register("name")}
                  />
                  {form.formState.errors.name?.message && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{form.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">일일 총 참여 제한 (0=무제한)</label>
                  <input
                    type="number"
                    className="w-full h-12 bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 text-sm text-white font-mono focus:border-admin-brand outline-none transition-all"
                    {...form.register("max_daily_plays", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    {...form.register("is_active")}
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-admin-brand peer-checked:after:bg-white"></div>
                </label>
                <span className="text-xs font-bold text-zinc-300">엔진 즉시 활성화 (Operation Status: Live)</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="text-admin-brand" size={18} />
                    <h4 className="text-sm font-black text-white uppercase tracking-widest">배출 상품 풀 구성 (Prize Pool)</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      prizesField.append({
                        label: "",
                        weight: 10,
                        stock: null,
                        reward_type: "POINT",
                        reward_value: 0,
                        is_active: true,
                      } as any)
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-admin-brand rounded-xl border border-admin-brand/30 transition-all text-[10px] font-black uppercase tracking-widest"
                  >
                    <Plus size={14} />
                    상품 슬롯 추가
                  </button>
                </div>

                {form.formState.errors.prizes?.message && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-500">
                    <AlertCircle size={16} />
                    <p className="text-[10px] font-bold">{form.formState.errors.prizes.message as string}</p>
                  </div>
                )}

                <div className="space-y-3">
                  {prizesField.fields.map((field, idx) => {
                    const totalWeight = prizesField.fields.reduce((sum, _, i) => sum + (Number(form.watch(`prizes.${i}.weight`)) || 0), 0);
                    const currentWeight = Number(form.watch(`prizes.${idx}.weight`)) || 0;
                    const info = getProbabilityInfo(currentWeight, totalWeight);

                    return (
                      <div key={field.id} className="admin-card bg-zinc-900/20 border-zinc-800/80 p-5 space-y-4 hover:border-zinc-700 transition-all group">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                          <div className="lg:col-span-3 space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">상품명</label>
                            <input
                              type="text"
                              className="w-full h-11 bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-sm text-white focus:border-admin-brand outline-none"
                              {...form.register(`prizes.${idx}.label`)}
                            />
                          </div>

                          <div className="lg:col-span-2 space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">가중치</label>
                            <input
                              type="number"
                              className="w-full h-11 bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-sm text-white font-mono focus:border-admin-brand outline-none"
                              {...form.register(`prizes.${idx}.weight`, { valueAsNumber: true })}
                            />
                          </div>

                          <div className="lg:col-span-2 space-y-2">
                            <div className="flex items-center justify-between mb-1 px-1">
                              <span className={`text-[10px] font-black ${info.textClass}`}>{info.percent.toFixed(2)}%</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${info.chipClass}`}>{info.label}</span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${info.barClass}`}
                                style={{ width: `${Math.min(info.percent, 100)}%` }}
                              />
                            </div>
                            <p className="text-[9px] text-zinc-600 font-medium text-center italic mt-1">~{info.expected100} hits / 100 trials</p>
                          </div>

                          <div className="lg:col-span-2 space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">재고 (Empty=∞)</label>
                            <input
                              type="number"
                              className="w-full h-11 bg-zinc-900 border border-zinc-800 rounded-xl px-4 text-sm text-white font-mono focus:border-admin-brand outline-none"
                              {...form.register(`prizes.${idx}.stock` as any, { valueAsNumber: true })}
                            />
                          </div>

                          <div className="lg:col-span-2 flex items-center gap-2">
                            <div className="flex-1 space-y-1.5">
                              <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">보상 설정</label>
                              <div className="flex gap-2">
                                <div className="flex-1 relative">
                                  <select
                                    className={clsx(
                                      "w-full h-11 bg-zinc-900 border rounded-xl px-3 text-xs text-white focus:border-admin-brand outline-none transition-all appearance-none",
                                      REWARD_TYPES.some((rt) => rt.value === form.watch(`prizes.${idx}.reward_type`))
                                        ? "border-zinc-800"
                                        : "border-rose-500 bg-rose-500/5 animate-pulse"
                                    )}
                                    {...form.register(`prizes.${idx}.reward_type`)}
                                  >
                                    {!REWARD_TYPES.some((rt) => rt.value === form.watch(`prizes.${idx}.reward_type`)) && (
                                      <option value={form.getValues(`prizes.${idx}.reward_type`)}>
                                        ⚠️ 알 수 없음 ({form.getValues(`prizes.${idx}.reward_type`)})
                                      </option>
                                    )}
                                    {REWARD_TYPES.map((rt) => (
                                      <option key={rt.value} value={rt.value}>
                                        {rt.label}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                    <ChevronDown size={14} />
                                  </div>
                                </div>
                                <input
                                  type="number"
                                  placeholder="수량"
                                  className="w-20 h-11 bg-zinc-900 border border-zinc-800 rounded-xl px-3 text-xs text-white font-mono focus:border-admin-brand outline-none"
                                  {...form.register(`prizes.${idx}.reward_value`, { valueAsNumber: true })}
                                />
                              </div>
                              {!REWARD_TYPES.some((rt) => rt.value === form.watch(`prizes.${idx}.reward_type`)) && (
                                <p className="text-[9px] text-rose-400 font-bold ml-1">전역 동기화되지 않은 타입입니다. 수정이 필요합니다.</p>
                              )}
                            </div>
                          </div>

                          <div className="lg:col-span-1 flex items-center justify-end gap-4 pb-2">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-tighter">Status</span>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-admin-brand focus:ring-admin-brand/20"
                                {...form.register(`prizes.${idx}.is_active`)}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => prizesField.remove(idx)}
                              className="p-2 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                              title="삭제"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </form>

            <div className="p-8 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-4">
              <button
                type="button"
                onClick={closeModal}
                className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-bold transition-all"
              >
                취소
              </button>
              <button
                type="submit"
                onClick={onSubmit}
                disabled={mutation.isPending}
                className="px-8 py-2.5 bg-admin-brand hover:brightness-110 text-black rounded-xl text-sm font-black shadow-lg shadow-admin-brand/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {mutation.isPending ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                {editing ? "시스템 구성 업데이트" : "시스템 구성 즉시 배포"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotteryConfigPage;

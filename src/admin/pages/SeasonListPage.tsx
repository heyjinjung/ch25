// src/admin/pages/SeasonListPage.tsx
import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft, ChevronRight, Layers, Plus, Save, X, RefreshCw, Check } from "lucide-react";
import { useToast } from "../../components/common/ToastProvider";
import {
  AdminSeason,
  AdminSeasonLevel,
  AdminSeasonListResponse,
  AdminSeasonPayload,
  fetchSeasons,
  fetchSeasonLevels,
  createSeason,
  updateSeason,
  upsertSeasonLevels,
} from "../api/adminSeasonApi";
import { REWARD_TYPES } from "../constants/rewardTypes";
import type { AdminRewardType } from "../types/adminReward";

const getSeasonProgress = (startDate: string, endDate: string) => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();

  if (end <= start) return 0;
  if (now < start) return 0;
  if (now > end) return 100;
  return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
};



const ModalShell = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
    <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-[#18181b] rounded-2xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between border-b border-white/5 px-6 py-5 bg-[#18181b]/95 backdrop-blur">
        <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
          aria-label="닫기"
        >
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">{children}</div>
    </div>
  </div>
);

const seasonSchema = z
  .object({
    name: z.string().min(1, "이름은 필수입니다"),
    start_date: z.string().min(1, "시작일을 입력하세요"),
    end_date: z.string().min(1, "종료일을 입력하세요"),
    max_level: z.number().int().positive("최대 레벨은 1 이상"),
    base_xp_per_stamp: z.number().int().positive("스탬프당 XP는 1 이상"),
    is_active: z.boolean().default(true),
  })
  .refine((value) => new Date(value.start_date) <= new Date(value.end_date), {
    message: "종료일은 시작일 이후여야 합니다",
    path: ["end_date"],
  });

type SeasonFormValues = z.infer<typeof seasonSchema>;

const SeasonListPage: React.FC = () => {
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [editingSeason, setEditingSeason] = useState<AdminSeason | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [levelEditingSeason, setLevelEditingSeason] = useState<AdminSeason | null>(null);
  const [levels, setLevels] = useState<AdminSeasonLevel[]>([]);
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [isLevelLoading, setIsLevelLoading] = useState(false);
  const [isSavingLevels, setIsSavingLevels] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery<AdminSeasonListResponse>({
    queryKey: ["admin", "seasons", page, size],
    queryFn: () => fetchSeasons({ page, size }),
    placeholderData: (prev) => prev ?? undefined,
  });

  const defaultValues = useMemo<SeasonFormValues>(
    () =>
      editingSeason
        ? {
          name: editingSeason.name,
          start_date: editingSeason.start_date,
          end_date: editingSeason.end_date,
          max_level: editingSeason.max_level,
          base_xp_per_stamp: editingSeason.base_xp_per_stamp,
          is_active: editingSeason.is_active,
        }
        : {
          name: "",
          start_date: "",
          end_date: "",
          max_level: 30,
          base_xp_per_stamp: 10,
          is_active: true,
        },
    [editingSeason]
  );

  const form = useForm<SeasonFormValues>({
    resolver: zodResolver(seasonSchema),
    defaultValues,
    mode: "onChange",
  });

  const resetAndClose = () => {
    setIsModalOpen(false);
    setEditingSeason(null);
    form.reset(defaultValues);
  };

  const mutation = useMutation({
    mutationFn: (payload: AdminSeasonPayload) =>
      editingSeason ? updateSeason(editingSeason.id, payload) : createSeason(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "seasons"] });
      resetAndClose();
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(values);
  });

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.size));
  }, [data]);



  const inputClass = "w-full h-10 bg-zinc-900 border border-zinc-800 rounded px-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600";
  const labelClass = "text-xs font-semibold text-zinc-400 mb-1.5 block";
  const checkboxClass = "w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0";

  return (
    <section className="bg-[#09090b] min-h-screen pb-20">



      <div className="px-8 max-w-[1600px] mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">시즌 관리 (Season Ops)</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingSeason(null);
              form.reset(defaultValues);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Plus size={16} />
            새 시즌 생성
          </button>
        </header>

        {isLoading && (
          <div className="h-64 flex items-center justify-center gap-3 text-zinc-500 bg-[#18181b] rounded-2xl border border-white/5">
            <RefreshCw className="animate-spin h-5 w-5" />
            <span className="text-sm font-medium">데이터 로드 중...</span>
          </div>
        )}

        {isError && (
          <div className="h-64 flex items-center justify-center gap-3 text-rose-400 bg-[#18181b] rounded-2xl border border-rose-500/20">
            <AlertCircle size={20} />
            <span className="text-sm font-bold">데이터 로드 실패: {(error as Error).message}</span>
          </div>
        )}

        {!isLoading && data && data.items.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center gap-4 text-zinc-500 bg-[#18181b] rounded-2xl border border-white/5 border-dashed">
            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-600">
              <Layers size={24} />
            </div>
            <p className="text-sm font-medium">등록된 시즌이 없습니다.</p>
          </div>
        )}

        {!isLoading && data && data.items.length > 0 && (
          <div className="bg-[#18181b] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-900/50 border-b border-white/5">
                    <th className="pl-6 pr-4 py-3 text-sm font-bold text-zinc-500 uppercase tracking-wider">시즌 명 (ID)</th>
                    <th className="px-4 py-3 text-sm font-bold text-zinc-500 uppercase tracking-wider">운영 기간 (Time Gauge)</th>
                    <th className="px-4 py-3 text-sm font-bold text-zinc-500 uppercase tracking-wider">최대 LV</th>
                    <th className="px-4 py-3 text-sm font-bold text-zinc-500 uppercase tracking-wider">XP Rate</th>
                    <th className="px-4 py-3 text-sm font-bold text-zinc-500 uppercase tracking-wider">상태</th>
                    <th className="px-4 py-3 text-sm font-bold text-zinc-500 uppercase tracking-wider text-center">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.items.map((season) => (
                    <tr key={season.id} className="group hover:bg-white/[0.02] transition-colors h-14">
                      <td className="pl-6 pr-4 py-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-zinc-200">{season.name}</span>
                          <span className="text-xs text-zinc-600 font-mono tracking-tighter">ID: {season.id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col gap-1.5 w-full max-w-[200px]">
                          <span className="text-sm text-zinc-400 font-mono tracking-tight font-bold">
                            {season.start_date} ~ {season.end_date}
                          </span>
                          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${season.is_active ? 'bg-indigo-500' : 'bg-zinc-600'}`}
                              // eslint-disable-next-line
                              style={{ width: `${getSeasonProgress(season.start_date, season.end_date)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-zinc-300 font-mono tabular-nums">{season.max_level}</span>
                          <span className="text-xs text-zinc-600 font-bold uppercase">LV</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-zinc-300 font-mono tabular-nums">{season.base_xp_per_stamp}</span>
                          <span className="text-xs text-zinc-600 font-bold uppercase">XP</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {season.is_active ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-black bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20 uppercase tracking-widest">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-black bg-zinc-800 text-zinc-500 ring-1 ring-inset ring-white/10 uppercase tracking-widest">
                            INACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSeason(season);
                              setIsModalOpen(true);
                              form.reset({
                                name: season.name,
                                start_date: season.start_date,
                                end_date: season.end_date,
                                max_level: season.max_level,
                                base_xp_per_stamp: season.base_xp_per_stamp,
                                is_active: season.is_active,
                              });
                            }}
                            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                            title="설정 수정"
                            aria-label="설정 수정"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setLevelEditingSeason(season);
                              setIsLevelLoading(true);
                              setIsLevelModalOpen(true);
                              try {
                                const data = await fetchSeasonLevels(season.id);
                                const existingLevels = data.levels || [];
                                const fullLevels: AdminSeasonLevel[] = [];
                                for (let i = 1; i <= season.max_level; i++) {
                                  const existing = existingLevels.find(l => l.level === i);
                                  if (existing) {
                                    fullLevels.push(existing);
                                  } else {
                                    fullLevels.push({
                                      level: i,
                                      required_xp: i * 100,
                                      reward_type: "TICKET_BUNDLE",
                                      reward_amount: 1,
                                      auto_claim: true,
                                    });
                                  }
                                }
                                setLevels(fullLevels);
                              } catch {
                                addToast("레벨 정보를 불러오지 못했습니다.", "error");
                                setIsLevelModalOpen(false);
                              } finally {
                                setIsLevelLoading(false);
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-xs font-black text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-lg shadow-indigo-500/10"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            LEVEL CONFIG
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between bg-zinc-900/30">
                <div className="text-xs text-zinc-500 font-black uppercase tracking-widest">
                  Page <span className="text-zinc-300">{page}</span> of {totalPages}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded border border-white/10 bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                    aria-label="이전 페이지"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded border border-white/10 bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                    aria-label="다음 페이지"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Season Modal */}
      {isModalOpen && (
        <ModalShell title={editingSeason ? "시즌 기본 설정 수정" : "새 시즌 생성"} onClose={resetAndClose}>
          <form className="space-y-6 p-2" onSubmit={onSubmit}>

            {/* Safety Zone - Form Area */}
            <div className="bg-[#1e1e24] p-6 rounded-xl border border-white/5 space-y-6">
              <div>
                <label className={labelClass}>시즌 명칭 <span className="text-rose-500">*</span></label>
                <input className={inputClass} {...form.register("name")} type="text" placeholder="예: Season 5 Alpha" />
                {form.formState.errors.name && <p className="mt-1 text-xs text-rose-400">{form.formState.errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>시작 일자</label>
                  <input type="date" className={inputClass} {...form.register("start_date")} />
                </div>
                <div>
                  <label className={labelClass}>종료 일자</label>
                  <input type="date" className={inputClass} {...form.register("end_date")} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>최대 레벨 (Max Level)</label>
                  <input type="number" className={inputClass} {...form.register("max_level", { valueAsNumber: true })} />
                </div>
                <div>
                  <label className={labelClass}>스탬프당 획득 XP</label>
                  <input type="number" className={inputClass} {...form.register("base_xp_per_stamp", { valueAsNumber: true })} />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
                  <input type="checkbox" {...form.register("is_active")} className={checkboxClass} />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-200">시즌 활성화 (Active)</span>
                    <span className="text-xs text-zinc-500 mt-0.5">활성화 시 즉시 사용자에게 노출됩니다.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                onClick={resetAndClose}
                type="button"
                className="px-5 py-2.5 rounded-lg text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {mutation.isPending ? <RefreshCw className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                {editingSeason ? "변경사항 저장" : "시즌 생성"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Level Editor Modal */}
      {isLevelModalOpen && levelEditingSeason && (
        <ModalShell
          title={`${levelEditingSeason.name} — 레벨 리워드 설정`}
          onClose={() => {
            setIsLevelModalOpen(false);
            setLevelEditingSeason(null);
            setLevels([]);
          }}
        >
          {isLevelLoading ? (
            <div className="h-40 flex items-center justify-center gap-3 text-zinc-500">
              <RefreshCw className="animate-spin h-5 w-5" />
              <span className="text-sm">레벨 구성을 불러오는 중...</span>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Header Stats */}
              <div className="flex items-center justify-between bg-indigo-500/10 p-5 rounded-xl border border-indigo-500/20">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">설정 대상 (Configuration Target)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-white">{levels.length}</span>
                    <span className="text-sm text-indigo-200/60 font-medium">개 레벨 (Levels)</span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSavingLevels}
                  onClick={async () => {
                    setIsSavingLevels(true);
                    try {
                      await upsertSeasonLevels(levelEditingSeason.id, levels);
                      setIsLevelModalOpen(false);
                      setLevelEditingSeason(null);
                      setLevels([]);
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setIsSavingLevels(false);
                    }
                  }}
                  className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                >
                  {isSavingLevels ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>전체 레벨 저장</span>
                </button>
              </div>

              {/* Levels Grid - Compact */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {levels.map((lv, idx) => (
                  <div
                    key={lv.level}
                    className="bg-[#1e1e24] p-4 rounded-xl border border-zinc-800 hover:border-indigo-500/50 transition-all group relative overflow-hidden"
                  >
                    {/* Progress Bar Background */}
                    <div className="absolute top-0 left-0 h-1 bg-zinc-800 w-full">
                      <div
                        className="h-full bg-indigo-500 transition-all"
                        // eslint-disable-next-line
                        style={{ width: `${(lv.level / (levelEditingSeason?.max_level || 1)) * 100}%` }}
                      />
                    </div>

                    <div className="flex items-start justify-between mb-4 mt-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-zinc-900 flex items-center justify-center border border-zinc-700 text-sm font-black text-white font-mono">
                          {lv.level}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-zinc-500 uppercase tracking-wider">레벨 보상 (Level Reward)</span>
                          <span className="text-sm text-indigo-400 font-black">
                            {REWARD_TYPES.find(r => r.value === lv.reward_type)?.label || lv.reward_type}
                          </span>
                        </div>
                      </div>
                      <label className="cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lv.auto_claim}
                          onChange={(e) => {
                            const newLevels = [...levels];
                            newLevels[idx] = { ...lv, auto_claim: e.target.checked };
                            setLevels(newLevels);
                          }}
                          className={checkboxClass}
                        />
                      </label>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5 ml-0.5">
                          필요 XP (Required XP)
                        </label>
                        <input
                          type="number"
                          value={lv.required_xp}
                          onChange={(e) => {
                            const newLevels = [...levels];
                            newLevels[idx] = { ...lv, required_xp: Number(e.target.value) || 0 };
                            setLevels(newLevels);
                          }}
                          className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded px-2 text-xs font-mono text-zinc-300 focus:border-indigo-500/50"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5 ml-0.5">종류 (Type)</label>
                          <select
                            value={lv.reward_type}
                            onChange={(e) => {
                              const newLevels = [...levels];
                              newLevels[idx] = { ...lv, reward_type: e.target.value as AdminRewardType };
                              setLevels(newLevels);
                            }}
                            className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded px-2 text-xs text-zinc-300 focus:border-indigo-500/50 appearance-none"
                          >
                            {REWARD_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5 ml-0.5">수량 (Amt)</label>
                          <input
                            type="number"
                            value={lv.reward_amount}
                            onChange={(e) => {
                              const newLevels = [...levels];
                              newLevels[idx] = { ...lv, reward_amount: Number(e.target.value) || 0 };
                              setLevels(newLevels);
                            }}
                            className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded px-2 text-xs font-mono text-emerald-400 font-bold focus:border-indigo-500/50 text-center"
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          )}
        </ModalShell>
      )}
    </section>
  );
};

export default SeasonListPage;

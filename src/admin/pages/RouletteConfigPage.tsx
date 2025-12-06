// src/admin/pages/RouletteConfigPage.tsx
import React, { useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AdminRouletteConfig,
  AdminRouletteConfigPayload,
  fetchRouletteConfigs,
  createRouletteConfig,
  updateRouletteConfig,
} from "../api/adminRouletteApi";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";

const segmentSchema = z.object({
  index: z.number().int().nonnegative(),
  label: z.string().min(1, "라벨은 필수입니다"),
  weight: z.number().int().positive("가중치는 1 이상"),
  reward_type: z.string().min(1, "보상 타입을 입력"),
  reward_value: z.number().int().nonnegative(),
});

const rouletteSchema = z
  .object({
    name: z.string().min(1, "이름은 필수입니다"),
    is_active: z.boolean().default(false),
    max_daily_spins: z.number().int().positive("일일 최대 스핀은 1 이상"),
    segments: z.array(segmentSchema).min(1, "세그먼트를 최소 1개 이상 설정하세요"),
  })
  .refine((value) => value.segments.reduce((sum, s) => sum + s.weight, 0) > 0, {
    message: "가중치 합은 0보다 커야 합니다",
    path: ["segments"],
  })
  .refine((value) => {
    const seen = new Set<number>();
    return value.segments.every((seg) => {
      if (seen.has(seg.index)) return false;
      seen.add(seg.index);
      return true;
    });
  }, {
    message: "세그먼트 index는 중복될 수 없습니다",
    path: ["segments"],
  });

type RouletteFormValues = z.infer<typeof rouletteSchema>;

const RouletteConfigPage: React.FC = () => {
  const [editing, setEditing] = useState<AdminRouletteConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "roulette"],
    queryFn: fetchRouletteConfigs,
  });

  const defaultValues = useMemo<RouletteFormValues>(
    () =>
      editing
        ? {
            name: editing.name,
            is_active: editing.is_active,
            max_daily_spins: editing.max_daily_spins,
            segments: editing.segments,
          }
        : {
            name: "XMAS Roulette",
            is_active: true,
            max_daily_spins: 3,
            segments: Array.from({ length: 6 }).map((_, idx) => ({
              index: idx,
              label: `Segment ${idx + 1}`,
              weight: 10,
              reward_type: "POINT",
              reward_value: 100 * (idx + 1),
            })),
          },
    [editing]
  );

  const form = useForm<RouletteFormValues>({
    resolver: zodResolver(rouletteSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "segments" });

  const resetAndClose = () => {
    setIsModalOpen(false);
    setEditing(null);
    form.reset(defaultValues);
  };

  const mutation = useMutation({
    mutationFn: (payload: AdminRouletteConfigPayload) =>
      editing ? updateRouletteConfig(editing.id, payload) : createRouletteConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roulette"] });
      resetAndClose();
    },
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">룰렛 설정</h1>
          <p className="text-sm text-slate-300">세그먼트 가중치 합과 index 중복을 UI에서 검증합니다.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>새 설정 생성</Button>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-emerald-700/40 bg-slate-900 p-4 text-slate-200">설정을 불러오는 중...</div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-500/40 bg-red-950 p-4 text-red-100">
          불러오기 실패: {(error as Error).message}
        </div>
      )}

      {!isLoading && data && data.length === 0 && (
        <div className="rounded-lg border border-emerald-700/40 bg-slate-900 p-4 text-slate-200">등록된 룰렛 설정이 없습니다.</div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-emerald-800/40 bg-slate-900/70 shadow-lg shadow-emerald-900/30">
          <table className="min-w-full divide-y divide-emerald-800/60">
            <thead className="bg-emerald-900/40 text-left text-slate-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold">이름</th>
                <th className="px-4 py-3 text-sm font-semibold">일일 제한</th>
                <th className="px-4 py-3 text-sm font-semibold">세그먼트 수</th>
                <th className="px-4 py-3 text-sm font-semibold">활성</th>
                <th className="px-4 py-3 text-sm font-semibold">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-800/40 text-slate-100">
              {data.map((config) => (
                <tr key={config.id} className="hover:bg-emerald-900/20">
                  <td className="px-4 py-3 text-sm font-semibold">{config.name}</td>
                  <td className="px-4 py-3 text-sm">{config.max_daily_spins}</td>
                  <td className="px-4 py-3 text-sm">{config.segments.length}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={config.is_active ? "text-emerald-400" : "text-slate-400"}>
                      {config.is_active ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditing(config);
                        setIsModalOpen(true);
                        form.reset({
                          name: config.name,
                          is_active: config.is_active,
                          max_daily_spins: config.max_daily_spins,
                          segments: config.segments,
                        });
                      }}
                    >
                      수정
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={resetAndClose} title={editing ? "룰렛 설정 수정" : "새 룰렛 설정"}>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-sm text-slate-200">이름</label>
            <input
              className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
              {...form.register("name")}
              type="text"
              placeholder="룰렛 이름"
            />
            {form.formState.errors.name && <p className="text-sm text-red-300">{form.formState.errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm text-slate-200">일일 최대 스핀</label>
              <input
                type="number"
                className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                {...form.register("max_daily_spins", { valueAsNumber: true })}
              />
              {form.formState.errors.max_daily_spins && (
                <p className="text-sm text-red-300">{form.formState.errors.max_daily_spins.message}</p>
              )}
            </div>
            <div className="flex items-center space-x-3 pt-6">
              <input type="checkbox" className="h-4 w-4" {...form.register("is_active")} />
              <span className="text-sm text-slate-200">활성화</span>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-emerald-800/60 bg-slate-900/70 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">세그먼트</h3>
              <Button
                variant="secondary"
                type="button"
                onClick={() =>
                  append({ index: fields.length, label: "새 세그먼트", weight: 1, reward_type: "POINT", reward_value: 0 })
                }
              >
                추가
              </Button>
            </div>
            {form.formState.errors.segments && (
              <p className="text-sm text-red-300">{form.formState.errors.segments.message as string}</p>
            )}
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-1 gap-2 rounded-md border border-emerald-800/50 bg-slate-900 p-3 md:grid-cols-6">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">Index</label>
                    <input
                      type="number"
                      className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                      {...form.register(`segments.${idx}.index`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs text-slate-300">라벨</label>
                    <input
                      type="text"
                      className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                      {...form.register(`segments.${idx}.label`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">가중치</label>
                    <input
                      type="number"
                      className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                      {...form.register(`segments.${idx}.weight`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">보상 타입</label>
                    <input
                      type="text"
                      className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                      {...form.register(`segments.${idx}.reward_type`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">보상 값</label>
                    <input
                      type="number"
                      className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                      {...form.register(`segments.${idx}.reward_value`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <Button variant="secondary" type="button" onClick={() => remove(idx)}>
                      삭제
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="secondary" type="button" onClick={resetAndClose}>
              취소
            </Button>
            <Button type="submit" disabled={mutation.isLoading}>
              {mutation.isLoading ? "저장 중..." : editing ? "수정" : "생성"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
};

export default RouletteConfigPage;

// src/admin/pages/LotteryConfigPage.tsx
import React, { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AdminLotteryConfig,
  AdminLotteryConfigPayload,
  fetchLotteryConfigs,
  createLotteryConfig,
  updateLotteryConfig,
} from "../api/adminLotteryApi";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";

const prizeSchema = z.object({
  label: z.string().min(1, "상품명을 입력하세요"),
  weight: z.number().int().nonnegative(),
  stock: z.number().int().nullable().optional(),
  reward_type: z.string().min(1, "보상 타입을 입력"),
  reward_value: z.number().int().nonnegative(),
  is_active: z.boolean().default(true),
});

const lotterySchema = z
  .object({
    name: z.string().min(1, "이름은 필수입니다"),
    is_active: z.boolean().default(false),
    max_daily_plays: z.number().int().positive("일일 최대 참여 횟수는 1 이상"),
    prizes: z.array(prizeSchema).min(1, "상품을 최소 1개 이상 등록하세요"),
  })
  .refine((value) => value.prizes.some((p) => p.is_active && p.weight > 0), {
    message: "활성 상품의 가중치 합이 0보다 커야 합니다",
    path: ["prizes"],
  });

type LotteryFormValues = z.infer<typeof lotterySchema>;

const LotteryConfigPage: React.FC = () => {
  const [editing, setEditing] = useState<AdminLotteryConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "lottery"],
    queryFn: fetchLotteryConfigs,
  });

  const defaultValues = useMemo<LotteryFormValues>(
    () =>
      editing
        ? {
            name: editing.name,
            is_active: editing.is_active,
            max_daily_plays: editing.max_daily_plays,
            prizes: editing.prizes,
          }
        : {
            name: "XMAS Lottery",
            is_active: true,
            max_daily_plays: 1,
            prizes: [
              {
                label: "100P",
                weight: 50,
                stock: null,
                reward_type: "POINT",
                reward_value: 100,
                is_active: true,
              },
              {
                label: "쿠폰",
                weight: 10,
                stock: 100,
                reward_type: "COUPON",
                reward_value: 1,
                is_active: true,
              },
            ],
          },
    [editing]
  );

  const form = useForm<LotteryFormValues>({
    resolver: zodResolver(lotterySchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "prizes" });

  const resetAndClose = () => {
    setIsModalOpen(false);
    setEditing(null);
    form.reset(defaultValues);
  };

  const mutation = useMutation({
    mutationFn: (payload: AdminLotteryConfigPayload) =>
      editing ? updateLotteryConfig(editing.id, payload) : createLotteryConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "lottery"] });
      resetAndClose();
    },
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">복권 설정</h1>
          <p className="text-sm text-slate-300">활성 상품 가중치 합>0, 재고 0 상품 제외 규칙을 UI에서 안내합니다.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>새 설정 생성</Button>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-emerald-700/40 bg-slate-900 p-4 text-slate-200">설정을 불러오는 중...</div>
      )}
      {isError && (
        <div className="rounded-lg border border-red-500/40 bg-red-950 p-4 text-red-100">불러오기 실패: {(error as Error).message}</div>
      )}
      {!isLoading && data && data.length === 0 && (
        <div className="rounded-lg border border-emerald-700/40 bg-slate-900 p-4 text-slate-200">등록된 복권 설정이 없습니다.</div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-emerald-800/40 bg-slate-900/70 shadow-lg shadow-emerald-900/30">
          <table className="min-w-full divide-y divide-emerald-800/60">
            <thead className="bg-emerald-900/40 text-left text-slate-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold">이름</th>
                <th className="px-4 py-3 text-sm font-semibold">일일 제한</th>
                <th className="px-4 py-3 text-sm font-semibold">상품 수</th>
                <th className="px-4 py-3 text-sm font-semibold">활성</th>
                <th className="px-4 py-3 text-sm font-semibold">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-800/40 text-slate-100">
              {data.map((config) => (
                <tr key={config.id} className="hover:bg-emerald-900/20">
                  <td className="px-4 py-3 text-sm font-semibold">{config.name}</td>
                  <td className="px-4 py-3 text-sm">{config.max_daily_plays}</td>
                  <td className="px-4 py-3 text-sm">{config.prizes.length}</td>
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
                          max_daily_plays: config.max_daily_plays,
                          prizes: config.prizes,
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

      <Modal isOpen={isModalOpen} onClose={resetAndClose} title={editing ? "복권 설정 수정" : "새 복권 설정"}>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-sm text-slate-200">이름</label>
            <input
              className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
              {...form.register("name")}
            />
            {form.formState.errors.name && <p className="text-sm text-red-300">{form.formState.errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm text-slate-200">일일 최대 참여 횟수</label>
              <input
                type="number"
                className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                {...form.register("max_daily_plays", { valueAsNumber: true })}
              />
              {form.formState.errors.max_daily_plays && (
                <p className="text-sm text-red-300">{form.formState.errors.max_daily_plays.message}</p>
              )}
            </div>
            <div className="flex items-center space-x-3 pt-6">
              <input type="checkbox" className="h-4 w-4" {...form.register("is_active")} />
              <span className="text-sm text-slate-200">활성화</span>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-emerald-800/60 bg-slate-900/70 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">상품 목록</h3>
              <Button
                variant="secondary"
                type="button"
                onClick={() =>
                  append({ label: "새 상품", weight: 1, stock: null, reward_type: "POINT", reward_value: 0, is_active: true })
                }
              >
                추가
              </Button>
            </div>
            {form.formState.errors.prizes && (
              <p className="text-sm text-red-300">{form.formState.errors.prizes.message as string}</p>
            )}
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-1 gap-2 rounded-md border border-emerald-800/50 bg-slate-900 p-3 md:grid-cols-6">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">상품명</label>
                    <input
                      className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                      {...form.register(`prizes.${idx}.label`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">가중치</label>
                    <input
                      type="number"
                      className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                      {...form.register(`prizes.${idx}.weight`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">재고(null=무한)</label>
                    <input
                      type="number"
                      className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                      {...form.register(`prizes.${idx}.stock`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">보상 타입</label>
                    <input
                      className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                      {...form.register(`prizes.${idx}.reward_type`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">보상 값</label>
                    <input
                      type="number"
                      className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                      {...form.register(`prizes.${idx}.reward_value`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <label className="flex items-center space-x-2 text-xs text-slate-300">
                      <input type="checkbox" className="h-4 w-4" {...form.register(`prizes.${idx}.is_active`)} />
                      <span>활성</span>
                    </label>
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

export default LotteryConfigPage;

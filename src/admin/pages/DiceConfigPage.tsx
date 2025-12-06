// src/admin/pages/DiceConfigPage.tsx
import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AdminDiceConfig,
  AdminDiceConfigPayload,
  fetchDiceConfigs,
  createDiceConfig,
  updateDiceConfig,
} from "../api/adminDiceApi";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";

const diceSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다"),
  is_active: z.boolean().default(true),
  max_daily_plays: z.number().int().positive("일일 최대 플레이는 1 이상"),
  win_reward_type: z.string().min(1),
  win_reward_value: z.number().int().nonnegative(),
  lose_reward_type: z.string().min(1),
  lose_reward_value: z.number().int().nonnegative(),
  draw_reward_type: z.string().min(1).optional(),
  draw_reward_value: z.number().int().nonnegative().optional(),
});

type DiceFormValues = z.infer<typeof diceSchema>;

const DiceConfigPage: React.FC = () => {
  const [editing, setEditing] = useState<AdminDiceConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "dice"],
    queryFn: fetchDiceConfigs,
  });

  const defaultValues = useMemo<DiceFormValues>(
    () =>
      editing
        ? { ...editing }
        : {
            name: "XMAS Dice",
            is_active: true,
            max_daily_plays: 5,
            win_reward_type: "POINT",
            win_reward_value: 100,
            lose_reward_type: "POINT",
            lose_reward_value: 10,
            draw_reward_type: "POINT",
            draw_reward_value: 50,
          },
    [editing]
  );

  const form = useForm<DiceFormValues>({
    resolver: zodResolver(diceSchema),
    defaultValues,
  });

  const resetAndClose = () => {
    setIsModalOpen(false);
    setEditing(null);
    form.reset(defaultValues);
  };

  const mutation = useMutation({
    mutationFn: (payload: AdminDiceConfigPayload) =>
      editing ? updateDiceConfig(editing.id, payload) : createDiceConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "dice"] });
      resetAndClose();
    },
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">주사위 설정</h1>
          <p className="text-sm text-slate-300">일일 제한과 보상 필드를 검증합니다.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>새 설정 생성</Button>
      </div>

      {isLoading && <div className="rounded-lg border border-emerald-700/40 bg-slate-900 p-4 text-slate-200">설정을 불러오는 중...</div>}
      {isError && (
        <div className="rounded-lg border border-red-500/40 bg-red-950 p-4 text-red-100">불러오기 실패: {(error as Error).message}</div>
      )}
      {!isLoading && data && data.length === 0 && (
        <div className="rounded-lg border border-emerald-700/40 bg-slate-900 p-4 text-slate-200">등록된 주사위 설정이 없습니다.</div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-emerald-800/40 bg-slate-900/70 shadow-lg shadow-emerald-900/30">
          <table className="min-w-full divide-y divide-emerald-800/60">
            <thead className="bg-emerald-900/40 text-left text-slate-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold">이름</th>
                <th className="px-4 py-3 text-sm font-semibold">일일 제한</th>
                <th className="px-4 py-3 text-sm font-semibold">활성</th>
                <th className="px-4 py-3 text-sm font-semibold">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-800/40 text-slate-100">
              {data.map((config) => (
                <tr key={config.id} className="hover:bg-emerald-900/20">
                  <td className="px-4 py-3 text-sm font-semibold">{config.name}</td>
                  <td className="px-4 py-3 text-sm">{config.max_daily_plays}</td>
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
                        form.reset(config);
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

      <Modal isOpen={isModalOpen} onClose={resetAndClose} title={editing ? "주사위 설정 수정" : "새 주사위 설정"}>
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
              <label className="text-sm text-slate-200">일일 최대 플레이</label>
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

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm text-slate-200">승리 보상 타입</label>
              <input
                className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                {...form.register("win_reward_type")}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-200">승리 보상 값</label>
              <input
                type="number"
                className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                {...form.register("win_reward_value", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-200">패배 보상 타입</label>
              <input
                className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                {...form.register("lose_reward_type")}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-200">패배 보상 값</label>
              <input
                type="number"
                className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                {...form.register("lose_reward_value", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-200">무승부 보상 타입</label>
              <input
                className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                {...form.register("draw_reward_type")}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-200">무승부 보상 값</label>
              <input
                type="number"
                className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                {...form.register("draw_reward_value", { valueAsNumber: true })}
              />
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

export default DiceConfigPage;

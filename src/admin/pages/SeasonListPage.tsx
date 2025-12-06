// src/admin/pages/SeasonListPage.tsx
import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AdminSeason,
  AdminSeasonPayload,
  fetchSeasons,
  createSeason,
  updateSeason,
} from "../api/adminSeasonApi";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";

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
  const [page] = useState(1);
  const [size] = useState(10);
  const [editingSeason, setEditingSeason] = useState<AdminSeason | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "seasons", page, size],
    queryFn: () => fetchSeasons({ page, size }),
    keepPreviousData: true,
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

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">시즌 관리</h1>
          <p className="text-sm text-slate-300">시즌 생성/수정 및 상태 확인</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>새 시즌 생성</Button>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-emerald-700/40 bg-slate-900 p-4 text-slate-200">
          시즌 정보를 불러오는 중입니다...
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-500/40 bg-red-950 p-4 text-red-100">
          시즌 목록을 불러오지 못했습니다: {(error as Error).message}
        </div>
      )}

      {!isLoading && data && data.items.length === 0 && (
        <div className="rounded-lg border border-emerald-700/40 bg-slate-900 p-4 text-slate-200">
          등록된 시즌이 없습니다. 새로운 시즌을 생성해 주세요.
        </div>
      )}

      {!isLoading && data && data.items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-emerald-800/40 bg-slate-900/70 shadow-lg shadow-emerald-900/30">
          <table className="min-w-full divide-y divide-emerald-800/60">
            <thead className="bg-emerald-900/40 text-left text-slate-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold">이름</th>
                <th className="px-4 py-3 text-sm font-semibold">기간</th>
                <th className="px-4 py-3 text-sm font-semibold">최대 레벨</th>
                <th className="px-4 py-3 text-sm font-semibold">XP/스탬프</th>
                <th className="px-4 py-3 text-sm font-semibold">활성</th>
                <th className="px-4 py-3 text-sm font-semibold">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-800/40 text-slate-100">
              {data.items.map((season) => (
                <tr key={season.id} className="hover:bg-emerald-900/20">
                  <td className="px-4 py-3 text-sm font-semibold">{season.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-200">
                    {season.start_date} ~ {season.end_date}
                  </td>
                  <td className="px-4 py-3 text-sm">{season.max_level}</td>
                  <td className="px-4 py-3 text-sm">{season.base_xp_per_stamp}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={season.is_active ? "text-emerald-400" : "text-slate-400"}>
                      {season.is_active ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Button
                      variant="secondary"
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

      <Modal isOpen={isModalOpen} onClose={resetAndClose} title={editingSeason ? "시즌 수정" : "새 시즌 생성"}>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-sm text-slate-200">이름</label>
            <input
              className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
              {...form.register("name")}
              type="text"
              placeholder="시즌 이름"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-300">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm text-slate-200">시작일</label>
              <input
                type="date"
                className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                {...form.register("start_date")}
              />
              {form.formState.errors.start_date && (
                <p className="text-sm text-red-300">{form.formState.errors.start_date.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-200">종료일</label>
              <input
                type="date"
                className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                {...form.register("end_date")}
              />
              {form.formState.errors.end_date && (
                <p className="text-sm text-red-300">{form.formState.errors.end_date.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm text-slate-200">최대 레벨</label>
              <input
                type="number"
                className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                {...form.register("max_level", { valueAsNumber: true })}
              />
              {form.formState.errors.max_level && (
                <p className="text-sm text-red-300">{form.formState.errors.max_level.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-200">스탬프당 XP</label>
              <input
                type="number"
                className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                {...form.register("base_xp_per_stamp", { valueAsNumber: true })}
              />
              {form.formState.errors.base_xp_per_stamp && (
                <p className="text-sm text-red-300">{form.formState.errors.base_xp_per_stamp.message}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <input type="checkbox" className="h-4 w-4" {...form.register("is_active")} />
            <span className="text-sm text-slate-200">활성화</span>
          </div>
          {form.formState.errors.is_active && (
            <p className="text-sm text-red-300">{form.formState.errors.is_active.message as string}</p>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={resetAndClose} type="button">
              취소
            </Button>
            <Button type="submit" disabled={mutation.isLoading}>
              {mutation.isLoading ? "저장 중..." : editingSeason ? "수정" : "생성"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
};

export default SeasonListPage;

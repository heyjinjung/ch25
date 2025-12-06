// src/admin/pages/RankingAdminPage.tsx
import React, { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AdminRankingEntry,
  AdminRankingEntryPayload,
  fetchRankingByDate,
  upsertRanking,
  deleteRanking,
} from "../api/adminRankingApi";
import Button from "../../components/common/Button";

const rankingEntrySchema = z.object({
  date: z.string().min(1),
  rank: z.number().int().positive("순위는 1 이상"),
  user_id: z.number().int().optional(),
  user_name: z.string().min(1, "닉네임/유저명을 입력하세요"),
  score: z.number().int().optional(),
});

const rankingSchema = z
  .object({
    date: z.string().min(1),
    entries: z.array(rankingEntrySchema),
  })
  .refine((value) => {
    const ranks = value.entries.map((e) => e.rank);
    return new Set(ranks).size === ranks.length;
  }, { message: "동일한 rank가 중복되었습니다", path: ["entries"] });

type RankingFormValues = z.infer<typeof rankingSchema>;

const RankingAdminPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format("YYYY-MM-DD"));
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "ranking", selectedDate],
    queryFn: () => fetchRankingByDate(selectedDate),
  });

  const form = useForm<RankingFormValues>({
    resolver: zodResolver(rankingSchema),
    defaultValues: useMemo(
      () => ({ date: selectedDate, entries: [] }),
      [selectedDate]
    ),
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "entries" });

  const mutation = useMutation({
    mutationFn: (payload: RankingFormValues) =>
      upsertRanking(payload.date, payload.entries as AdminRankingEntryPayload[]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ranking", selectedDate] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRanking(selectedDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ranking", selectedDate] });
      form.reset({ date: selectedDate, entries: [] });
      setIsDeleting(false);
    },
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  const loadExisting = () => {
    if (data) {
      form.reset({ date: selectedDate, entries: data });
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">랭킹 수기 입력</h1>
          <p className="text-sm text-slate-300">rank 중복을 UI에서 막고, 날짜별 랭킹을 교체/삭제합니다.</p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              form.reset({ date: e.target.value, entries: [] });
            }}
            className="rounded-md border border-emerald-700 bg-slate-900 px-3 py-2 text-slate-100"
          />
          <Button variant="secondary" onClick={loadExisting}>
            불러오기
          </Button>
        </div>
      </div>

      {isLoading && <div className="rounded-lg border border-emerald-700/40 bg-slate-900 p-4 text-slate-200">랭킹을 불러오는 중...</div>}
      {isError && (
        <div className="rounded-lg border border-red-500/40 bg-red-950 p-4 text-red-100">불러오기 실패: {(error as Error).message}</div>
      )}

      {data && data.length === 0 && (
        <div className="rounded-lg border border-emerald-700/40 bg-slate-900 p-4 text-slate-200">해당 날짜에 등록된 랭킹이 없습니다.</div>
      )}

      {data && data.length > 0 && (
        <div className="rounded-lg border border-emerald-800/40 bg-slate-900/70 p-4 text-slate-100">
          <p className="text-sm text-slate-200">등록된 랭킹 {data.length}개가 있습니다. 불러오기를 눌러 편집할 수 있습니다.</p>
        </div>
      )}

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="flex items-center space-x-3">
          <Button type="button" variant="secondary" onClick={() => append({ date: selectedDate, rank: fields.length + 1, user_name: "", score: undefined, user_id: undefined })}>
            행 추가
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsDeleting(true)}
            disabled={deleteMutation.isLoading}
          >
            전체 삭제
          </Button>
        </div>

        {form.formState.errors.entries && (
          <p className="text-sm text-red-300">{form.formState.errors.entries.message as string}</p>
        )}

        <div className="space-y-3">
          {fields.map((field, idx) => (
            <div key={field.id} className="grid grid-cols-1 gap-3 rounded-lg border border-emerald-800/60 bg-slate-900/70 p-3 md:grid-cols-5">
              <div className="space-y-1">
                <label className="text-xs text-slate-300">Rank</label>
                <input
                  type="number"
                  className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                  {...form.register(`entries.${idx}.rank`, { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-300">유저명</label>
                <input
                  className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                  {...form.register(`entries.${idx}.user_name`)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-300">Score</label>
                <input
                  type="number"
                  className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                  {...form.register(`entries.${idx}.score`, { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-300">User ID(optional)</label>
                <input
                  type="number"
                  className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                  {...form.register(`entries.${idx}.user_id`, { valueAsNumber: true })}
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

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={() => form.reset({ date: selectedDate, entries: data ?? [] })}>
            리셋
          </Button>
          <Button type="submit" disabled={mutation.isLoading}>
            {mutation.isLoading ? "저장 중..." : "저장"}
          </Button>
        </div>
      </form>

      {isDeleting && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-950 p-4 text-amber-100">
          <p className="text-sm">정말 전체 랭킹을 삭제하시겠습니까?</p>
          <div className="mt-3 flex space-x-2">
            <Button variant="secondary" onClick={() => setIsDeleting(false)}>
              취소
            </Button>
            <Button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isLoading}>
              {deleteMutation.isLoading ? "삭제 중..." : "삭제"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};

export default RankingAdminPage;

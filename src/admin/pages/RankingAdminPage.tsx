// src/admin/pages/RankingAdminPage.tsx
import React, { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminRankingEntryPayload, fetchRankingByDate, upsertRanking, deleteRanking } from "../api/adminRankingApi";

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
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [rowSearchInput, setRowSearchInput] = useState<string>("");
  const [rowSearchApplied, setRowSearchApplied] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState<number>(0);
  const queryClient = useQueryClient();

  const inputBase =
    "w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]";

  const PrimaryButton = ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button
      type="button"
      className="inline-flex items-center rounded-md bg-[#2D6B3B] px-4 py-2 text-sm font-medium text-white hover:bg-[#91F402] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
      {...props}
    >
      {children}
    </button>
  );

  const SecondaryButton = ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button
      type="button"
      className="inline-flex items-center rounded-md border border-[#333333] bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-gray-200 hover:bg-[#2C2C2E] disabled:cursor-not-allowed disabled:opacity-60"
      {...props}
    >
      {children}
    </button>
  );

  const DangerButton = ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button
      type="button"
      className="inline-flex items-center rounded-md border border-red-500/50 bg-red-950 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60"
      {...props}
    >
      {children}
    </button>
  );

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

  const normalize = (value: unknown) => String(value ?? "").toLowerCase();
  const includesAny = (hay: string, needle: string) => {
    const n = needle.trim().toLowerCase();
    if (!n) return true;
    return hay.includes(n);
  };

  const visibleIndices = useMemo(() => {
    const indices = Array.from({ length: fields.length }, (_, i) => i);
    if (!rowSearchApplied.trim()) return indices;

    const entries = form.getValues("entries") ?? [];
    return indices.filter((idx) => {
      const e = entries[idx];
      const hay = normalize(`${e?.rank ?? ""} ${e?.user_id ?? ""} ${e?.user_name ?? ""} ${e?.score ?? ""}`);
      return includesAny(hay, rowSearchApplied);
    });
  }, [fields, rowSearchApplied, form]);

  const totalVisible = visibleIndices.length;
  const totalPages = Math.max(1, Math.ceil(totalVisible / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalVisible);
  const pageIndices = useMemo(
    () => visibleIndices.slice(pageStart, pageEnd),
    [visibleIndices, pageStart, pageEnd]
  );

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
      setPage(0);
    }
  };

  const applyRowSearch = () => {
    setRowSearchApplied(rowSearchInput.trim());
    setPage(0);
  };

  const clearRowSearch = () => {
    setRowSearchInput("");
    setRowSearchApplied("");
    setPage(0);
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#91F402]">랭킹 입력 (날짜별)</h2>
          <p className="mt-1 text-sm text-gray-400">선택한 날짜의 랭킹을 불러오거나, 행을 추가해 수기로 입력한 뒤 저장합니다.</p>
        </div>
      </header>

      <div className="rounded-lg border border-[#333333] bg-[#111111] p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col">
              <label className="text-xs text-gray-400">날짜</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  form.reset({ date: e.target.value, entries: [] });
                }}
                className={inputBase}
              />
            </div>

            <SecondaryButton onClick={loadExisting} disabled={isLoading}>
              {isLoading ? "불러오는 중..." : "불러오기"}
            </SecondaryButton>

            <SecondaryButton
              onClick={() =>
                append({
                  date: selectedDate,
                  rank: fields.length + 1,
                  user_name: "",
                  score: undefined,
                  user_id: undefined,
                })
              }
            >
              행 추가
            </SecondaryButton>

            <DangerButton onClick={() => setIsDeleting(true)} disabled={deleteMutation.isPending}>
              전체 삭제
            </DangerButton>
          </div>

          <PrimaryButton onClick={() => void onSubmit()} disabled={mutation.isPending}>
            {mutation.isPending ? "저장 중..." : "저장"}
          </PrimaryButton>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-300">
          <div>
            현재 <span className="font-medium text-white">{fields.length}</span>행
            <span className="text-gray-500"> · rank 중복은 저장 시 차단됩니다.</span>
            {rowSearchApplied && (
              <span className="ml-2 text-gray-400">
                (검색 적용: <span className="font-medium text-white">{totalVisible}</span>행)
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">변경사항: {form.formState.isDirty ? "있음" : "없음"}</div>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-[#333333] bg-[#0A0A0A] p-3">
          <div className="flex flex-col">
            <label className="text-xs text-gray-400">행 검색(적용형)</label>
            <input
              value={rowSearchInput}
              onChange={(e) => setRowSearchInput(e.target.value)}
              placeholder="rank / user_id / 닉네임 / score"
              className={inputBase + " w-72"}
            />
          </div>
          <SecondaryButton onClick={applyRowSearch}>검색 적용</SecondaryButton>
          <SecondaryButton onClick={clearRowSearch} disabled={!rowSearchInput && !rowSearchApplied}>
            초기화
          </SecondaryButton>

          <div className="ml-auto flex flex-wrap items-end gap-2">
            <div className="flex flex-col">
              <label className="text-xs text-gray-400">페이지 크기</label>
              <select
                className={inputBase + " w-32"}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="text-xs text-gray-500">
              {totalVisible === 0 ? "0" : pageStart + 1}-{pageEnd} / {totalVisible}
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="mt-3 rounded-lg border border-[#333333] bg-[#111111] p-3 text-gray-200">랭킹을 불러오는 중...</div>
        )}
        {isError && (
          <div className="mt-3 rounded border border-red-500/40 bg-red-950 p-3 text-sm text-red-100">
            불러오기 실패: {(error as Error).message}
          </div>
        )}

        {form.formState.errors.entries && (
          <div className="mt-3 rounded border border-red-500/40 bg-red-950 p-3 text-sm text-red-100">
            {(form.formState.errors.entries.message as string) ?? "입력값을 확인해주세요."}
          </div>
        )}

        <div className="mt-4 rounded-lg border border-[#333333] bg-[#111111] shadow-md">
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 border-b border-[#333333] bg-[#1A1A1A]">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">user_id</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">닉네임</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">점수</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {pageIndices.map((idx) => {
                  const field = fields[idx];
                  return (
                  <tr key={field.id} className={idx % 2 === 0 ? "bg-[#111111]" : "bg-[#1A1A1A]"}>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        className={inputBase + " text-right"}
                        {...form.register(`entries.${idx}.rank`, { valueAsNumber: true })}
                        min={1}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        className={inputBase}
                        placeholder="user_id"
                        {...form.register(`entries.${idx}.user_id`, { valueAsNumber: true })}
                      />
                      {form.formState.errors.entries?.[idx]?.user_id && (
                        <p className="mt-1 text-xs text-red-300">user_id를 입력하세요</p>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        className={inputBase}
                        placeholder="닉네임/유저명"
                        {...form.register(`entries.${idx}.user_name`)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        className={inputBase + " text-right"}
                        {...form.register(`entries.${idx}.score`, { valueAsNumber: true })}
                        min={0}
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <SecondaryButton onClick={() => remove(idx)}>삭제</SecondaryButton>
                    </td>
                  </tr>
                  );
                })}
                {fields.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-gray-400" colSpan={5}>
                      아직 데이터가 없습니다. “불러오기” 또는 “행 추가”를 사용하세요.
                    </td>
                  </tr>
                )}
                {fields.length > 0 && totalVisible === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-gray-400" colSpan={5}>
                      검색 결과가 없습니다. “초기화”를 눌러 전체를 확인하세요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {fields.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#333333] bg-[#0A0A0A] p-3">
            <div className="text-xs text-gray-500">
              페이지 {safePage + 1} / {totalPages}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SecondaryButton
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage <= 0}
              >
                이전
              </SecondaryButton>
              <SecondaryButton
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
              >
                다음
              </SecondaryButton>
              <PrimaryButton onClick={() => void onSubmit()} disabled={mutation.isPending}>
                {mutation.isPending ? "저장 중..." : "저장"}
              </PrimaryButton>
            </div>
          </div>
        )}

        {isDeleting && (
          <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-950 p-4 text-amber-100">
            <p className="text-sm">정말 이 날짜의 랭킹을 전체 삭제하시겠습니까?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <SecondaryButton onClick={() => setIsDeleting(false)}>취소</SecondaryButton>
              <DangerButton onClick={() => void deleteMutation.mutateAsync()} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </DangerButton>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default RankingAdminPage;

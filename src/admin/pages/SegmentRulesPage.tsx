// src/admin/pages/SegmentRulesPage.tsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createSegmentRule,
  deleteSegmentRule,
  fetchSegmentRules,
  updateSegmentRule,
  type AdminSegmentRule,
} from "../api/adminSegmentRulesApi";
import { segmentLabelKo, shouldShowLabelKo } from "../constants/segmentLabels";

const prettyJson = (value: unknown) => {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
};

const SegmentRulesPage: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "segment-rules"],
    queryFn: () => fetchSegmentRules(),
  });

  const inputBase =
    "w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]";

  const monoBase =
    "w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 font-mono text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]";

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

  const rules: AdminSegmentRule[] = data ?? [];

  const [newName, setNewName] = useState<string>("VIP_RULE");
  const [newSegment, setNewSegment] = useState<string>("VIP");
  const [newPriority, setNewPriority] = useState<number>(10);
  const [newEnabled, setNewEnabled] = useState<boolean>(true);
  const [newCondition, setNewCondition] = useState<string>(
    prettyJson({ field: "deposit_amount", op: ">=", value: 1000000 })
  );

  const [edit, setEdit] = useState<
    Record<number, { name: string; segment: string; priority: number; enabled: boolean; conditionText: string }>
  >({});

  const ensureEdit = (r: AdminSegmentRule) => {
    setEdit((prev) => {
      if (prev[r.id]) return prev;
      return {
        ...prev,
        [r.id]: {
          name: r.name,
          segment: r.segment,
          priority: r.priority,
          enabled: r.enabled,
          conditionText: prettyJson(r.condition_json),
        },
      };
    });
  };

  const createMutation = useMutation({
    mutationFn: createSegmentRule,
    onSuccess: async () => {
      await refetch();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ ruleId, payload }: { ruleId: number; payload: any }) => updateSegmentRule(ruleId, payload),
    onSuccess: async () => {
      await refetch();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId: number) => deleteSegmentRule(ruleId),
    onSuccess: async () => {
      await refetch();
    },
  });

  const createDisabled = useMemo(() => {
    if (!newName.trim() || !newSegment.trim()) return true;
    try {
      JSON.parse(newCondition);
      return false;
    } catch {
      return true;
    }
  }, [newName, newSegment, newCondition]);

  const onCreate = async () => {
    const condition_json = JSON.parse(newCondition);
    await createMutation.mutateAsync({
      name: newName.trim(),
      segment: newSegment.trim(),
      priority: newPriority,
      enabled: newEnabled,
      condition_json,
    });
  };

  const onSave = async (r: AdminSegmentRule) => {
    ensureEdit(r);
    const e = edit[r.id];
    if (!e) return;
    const condition_json = JSON.parse(e.conditionText);
    await updateMutation.mutateAsync({
      ruleId: r.id,
      payload: {
        name: e.name.trim(),
        segment: e.segment.trim(),
        priority: e.priority,
        enabled: e.enabled,
        condition_json,
      },
    });
  };

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-2xl font-bold text-[#91F402]">사용자 분류 규칙</h2>
        <p className="mt-1 text-sm text-gray-400">DB에서 세그먼트 분류 규칙을 관리합니다. priority가 낮을수록 먼저 적용됩니다.</p>
      </header>

      <section className="rounded-lg border border-[#333333] bg-[#111111] p-4 space-y-3">
        <div className="text-sm font-semibold text-white">새 규칙 추가</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,12ch)_minmax(0,10ch)_minmax(0,8ch)_minmax(0,1fr)]">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-200">규칙명(name)</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className={inputBase} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-200">세그먼트(segment)</label>
            <div className="flex items-center gap-2">
              <input
                value={newSegment}
                onChange={(e) => setNewSegment(e.target.value.toUpperCase())}
                className={inputBase}
                title={segmentLabelKo(newSegment)}
              />
              {shouldShowLabelKo(newSegment) && (
                <span className="max-w-[14rem] truncate text-xs text-gray-400" title={segmentLabelKo(newSegment)}>
                  {segmentLabelKo(newSegment)}
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-200">우선순위(priority)</label>
            <input
              type="number"
              value={newPriority}
              onChange={(e) => setNewPriority(Number(e.target.value) || 0)}
              className={inputBase}
            />
          </div>
          <div className="flex items-end justify-between gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input type="checkbox" checked={newEnabled} onChange={(e) => setNewEnabled(e.target.checked)} />
              활성화
            </label>
            <PrimaryButton onClick={() => void onCreate()} disabled={createDisabled || createMutation.isPending}>
              추가
            </PrimaryButton>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-200">조건(JSON)</label>
          <textarea value={newCondition} onChange={(e) => setNewCondition(e.target.value)} className={monoBase + " h-32"} />
          <p className="mt-1 text-xs text-gray-400">예: {`{"field":"deposit_amount","op":">=","value":1000000}`}</p>
        </div>
        {createMutation.isError && (
          <div className="rounded-lg border border-red-700/40 bg-red-950 p-3 text-sm text-red-100">
            생성 실패: {(createMutation.error as any)?.message ?? "요청에 실패했습니다."}
          </div>
        )}
      </section>

      {isLoading && (
        <div className="rounded-lg border border-[#333333] bg-[#111111] p-3 text-gray-200">불러오는 중...</div>
      )}

      <div className="overflow-hidden rounded-lg border border-[#333333] bg-[#111111] shadow-md">
        <div className="max-h-[640px] overflow-auto">
          <table className="min-w-full table-fixed">
            <thead className="sticky top-0 z-10 border-b border-[#333333] bg-[#1A1A1A]">
            <tr>
              <th className="w-16 px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ID</th>
              <th className="w-[14ch] px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">규칙명</th>
              <th className="w-[12ch] px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">세그먼트</th>
              <th className="w-[8ch] px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">priority</th>
              <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">활성</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider xl:table-cell">조건(JSON)</th>
              <th className="w-56 px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333333]">
            {rules.length === 0 && !isLoading ? (
              <tr>
                <td className="px-4 py-10 text-center text-gray-400" colSpan={7}>
                  규칙이 없습니다.
                </td>
              </tr>
            ) : (
              rules.map((r) => {
                const e = edit[r.id];
                const view = e ?? {
                  name: r.name,
                  segment: r.segment,
                  priority: r.priority,
                  enabled: r.enabled,
                  conditionText: prettyJson(r.condition_json),
                };
                return (
                  <tr
                    key={r.id}
                    className={(r.id % 2 === 0 ? "bg-[#111111]" : "bg-[#1A1A1A]") + " text-white"}
                    onMouseEnter={() => ensureEdit(r)}
                  >
                    <td className="px-4 py-3 align-top text-xs text-gray-300">{r.id}</td>
                    <td className="px-4 py-3 align-top">
                      <input
                        value={view.name}
                        onChange={(ev) =>
                          setEdit((prev) => ({
                            ...prev,
                            [r.id]: { ...(prev[r.id] ?? view), name: ev.target.value },
                          }))
                        }
                        className={inputBase + " px-2 py-1 text-xs"}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex min-w-0 items-center gap-2">
                        <input
                          value={view.segment}
                          onChange={(ev) =>
                            setEdit((prev) => ({
                              ...prev,
                              [r.id]: { ...(prev[r.id] ?? view), segment: ev.target.value.toUpperCase() },
                            }))
                          }
                          className={inputBase + " w-[9ch] px-2 py-1 text-xs"}
                          title={segmentLabelKo(view.segment)}
                        />
                        {shouldShowLabelKo(view.segment) && (
                          <span className="max-w-[10ch] truncate text-xs text-gray-400" title={segmentLabelKo(view.segment)}>
                            {segmentLabelKo(view.segment)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <input
                        type="number"
                        value={view.priority}
                        onChange={(ev) =>
                          setEdit((prev) => ({
                            ...prev,
                            [r.id]: { ...(prev[r.id] ?? view), priority: Number(ev.target.value) || 0 },
                          }))
                        }
                        className={inputBase + " w-[7ch] px-2 py-1 text-xs"}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={view.enabled}
                        onChange={(ev) =>
                          setEdit((prev) => ({
                            ...prev,
                            [r.id]: { ...(prev[r.id] ?? view), enabled: ev.target.checked },
                          }))
                        }
                      />
                    </td>
                    <td className="hidden px-4 py-3 align-top xl:table-cell">
                      <textarea
                        value={view.conditionText}
                        onChange={(ev) =>
                          setEdit((prev) => ({
                            ...prev,
                            [r.id]: { ...(prev[r.id] ?? view), conditionText: ev.target.value },
                          }))
                        }
                        className={monoBase + " h-24 px-2 py-1"}
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex gap-2">
                        <PrimaryButton onClick={() => void onSave(r)} disabled={updateMutation.isPending}>
                          저장
                        </PrimaryButton>
                        <DangerButton
                          onClick={() => void deleteMutation.mutateAsync(r.id)}
                          disabled={deleteMutation.isPending}
                        >
                          삭제
                        </DangerButton>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-red-700/40 bg-red-950 p-3 text-sm text-red-100">
          불러오기 실패: {(error as any)?.message ?? "요청에 실패했습니다."}
        </div>
      )}
    </section>
  );
};

export default SegmentRulesPage;

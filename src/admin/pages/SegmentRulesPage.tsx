// src/admin/pages/SegmentRulesPage.tsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Button from "../../components/common/Button";
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
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">세그먼트 규칙</h1>
        <p className="text-sm text-slate-300">DB에서 세그먼트 분류 규칙을 관리합니다. 우선순위(priority)가 낮을수록 먼저 적용됩니다.</p>
      </header>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-100">새 규칙 추가</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-200">규칙명(name)</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-200">세그먼트(segment)</label>
            <div className="flex items-center gap-2">
              <input
                value={newSegment}
                onChange={(e) => setNewSegment(e.target.value.toUpperCase())}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                title={segmentLabelKo(newSegment)}
              />
              {shouldShowLabelKo(newSegment) && (
                <span className="max-w-[14rem] truncate text-xs text-slate-400" title={segmentLabelKo(newSegment)}>
                  {segmentLabelKo(newSegment)}
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-200">우선순위(priority)</label>
            <input
              type="number"
              value={newPriority}
              onChange={(e) => setNewPriority(Number(e.target.value) || 0)}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" checked={newEnabled} onChange={(e) => setNewEnabled(e.target.checked)} />
              활성화
            </label>
            <Button onClick={() => void onCreate()} disabled={createDisabled || createMutation.isPending}>
              추가
            </Button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-200">조건(JSON)</label>
          <textarea
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
            className="h-32 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">예: {`{"field":"deposit_amount","op":">=","value":1000000}`}</p>
        </div>
        {createMutation.isError && (
          <div className="rounded-lg border border-red-700/40 bg-red-950 p-3 text-sm text-red-100">
            생성 실패: {(createMutation.error as any)?.message ?? "요청에 실패했습니다."}
          </div>
        )}
      </section>

      {isLoading && <div className="rounded-lg border border-emerald-800/40 bg-slate-900 p-3 text-slate-200">불러오는 중...</div>}

      <div className="overflow-auto rounded-lg border border-slate-800">
        <table className="min-w-full table-fixed divide-y divide-slate-800 bg-slate-900 text-sm text-slate-100">
          <thead className="bg-slate-800/60">
            <tr>
              <th className="w-16 px-3 py-2 text-left">ID</th>
              <th className="w-60 px-3 py-2 text-left">규칙명</th>
              <th className="w-56 px-3 py-2 text-left">세그먼트</th>
              <th className="w-28 px-3 py-2 text-left">우선순위</th>
              <th className="w-20 px-3 py-2 text-left">활성화</th>
              <th className="hidden px-3 py-2 text-left xl:table-cell">조건(JSON)</th>
              <th className="w-40 px-3 py-2 text-left">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rules.length === 0 && !isLoading ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-400" colSpan={7}>
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
                  <tr key={r.id} className="text-slate-100" onMouseEnter={() => ensureEdit(r)}>
                    <td className="px-3 py-2 align-top text-xs text-slate-300">{r.id}</td>
                    <td className="px-3 py-2 align-top">
                      <input
                        value={view.name}
                        onChange={(ev) =>
                          setEdit((prev) => ({
                            ...prev,
                            [r.id]: { ...(prev[r.id] ?? view), name: ev.target.value },
                          }))
                        }
                        className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex items-center gap-2">
                        <input
                          value={view.segment}
                          onChange={(ev) =>
                            setEdit((prev) => ({
                              ...prev,
                              [r.id]: { ...(prev[r.id] ?? view), segment: ev.target.value.toUpperCase() },
                            }))
                          }
                          className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                          title={segmentLabelKo(view.segment)}
                        />
                        {shouldShowLabelKo(view.segment) && (
                          <span className="truncate text-xs text-slate-400" title={segmentLabelKo(view.segment)}>
                            {segmentLabelKo(view.segment)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <input
                        type="number"
                        value={view.priority}
                        onChange={(ev) =>
                          setEdit((prev) => ({
                            ...prev,
                            [r.id]: { ...(prev[r.id] ?? view), priority: Number(ev.target.value) || 0 },
                          }))
                        }
                        className="w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
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
                    <td className="hidden px-3 py-2 align-top xl:table-cell">
                      <textarea
                        value={view.conditionText}
                        onChange={(ev) =>
                          setEdit((prev) => ({
                            ...prev,
                            [r.id]: { ...(prev[r.id] ?? view), conditionText: ev.target.value },
                          }))
                        }
                        className="h-24 w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 font-mono text-xs text-slate-100"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => void onSave(r)}
                          disabled={updateMutation.isPending}
                        >
                          저장
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => void deleteMutation.mutateAsync(r.id)}
                          disabled={deleteMutation.isPending}
                        >
                          삭제
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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

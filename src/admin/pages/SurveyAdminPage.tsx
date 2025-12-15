import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AdminSurvey,
  AdminSurveyDetail,
  AdminSurveyTrigger,
  AdminSurveyUpsertRequest,
  createAdminSurvey,
  fetchAdminSurveyDetail,
  fetchAdminSurveys,
  fetchAdminSurveyTriggers,
  updateAdminSurvey,
  upsertAdminSurveyTriggers,
} from "../api/adminSurveyApi";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";

const rewardPresets = [
  { label: "주사위 티켓 1장", value: { reward_type: "TICKET_DICE", amount: 1, toast_message: "주사위 티켓 지급" } },
  { label: "주사위 토큰 5개", value: { token_type: "DICE_TOKEN", amount: 5, toast_message: "주사위 토큰 5개 지급" } },
  { label: "쿠폰 1장", value: { reward_type: "COUPON", amount: 1, toast_message: "쿠폰 지급" } },
];

type RewardPreset = (typeof rewardPresets)[number];

const questionSchema = z.object({
  title: z.string().min(1, "질문 제목은 필수입니다"),
  question_type: z.string().min(1),
  order_index: z.number().int().nonnegative(),
  is_required: z.boolean().default(true),
  helper_text: z.string().optional().nullable(),
  randomize_group: z.string().optional().nullable(),
  config_json: z.record(z.any()).optional().nullable(),
  options: z.array(
    z.object({
      value: z.string().optional(),
      label: z.string().optional(),
      order_index: z.number().int().optional(),
      weight: z.number().int().optional(),
    })
  ),
});

const surveySchema = z.object({
  title: z.string().min(1, "제목은 필수입니다"),
  description: z.string().optional().nullable(),
  channel: z.string().default("GLOBAL"),
  status: z.string().default("DRAFT"),
  reward_json_text: z.string().optional().default(""),
  target_segment_json: z.record(z.any()).optional().nullable(),
  auto_launch: z.boolean().default(false),
  start_at: z.string().optional().nullable(),
  end_at: z.string().optional().nullable(),
  questions: z.array(questionSchema),
});

type SurveyFormValues = z.infer<typeof surveySchema>;

type TriggerFormValues = {
  items: Array<{
    trigger_type: string;
    trigger_config_json?: Record<string, unknown> | null;
    priority: number;
    cooldown_hours: number;
    max_per_user: number;
    is_active: boolean;
  }>;
};

const SurveyAdminPage: React.FC = () => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const listQuery = useQuery<{ items: AdminSurvey[] }>({
    queryKey: ["admin", "surveys"],
    queryFn: fetchAdminSurveys,
  });

  const detailQuery = useQuery<AdminSurveyDetail | undefined>({
    queryKey: ["admin", "surveys", selectedId],
    queryFn: () => fetchAdminSurveyDetail(selectedId as number),
    enabled: selectedId !== null,
  });

  const triggerQuery = useQuery<{ items: AdminSurveyTrigger[] }>({
    queryKey: ["admin", "surveys", selectedId, "triggers"],
    queryFn: () => fetchAdminSurveyTriggers(selectedId as number),
    enabled: selectedId !== null && isTriggerModalOpen,
  });

  const form = useForm<SurveyFormValues>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      title: "",
      description: "",
      channel: "GLOBAL",
      status: "DRAFT",
      reward_json_text: JSON.stringify({ reward_type: "TICKET_DICE", amount: 1, toast_message: "주사위 티켓 지급" }, null, 2),
      target_segment_json: {},
      auto_launch: false,
      start_at: "",
      end_at: "",
      questions: [],
    },
    mode: "onChange",
  });

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const triggerForm = useForm<TriggerFormValues>({
    defaultValues: { items: [] },
  });

  const { fields: triggerFields, append: appendTrigger, remove: removeTrigger } = useFieldArray({
    control: triggerForm.control,
    name: "items",
  });

  const upsertMutation = useMutation({
    mutationFn: (payload: AdminSurveyUpsertRequest) =>
      selectedId ? updateAdminSurvey(selectedId, payload) : createAdminSurvey(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "surveys"] });
      if (!selectedId) {
        setSelectedId(data.id);
      }
      setIsModalOpen(false);
    },
  });

  const triggerMutation = useMutation({
    mutationFn: () =>
      upsertAdminSurveyTriggers(
        selectedId as number,
        triggerForm.getValues().items.map((t) => ({
          trigger_type: t.trigger_type,
          trigger_config_json: t.trigger_config_json,
          priority: t.priority,
          cooldown_hours: t.cooldown_hours,
          max_per_user: t.max_per_user,
          is_active: t.is_active,
        }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "surveys", selectedId, "triggers"] });
      setIsTriggerModalOpen(false);
    },
  });
  
  const onPresetReward = (preset: RewardPreset) => {
    form.setValue("reward_json_text", JSON.stringify(preset.value, null, 2));
  };

  const openNewModal = () => {
    setSelectedId(null);
    form.reset();
    setIsModalOpen(true);
  };

  const openEditModal = (survey: AdminSurvey) => {
    setSelectedId(survey.id);
    if (detailQuery.data) {
      const s = detailQuery.data;
      form.reset({
        title: s.title,
        description: s.description,
        channel: s.channel,
        status: s.status,
        reward_json_text: JSON.stringify(s.reward_json ?? {}, null, 2),
        target_segment_json: s.target_segment_json,
        auto_launch: s.auto_launch,
        start_at: s.start_at ?? "",
        end_at: s.end_at ?? "",
        questions: s.questions.map((q) => ({
          title: q.title,
          question_type: q.question_type,
          order_index: q.order_index,
          is_required: q.is_required,
          helper_text: q.helper_text,
          randomize_group: q.randomize_group,
          config_json: q.config_json,
          options: q.options ?? [],
        })),
      });
    }
    setIsModalOpen(true);
  };

  const openTriggerModal = (survey: AdminSurvey) => {
    setSelectedId(survey.id);
    if (triggerQuery.data) {
      triggerForm.reset({ items: triggerQuery.data.items });
    }
    setIsTriggerModalOpen(true);
  };

  const onSubmit = form.handleSubmit((values) => {
    const { reward_json_text, ...rest } = values;

    let reward_json: Record<string, unknown> = {};
    const trimmed = reward_json_text?.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("JSON 객체 형태여야 합니다");
        }
        reward_json = parsed as Record<string, unknown>;
      } catch (err) {
        const message = err instanceof Error ? err.message : "JSON 파싱 실패";
        form.setError("reward_json_text", { type: "custom", message: `보상 JSON 오류: ${message}` });
        return;
      }
    }

    const payload: AdminSurveyUpsertRequest = {
      ...rest,
      reward_json,
      target_segment_json: rest.target_segment_json ?? {},
      start_at: rest.start_at && rest.start_at.trim() ? rest.start_at.trim() : null,
      end_at: rest.end_at && rest.end_at.trim() ? rest.end_at.trim() : null,
    };
    upsertMutation.mutate(payload);
  });

  const onSubmitTriggers = triggerForm.handleSubmit(() => {
    triggerMutation.mutate();
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">설문 관리</h1>
          <p className="text-sm text-slate-300">설문 생성/수정 및 트리거 관리</p>
        </div>
        <Button onClick={openNewModal}>새 설문 생성</Button>
      </div>

      {listQuery.isLoading && <p className="text-slate-300">설문을 불러오는 중...</p>}
      {listQuery.isError && <p className="text-red-300">설문 목록을 불러오지 못했습니다.</p>}

      {listQuery.data && listQuery.data.items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-emerald-800/40 bg-slate-900/70 shadow-lg shadow-emerald-900/30">
          <table className="min-w-full divide-y divide-emerald-800/60">
            <thead className="bg-emerald-900/40 text-left text-slate-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold">제목</th>
                <th className="px-4 py-3 text-sm font-semibold">채널</th>
                <th className="px-4 py-3 text-sm font-semibold">상태</th>
                <th className="px-4 py-3 text-sm font-semibold">질문수</th>
                <th className="px-4 py-3 text-sm font-semibold">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-800/40 text-slate-100">
              {listQuery.data.items.map((survey) => (
                <tr key={survey.id} className="hover:bg-emerald-900/20">
                  <td className="px-4 py-3 text-sm font-semibold">{survey.title}</td>
                  <td className="px-4 py-3 text-sm">{survey.channel}</td>
                  <td className="px-4 py-3 text-sm">{survey.status}</td>
                  <td className="px-4 py-3 text-sm">{survey.question_count}</td>
                  <td className="px-4 py-3 text-sm space-x-2">
                    <Button variant="secondary" onClick={() => openEditModal(survey)}>
                      수정
                    </Button>
                    <Button variant="secondary" onClick={() => openTriggerModal(survey)}>
                      트리거
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="설문 편집">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-sm text-slate-200">제목</label>
            <input
              className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50"
              {...form.register("title")}
            />
            {form.formState.errors.title && <p className="text-sm text-red-300">{form.formState.errors.title.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-200">설명</label>
            <textarea
              className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50"
              rows={2}
              {...form.register("description")}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm text-slate-200">채널</label>
              <select className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50" {...form.register("channel")}>
                <option value="GLOBAL">GLOBAL</option>
                <option value="SEASON_PASS">SEASON_PASS</option>
                <option value="ROULETTE">ROULETTE</option>
                <option value="DICE">DICE</option>
                <option value="LOTTERY">LOTTERY</option>
                <option value="TEAM_BATTLE">TEAM_BATTLE</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-200">상태</label>
              <select className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50" {...form.register("status")}>
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-200">보상 설정</label>
            <div className="flex flex-wrap gap-2">
              {rewardPresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="rounded-full border border-emerald-600 px-3 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/40"
                  onClick={() => onPresetReward(preset)}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                className="rounded-full border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                onClick={() => form.setValue("reward_json_text", "{}", { shouldValidate: true, shouldDirty: true })}
              >
                보상 없음
              </button>
            </div>
            <textarea
              className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50"
              rows={3}
              {...form.register("reward_json_text")}
              placeholder='{"reward_type":"TICKET_DICE","amount":1,"toast_message":"주사위 티켓 지급"}'
            />
            {form.formState.errors.reward_json_text && <p className="text-sm text-red-300">{form.formState.errors.reward_json_text.message}</p>}
            <p className="text-xs text-slate-400">버튼 클릭 시 위 입력란에 JSON이 채워집니다. 필요하면 직접 수정하세요.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">질문</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  appendQuestion({
                    title: "새 질문",
                    question_type: "SINGLE_CHOICE",
                    order_index: questionFields.length,
                    is_required: true,
                    options: [],
                  })
                }
              >
                질문 추가
              </Button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {questionFields.map((field, idx) => (
                <div key={field.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-100">Q{idx + 1}</p>
                    <Button variant="secondary" type="button" onClick={() => removeQuestion(idx)}>
                      제거
                    </Button>
                  </div>
                  <input
                    className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50"
                    {...form.register(`questions.${idx}.title` as const)}
                    placeholder="질문 제목"
                  />
                  <select
                    className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50"
                    {...form.register(`questions.${idx}.question_type` as const)}
                  >
                    <option value="SINGLE_CHOICE">SINGLE_CHOICE</option>
                    <option value="MULTI_CHOICE">MULTI_CHOICE</option>
                    <option value="LIKERT">LIKERT</option>
                    <option value="TEXT">TEXT</option>
                    <option value="NUMBER">NUMBER</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      className="rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50"
                      {...form.register(`questions.${idx}.order_index` as const, { valueAsNumber: true })}
                      placeholder="순서"
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                      <input type="checkbox" {...form.register(`questions.${idx}.is_required` as const)} /> 필수
                    </label>
                  </div>
                  <textarea
                    className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50"
                    rows={2}
                    {...form.register(`questions.${idx}.helper_text` as const)}
                    placeholder="도움말"
                  />
                  <div className="space-y-1">
                    <p className="text-xs text-slate-300">옵션</p>
                    <button
                      type="button"
                      className="rounded-full border border-emerald-600 px-2 py-1 text-[11px] text-emerald-100"
                      onClick={() =>
                        form.setValue(`questions.${idx}.options` as const, [
                          ...(form.getValues(`questions.${idx}.options` as const) ?? []),
                          { label: "옵션", value: "value" },
                        ])
                      }
                    >
                      옵션 추가
                    </button>
                    <div className="space-y-2">
                      {(form.watch(`questions.${idx}.options`) || []).map((opt, optIdx) => (
                        <div key={optIdx} className="grid grid-cols-2 gap-2">
                          <input
                            className="rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50"
                            value={opt.label || ""}
                            onChange={(e) => {
                              const next = [...(form.getValues(`questions.${idx}.options`) || [])];
                              next[optIdx] = { ...next[optIdx], label: e.target.value };
                              form.setValue(`questions.${idx}.options`, next);
                            }}
                            placeholder="라벨"
                          />
                          <input
                            className="rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50"
                            value={opt.value || ""}
                            onChange={(e) => {
                              const next = [...(form.getValues(`questions.${idx}.options`) || [])];
                              next[optIdx] = { ...next[optIdx], value: e.target.value };
                              form.setValue(`questions.${idx}.options`, next);
                            }}
                            placeholder="값"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              닫기
            </Button>
            <Button type="submit" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "저장 중..." : selectedId ? "수정" : "생성"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={isTriggerModalOpen} onClose={() => setIsTriggerModalOpen(false)} title="트리거 관리">
        <form className="space-y-3" onSubmit={onSubmitTriggers}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-200">트리거</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                appendTrigger({
                  trigger_type: "LEVEL_UP",
                  trigger_config_json: {},
                  priority: 100,
                  cooldown_hours: 24,
                  max_per_user: 1,
                  is_active: true,
                })
              }
            >
              트리거 추가
            </Button>
          </div>
          {triggerFields.length === 0 && <p className="text-sm text-slate-300">등록된 트리거가 없습니다.</p>}
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {triggerFields.map((field, idx) => (
              <div key={field.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-100">트리거 {idx + 1}</p>
                  <Button variant="secondary" type="button" onClick={() => removeTrigger(idx)}>
                    제거
                  </Button>
                </div>
                <select
                  className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50"
                  {...triggerForm.register(`items.${idx}.trigger_type` as const)}
                >
                  <option value="LEVEL_UP">LEVEL_UP</option>
                  <option value="INACTIVE_DAYS">INACTIVE_DAYS</option>
                  <option value="GAME_RESULT">GAME_RESULT</option>
                  <option value="MANUAL_PUSH">MANUAL_PUSH</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    className="rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50"
                    {...triggerForm.register(`items.${idx}.priority` as const, { valueAsNumber: true })}
                    placeholder="priority"
                  />
                  <input
                    type="number"
                    className="rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50"
                    {...triggerForm.register(`items.${idx}.cooldown_hours` as const, { valueAsNumber: true })}
                    placeholder="cooldown_hours"
                  />
                  <input
                    type="number"
                    className="rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50"
                    {...triggerForm.register(`items.${idx}.max_per_user` as const, { valueAsNumber: true })}
                    placeholder="max_per_user"
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-200">
                    <input type="checkbox" {...triggerForm.register(`items.${idx}.is_active` as const)} /> 활성
                  </label>
                </div>
                <textarea
                  className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50"
                  rows={2}
                  {...triggerForm.register(`items.${idx}.trigger_config_json` as const)}
                  placeholder='{"level_min":3}'
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setIsTriggerModalOpen(false)}>
              닫기
            </Button>
            <Button type="submit" disabled={triggerMutation.isPending}>
              {triggerMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
};

export default SurveyAdminPage;

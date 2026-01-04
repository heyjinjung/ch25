import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DiceEventParams, getEventParams, updateEventParams } from "../api/adminDiceApi";
import { useToast } from "../../components/common/ToastProvider";

const eventSchema = z.object({
    is_active: z.boolean(),
    p_win: z.number().min(0, "0 이상").max(1, "1 이하"),
    p_draw: z.number().min(0, "0 이상").max(1, "1 이하"),
    p_lose: z.number().min(0, "0 이상").max(1, "1 이하"),
    win_reward: z.number().int(),
    draw_reward: z.number().int(),
    lose_reward: z.number().int(),
    daily_gain: z.number().int().optional(),
    daily_plays: z.number().int().optional(),
    blocklist: z.string(), // comma separated tags
});

type EventFormValues = z.infer<typeof eventSchema>;

const DiceEventConfig: React.FC = () => {
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    // Fetch API
    const { data, isLoading, isError } = useQuery({
        queryKey: ["admin", "dice", "event-params"],
        queryFn: getEventParams,
    });

    const form = useForm<EventFormValues>({
        resolver: zodResolver(eventSchema),
        defaultValues: {
            is_active: false,
            p_win: 0,
            p_draw: 0,
            p_lose: 0,
            win_reward: 0,
            draw_reward: 0,
            lose_reward: 0,
            daily_gain: undefined,
            daily_plays: undefined,
            blocklist: "",
        },
    });

    // Sync data to form
    useEffect(() => {
        if (data) {
            form.reset({
                is_active: data.is_active,
                p_win: data.probability?.DICE?.p_win ?? 0,
                p_draw: data.probability?.DICE?.p_draw ?? 0,
                p_lose: data.probability?.DICE?.p_lose ?? 0,
                win_reward: data.game_earn_config?.DICE?.WIN ?? 0,
                draw_reward: data.game_earn_config?.DICE?.DRAW ?? 0,
                lose_reward: data.game_earn_config?.DICE?.LOSE ?? 0,
                daily_gain: data.caps?.DICE?.daily_gain,
                daily_plays: data.caps?.DICE?.daily_plays,
                blocklist: (data.eligibility?.tags?.blocklist ?? []).join(", "),
            });
        }
    }, [data, form]);

    // Mutation
    const mutation = useMutation({
        mutationFn: updateEventParams,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "dice", "event-params"] });
            addToast("이벤트 설정 저장 완료", "success");
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.detail ?? "저장 실패";
            addToast(msg, "error");
        },
    });

    const onSubmit = form.handleSubmit((values) => {
        // Reconstruct payload
        const payload: DiceEventParams = {
            is_active: values.is_active,
            probability: {
                DICE: {
                    p_win: values.p_win,
                    p_draw: values.p_draw,
                    p_lose: values.p_lose,
                },
            },
            game_earn_config: {
                DICE: {
                    WIN: values.win_reward,
                    DRAW: values.draw_reward,
                    LOSE: values.lose_reward,
                },
            },
            caps: {
                DICE: {
                    daily_gain: values.daily_gain,
                    daily_plays: values.daily_plays,
                },
            },
            eligibility: {
                tags: {
                    blocklist: values.blocklist
                        ? values.blocklist.split(",").map((s) => s.trim()).filter(Boolean)
                        : [],
                },
            },
        };
        mutation.mutate(payload);
    });

    if (isLoading) return <div className="text-gray-400">Loading Event Config...</div>;
    if (isError) return <div className="text-red-400">Failed to load event config.</div>;

    return (
        <div className="rounded-lg border border-[#333333] bg-[#111111] p-6 shadow-md">
            <div className="mb-4">
                <h3 className="text-lg font-bold text-[#91F402]">피크 타임 이벤트 설정</h3>
                <p className="text-sm text-gray-400">특정 시간대에 적용되는 이벤트 확률 및 보상 설정입니다.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="event_active"
                        className="h-5 w-5 rounded border-gray-600 bg-[#1A1A1A] text-[#91F402] focus:ring-[#2D6B3B]"
                        {...form.register("is_active")}
                    />
                    <label htmlFor="event_active" className="text-white font-medium">이벤트 활성화</label>
                </div>

                {/* Probabilities */}
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-300">확률 (0.0 ~ 1.0)</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500">승리 (Win)</label>
                            <input
                                type="number"
                                step="0.0001"
                                className="w-full rounded border border-[#333333] bg-[#1A1A1A] p-2 text-white"
                                {...form.register("p_win", { valueAsNumber: true })}
                            />
                            <p className="text-xs text-red-400">{form.formState.errors.p_win?.message}</p>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">무승부 (Draw)</label>
                            <input
                                type="number"
                                step="0.0001"
                                className="w-full rounded border border-[#333333] bg-[#1A1A1A] p-2 text-white"
                                {...form.register("p_draw", { valueAsNumber: true })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">패배 (Lose)</label>
                            <input
                                type="number"
                                step="0.0001"
                                className="w-full rounded border border-[#333333] bg-[#1A1A1A] p-2 text-white"
                                {...form.register("p_lose", { valueAsNumber: true })}
                            />
                        </div>
                    </div>
                </div>

                {/* Rewards */}
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-300">보상 (금고 포인트)</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500">승리 보상</label>
                            <input
                                type="number"
                                className="w-full rounded border border-[#333333] bg-[#1A1A1A] p-2 text-white"
                                {...form.register("win_reward", { valueAsNumber: true })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">무승부 보상</label>
                            <input
                                type="number"
                                className="w-full rounded border border-[#333333] bg-[#1A1A1A] p-2 text-white"
                                {...form.register("draw_reward", { valueAsNumber: true })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">패배 보상 (차감)</label>
                            <input
                                type="number"
                                className="w-full rounded border border-[#333333] bg-[#1A1A1A] p-2 text-white"
                                {...form.register("lose_reward", { valueAsNumber: true })}
                            />
                        </div>
                    </div>
                </div>

                {/* Caps & Eligibility */}
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-300">제한 및 조건</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500">일일 최대 획득 상한 (포인트)</label>
                            <input
                                type="number"
                                className="w-full rounded border border-[#333333] bg-[#1A1A1A] p-2 text-white"
                                {...form.register("daily_gain", { valueAsNumber: true })}
                                placeholder="예: 50000"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">일일 최대 플레이 횟수</label>
                            <input
                                type="number"
                                className="w-full rounded border border-[#333333] bg-[#1A1A1A] p-2 text-white"
                                {...form.register("daily_plays", { valueAsNumber: true })}
                                placeholder="예: 30"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-500">차단 태그 (콤마로 구분)</label>
                            <input
                                type="text"
                                className="w-full rounded border border-[#333333] bg-[#1A1A1A] p-2 text-white"
                                {...form.register("blocklist")}
                                placeholder="예: BLACKLIST, ABUSER"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="rounded bg-[#2D6B3B] px-6 py-2 font-bold text-white hover:bg-[#91F402] hover:text-black disabled:opacity-50"
                    >
                        {mutation.isPending ? "저장 중..." : "설정 저장"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DiceEventConfig;

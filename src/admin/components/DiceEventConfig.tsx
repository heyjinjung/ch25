import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DiceEventParams, getEventParams, updateEventParams } from "../api/adminDiceApi";
import { useToast } from "../../components/common/ToastProvider";

const eventSchema = z.object({
    is_active: z.boolean(),
    p_win: z.number().min(0, "0 ?´ìƒ").max(1, "1 ?´í•˜"),
    p_draw: z.number().min(0, "0 ?´ìƒ").max(1, "1 ?´í•˜"),
    p_lose: z.number().min(0, "0 ?´ìƒ").max(1, "1 ?´í•˜"),
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
            addToast("?´ë²¤???¤ì • ?€???„ë£Œ", "success");
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.detail ?? "?€???¤íŒ¨";
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
        <div className="admin-card p-6">
            <div className="mb-6">
                <h3 className="text-admin-subtitle text-admin-text-primary">ì£¼ì‚¬???´ë²¤???¤ì •</h3>
                <p className="mt-1 text-admin-meta text-admin-text-secondary">
                    ?´ë²¤???•ë¥ /ë³´ìƒ/?œí•œ ì¡°ê±´??ê´€ë¦¬í•©?ˆë‹¤. (ë³´ìƒ?€ ê¸ˆê³  ? ê¸ˆ ?”ê³ ??ë°˜ì˜)
                </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-6">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="event_active"
                        className="h-5 w-5 rounded border border-admin-border bg-admin-sidebar/50 text-admin-accent focus:ring-2 focus:ring-admin-brand/40"
                        {...form.register("is_active")}
                    />
                    <label htmlFor="event_active" className="text-admin-body font-bold text-admin-text-primary">
                        ?´ë²¤???œì„±??
                    </label>
                </div>

                {/* Probabilities */}
                <div className="space-y-2">
                    <h4 className="text-admin-body font-bold text-admin-text-primary">?•ë¥  (0.0 ~ 1.0)</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="admin-label">?¹ë¦¬ (Win)</label>
                            <input
                                type="number"
                                step="0.0001"
                                className="admin-input w-full"
                                {...form.register("p_win", { valueAsNumber: true })}
                            />
                            <p className="mt-1 text-admin-meta text-admin-danger">{form.formState.errors.p_win?.message}</p>
                        </div>
                        <div>
                            <label className="admin-label">ë¬´ìŠ¹ë¶€ (Draw)</label>
                            <input
                                type="number"
                                step="0.0001"
                                className="admin-input w-full"
                                {...form.register("p_draw", { valueAsNumber: true })}
                            />
                        </div>
                        <div>
                            <label className="admin-label">?¨ë°° (Lose)</label>
                            <input
                                type="number"
                                step="0.0001"
                                className="admin-input w-full"
                                {...form.register("p_lose", { valueAsNumber: true })}
                            />
                        </div>
                    </div>
                </div>

                {/* Rewards */}
                <div className="space-y-2">
                    <h4 className="text-admin-body font-bold text-admin-text-primary">ë³´ìƒ (ê¸ˆê³  ? ê¸ˆ)</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="admin-label">?¹ë¦¬ ë³´ìƒ</label>
                            <input
                                type="number"
                                className="admin-input w-full"
                                {...form.register("win_reward", { valueAsNumber: true })}
                            />
                        </div>
                        <div>
                            <label className="admin-label">ë¬´ìŠ¹ë¶€ ë³´ìƒ</label>
                            <input
                                type="number"
                                className="admin-input w-full"
                                {...form.register("draw_reward", { valueAsNumber: true })}
                            />
                        </div>
                        <div>
                            <label className="admin-label">?¨ë°° ë³´ìƒ (ì°¨ê°)</label>
                            <input
                                type="number"
                                className="admin-input w-full"
                                {...form.register("lose_reward", { valueAsNumber: true })}
                            />
                        </div>
                    </div>
                </div>

                {/* Caps & Eligibility */}
                <div className="space-y-2">
                    <h4 className="text-admin-body font-bold text-admin-text-primary">?œí•œ/ì¡°ê±´</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="admin-label">?¼ì¼ ìµœë? ?ë“ ?œí•œ (ì½”ì¸)</label>
                            <input
                                type="number"
                                className="admin-input w-full"
                                {...form.register("daily_gain", { valueAsNumber: true })}
                                placeholder="?? 50000"
                            />
                        </div>
                        <div>
                            <label className="admin-label">?¼ì¼ ìµœë? ?Œë ˆ???Ÿìˆ˜</label>
                            <input
                                type="number"
                                className="admin-input w-full"
                                {...form.register("daily_plays", { valueAsNumber: true })}
                                placeholder="?? 30"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="admin-label">ì°¨ë‹¨ ?œê·¸ (ì½¤ë§ˆë¡?êµ¬ë¶„)</label>
                            <input
                                type="text"
                                className="admin-input w-full"
                                {...form.register("blocklist")}
                                placeholder="?? BLACKLIST, ABUSER"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="btn-admin-primary disabled:opacity-50"
                    >
                        {mutation.isPending ? "?€??ì¤?.." : "?¤ì • ?€??}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DiceEventConfig;

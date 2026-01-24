// src/admin/pages/SurveyDetailEditorPage.tsx
import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import {
    FileText,
    Save,
    ChevronLeft,
    Plus,
    Trash2,
    GripVertical,
    Settings,
    HelpCircle,
    Gift,
    Users,
    AlertCircle,
    RefreshCw
} from "lucide-react";
import {
    fetchAdminSurveyDetail,
    createAdminSurvey,
    updateAdminSurvey,
    AdminSurveyUpsertRequest
} from "../api/adminSurveyApi";

const SurveyDetailEditorPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEdit = !!id;

    const { data: surveyDetail, isLoading } = useQuery({
        queryKey: ["admin", "survey", id],
        queryFn: () => fetchAdminSurveyDetail(Number(id)),
        enabled: isEdit,
    });

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<AdminSurveyUpsertRequest>({
        defaultValues: {
            title: "",
            description: "",
            channel: "MAIN",
            status: "DRAFT",
            reward_json: {},
            target_segment_json: {},
            auto_launch: false,
            questions: [
                {
                    title: "",
                    question_type: "SINGLE_CHOICE",
                    order_index: 0,
                    is_required: true,
                    options: [{ label: "?µÏÖò 1", value: "1", order_index: 0 }],
                }
            ],
        },
    });

    const { fields, append, remove, move } = useFieldArray({
        control,
        name: "questions",
    });

    useEffect(() => {
        if (surveyDetail) {
            reset({
                title: surveyDetail.title,
                description: surveyDetail.description || "",
                channel: surveyDetail.channel,
                status: surveyDetail.status,
                reward_json: surveyDetail.reward_json || {},
                target_segment_json: surveyDetail.target_segment_json || {},
                auto_launch: surveyDetail.auto_launch || false,
                start_at: surveyDetail.start_at || undefined,
                end_at: surveyDetail.end_at || undefined,
                questions: surveyDetail.questions.map(q => ({
                    title: q.title,
                    question_type: q.question_type,
                    order_index: q.order_index,
                    is_required: q.is_required,
                    helper_text: q.helper_text || "",
                    options: q.options.map(opt => ({
                        label: opt.label,
                        value: opt.value,
                        order_index: opt.order_index,
                        weight: opt.weight
                    }))
                }))
            });
        }
    }, [surveyDetail, reset]);

    const upsertMutation = useMutation({
        mutationFn: (data: AdminSurveyUpsertRequest) =>
            isEdit ? updateAdminSurvey(Number(id), data) : createAdminSurvey(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "surveys"] });
            navigate("/admin/surveys");
        },
    });

    const onSubmit = (data: AdminSurveyUpsertRequest) => {
        // Ensure order indices are correct
        const payload = {
            ...data,
            questions: data.questions.map((q, idx) => ({
                ...q,
                order_index: idx,
                options: q.options.map((opt, optIdx) => ({
                    ...opt,
                    order_index: optIdx
                }))
            }))
        };
        upsertMutation.mutate(payload);
    };

    if (isEdit && isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <RefreshCw className="h-10 w-10 text-admin-brand animate-spin" />
            </div>
        );
    }

    return (
        <div className="admin-page-container space-y-8 pb-20">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/admin/surveys")}
                        className="p-2 rounded-xl bg-admin-card border border-admin-border hover:bg-admin-hover transition-all"
                        aria-label="?§Î¨∏ Î™©Î°ù?ºÎ°ú ?¥Îèô"
                        title="?§Î¨∏ Î™©Î°ù?ºÎ°ú ?¥Îèô"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-admin-brand">
                            <FileText className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Survey Editor</span>
                        </div>
                        <h1 className="text-2xl font-black text-admin-text-primary">
                            {isEdit ? "?§Î¨∏ ?òÏ†ï" : "???§Î¨∏ ?ùÏÑ±"}
                        </h1>
                    </div>
                </div>
                <button
                    onClick={handleSubmit(onSubmit)}
                    disabled={upsertMutation.isPending}
                    className="btn-admin-primary px-8 shadow-admin-glow"
                >
                    {upsertMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    {isEdit ? "Î≥ÄÍ≤ΩÏÇ¨???Ä?? : "?§Î¨∏ ?ùÏÑ± Î∞?Î∞∞Ìè¨"}
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Basic Settings */}
                <form className="lg:col-span-2 space-y-8">
                    <section className="admin-card-premium p-8 space-y-6">
                        <div className="flex items-center gap-2 border-b border-admin-border pb-4 mb-2">
                            <Settings className="h-5 w-5 text-admin-brand" />
                            <h2 className="text-lg font-black font-brand">Í∏∞Î≥∏ ?§Ï†ï</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="admin-label">?§Î¨∏ ?úÎ™©</label>
                                <Controller
                                    name="title"
                                    control={control}
                                    rules={{ required: "?úÎ™©?Ä ?ÑÏàò?ÖÎãà?? }}
                                    render={({ field }) => (
                                        <input
                                            {...field}
                                            className="admin-input w-full"
                                            placeholder="?åÏõê ÎßåÏ°±??Ï°∞ÏÇ¨ (2024.01)"
                                        />
                                    )}
                                />
                                {errors.title && <p className="text-xs text-admin-danger flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.title.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="admin-label">?§Î¨∏ ?§Î™Ö (?†Ï??êÍ≤å ?∏Ï∂ú)</label>
                                <Controller
                                    name="description"
                                    control={control}
                                    render={({ field: { value, ...rest } }) => (
                                        <textarea
                                            {...rest}
                                            value={value || ""}
                                            className="admin-textarea w-full min-h-[100px]"
                                            placeholder="?§Î¨∏??Ï∞∏Ïó¨?òÏãúÎ©??åÏ†ï??Î≥¥ÏÉÅ???úÎ¶Ω?àÎã§."
                                        />
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="admin-label">Î∞∞Ìè¨ Ï±ÑÎÑê</label>
                                    <Controller
                                        name="channel"
                                        control={control}
                                        render={({ field }) => (
                                            <select {...field} className="admin-input w-full bg-admin-sidebar">
                                                <option value="MAIN">Î©îÏù∏ Î°úÎπÑ</option>
                                                <option value="DICE">Ï£ºÏÇ¨??/option>
                                                <option value="LOTTERY">Î°úÎòê</option>
                                                <option value="VAULT">Í∏àÍ≥†</option>
                                            </select>
                                        )}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="admin-label">?ÅÌÉú</label>
                                    <Controller
                                        name="status"
                                        control={control}
                                        render={({ field }) => (
                                            <select {...field} className="admin-input w-full bg-admin-sidebar">
                                                <option value="DRAFT">?ëÏÑ± Ï§?(DRAFT)</option>
                                                <option value="ACTIVE">?úÏÑ± (ACTIVE)</option>
                                                <option value="PAUSED">?ºÏãú Ï§ëÏ? (PAUSED)</option>
                                                <option value="ARCHIVED">Ï¢ÖÎ£å (ARCHIVED)</option>
                                            </select>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Questions Section */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between pl-1">
                            <h2 className="text-xl font-black flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-admin-brand" /> ÏßàÎ¨∏ Íµ¨ÏÑ±
                            </h2>
                            <button
                                type="button"
                                onClick={() => append({ title: "", question_type: "SINGLE_CHOICE", order_index: fields.length, is_required: true, options: [] })}
                                className="btn-admin-secondary py-2 text-xs"
                            >
                                <Plus className="h-3 w-3" /> ÏßàÎ¨∏ Ï∂îÍ?
                            </button>
                        </div>

                        <div className="space-y-6">
                            {fields.map((field, index) => (
                                <QuestionItem
                                    key={field.id}
                                    index={index}
                                    control={control}
                                    remove={() => remove(index)}
                                    moveUp={index > 0 ? () => move(index, index - 1) : undefined}
                                />
                            ))}
                        </div>
                    </section>
                </form>

                {/* Right Column: Reward & Targeting */}
                <div className="space-y-8">
                    <section className="admin-card-premium p-6 space-y-6">
                        <div className="flex items-center gap-2 border-b border-admin-border pb-4">
                            <Gift className="h-5 w-5 text-admin-accent" />
                            <h2 className="text-lg font-black font-brand">Ï∞∏Ïó¨ Î≥¥ÏÉÅ ?§Ï†ï</h2>
                        </div>
                        <p className="text-[10px] text-admin-text-muted leading-relaxed">
                            JSON ?ïÌÉúÎ°?Î≥¥ÏÉÅ???§Ï†ï?©Îãà?? ?? {"{ \"gold_key\": 1 }"}
                        </p>
                        <Controller
                            name="reward_json"
                            control={control}
                            render={({ field }) => (
                                <textarea
                                    className="admin-textarea min-h-[120px] font-mono text-xs"
                                    aria-label="Ï∞∏Ïó¨ Î≥¥ÏÉÅ ?§Ï†ï(JSON)"
                                    title="Ï∞∏Ïó¨ Î≥¥ÏÉÅ ?§Ï†ï(JSON)"
                                    value={JSON.stringify(field.value, null, 2)}
                                    onChange={(e) => {
                                        try {
                                            field.onChange(JSON.parse(e.target.value));
                                        } catch {
                                            // Invalid JSON: ignore
                                        }
                                    }}
                                />
                            )}
                        />
                    </section>

                    <section className="admin-card-premium p-6 space-y-6">
                        <div className="flex items-center gap-2 border-b border-admin-border pb-4">
                            <Users className="h-5 w-5 text-admin-brand" />
                            <h2 className="text-lg font-black font-brand">?ÄÍ≤üÌåÖ ?§Ï†ï</h2>
                        </div>
                        <p className="text-[10px] text-admin-text-muted leading-relaxed">
                            ?πÏ†ï ?∏Í∑∏Î®ºÌä∏?êÎßå ?∏Ï∂ú??Í≤ΩÏö∞ ?§Ï†ï?©Îãà?? ÎπÑÏõå??Í≤ΩÏö∞ ?ÑÏ≤¥ ?∏Ï∂ú?©Îãà??
                        </p>
                        <Controller
                            name="target_segment_json"
                            control={control}
                            render={({ field }) => (
                                <textarea
                                    className="admin-textarea min-h-[120px] font-mono text-xs"
                                    aria-label="?ÄÍ≤üÌåÖ ?§Ï†ï(JSON)"
                                    title="?ÄÍ≤üÌåÖ ?§Ï†ï(JSON)"
                                    value={JSON.stringify(field.value, null, 2)}
                                    onChange={(e) => {
                                        try {
                                            field.onChange(JSON.parse(e.target.value));
                                        } catch {
                                            // Invalid JSON: ignore
                                        }
                                    }}
                                />
                            )}
                        />
                    </section>
                </div>
            </div>
        </div>
    );
};

const QuestionItem: React.FC<{
    index: number;
    control: any;
    remove: () => void;
    moveUp?: () => void;
}> = ({ index, control, remove, moveUp }) => {
    const { fields: options, append: appendOption, remove: removeOption } = useFieldArray({
        control,
        name: `questions.${index}.options`,
    });

    const questionType = useWatch({
        control,
        name: `questions.${index}.question_type`,
    });

    return (
        <div className="admin-card-premium p-6 space-y-6 border-l-4 border-l-admin-brand">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                        <button
                            type="button"
                            onClick={moveUp}
                            disabled={!moveUp}
                            className="p-1 hover:bg-admin-hover rounded disabled:opacity-20"
                            aria-label="ÏßàÎ¨∏ ?úÏÑú ?¨Î¶¨Í∏?
                            title="ÏßàÎ¨∏ ?úÏÑú ?¨Î¶¨Í∏?
                        >
                            <GripVertical className="h-4 w-4 rotate-0" />
                        </button>
                    </div>
                    <span className="text-admin-brand font-black italic">Q{index + 1}</span>
                </div>
                <button
                    type="button"
                    onClick={remove}
                    className="p-2 text-admin-text-muted hover:text-admin-danger transition-colors"
                    aria-label="ÏßàÎ¨∏ ??†ú"
                    title="ÏßàÎ¨∏ ??†ú"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 space-y-2">
                    <label className="admin-label">ÏßàÎ¨∏ ?çÏä§??/label>
                    <Controller
                        name={`questions.${index}.title`}
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                            <input {...field} className="admin-input w-full font-bold" placeholder="?úÎπÑ?§Ïóê ?Ä?¥ÏÑú ?¥ÎñªÍ≤??ùÍ∞Å?òÏãú?òÏöî?" />
                        )}
                    />
                </div>
                <div className="space-y-2">
                    <label className="admin-label">ÏßàÎ¨∏ ?Ä??/label>
                    <Controller
                        name={`questions.${index}.question_type`}
                        control={control}
                        render={({ field }) => (
                            <select {...field} className="admin-input w-full bg-admin-sidebar">
                                <option value="SINGLE_CHOICE">Í∞ùÍ???(Single Choice)</option>
                                <option value="MULTI_CHOICE">Í∞ùÍ???(Multi Choice)</option>
                                <option value="TEXT">Ï£ºÍ???(Text)</option>
                                <option value="LIKERT">?âÏ†ê (Likert)</option>
                            </select>
                        )}
                    />
                </div>
            </div>

            {(questionType === "SINGLE_CHOICE" || questionType === "MULTI_CHOICE") && (
                <div className="space-y-3 bg-admin-sidebar/30 p-4 rounded-xl">
                    <label className="admin-label text-[10px] text-admin-brand">Í∞ùÍ????µÏÖò ?§Ï†ï</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {options.map((optField, optIdx) => (
                            <div key={optField.id} className="flex gap-2 items-center">
                                <Controller
                                    name={`questions.${index}.options.${optIdx}.label`}
                                    control={control}
                                    render={({ field }) => (
                                        <input {...field} className="admin-input flex-1 h-9 text-xs" placeholder={`?µÏÖò ${optIdx + 1}`} />
                                    )}
                                />
                                <Controller
                                    name={`questions.${index}.options.${optIdx}.value`}
                                    control={control}
                                    render={({ field }) => (
                                        <input {...field} className="admin-input w-16 h-9 text-xs font-mono" placeholder="Value" />
                                    )}
                                />
                                <button
                                    type="button"
                                    onClick={() => removeOption(optIdx)}
                                    className="p-1.5 text-admin-text-muted hover:text-admin-danger"
                                    aria-label={`?µÏÖò ${optIdx + 1} ??†ú`}
                                    title={`?µÏÖò ${optIdx + 1} ??†ú`}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => appendOption({ label: "", value: String(options.length + 1), order_index: options.length })}
                            className="flex items-center justify-center gap-2 border-2 border-dashed border-admin-border rounded-lg h-9 text-[10px] font-black text-admin-text-muted hover:border-admin-brand hover:text-admin-brand transition-all"
                        >
                            <Plus className="h-3 w-3" /> ?µÏÖò Ï∂îÍ?
                        </button>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <Controller
                        name={`questions.${index}.is_required`}
                        control={control}
                        render={({ field: { value, onChange } }) => (
                            <input
                                type="checkbox"
                                checked={value}
                                onChange={(e) => onChange(e.target.checked)}
                                className="w-4 h-4 rounded border-admin-border bg-admin-sidebar text-admin-brand focus:ring-admin-brand/40"
                            />
                        )}
                    />
                    <span className="text-xs font-bold text-admin-text-secondary group-hover:text-admin-text-primary transition-colors">?ÑÏàò ?µÎ? ?¨Î?</span>
                </label>
            </div>
        </div>
    );
};


export default SurveyDetailEditorPage;

import { useState, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatKstDateTime } from "../../utils/kstTime";
import {
    Send,
    Users,
    Tag,
    User,
    Trash2,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Clock,
    Edit3
} from "lucide-react";
import {
    fetchMessages,
    sendMessage,
    SendMessagePayload,
    deleteMessage,
    AdminMessage,
    updateMessage,
    UpdateMessagePayload
} from "../api/adminMessageApi";
import { fetchSegmentRules } from "../api/adminSegmentRulesApi";

const messageSchema = z.object({
    title: z.string().min(1, "?쒕ぉ???낅젰?댁＜?몄슂"),
    content: z.string().min(1, "?댁슜???낅젰?댁＜?몄슂"),
    target_type: z.enum(["ALL", "SEGMENT", "TAG", "USER"] as const),
    target_value: z.string().optional(),
    channels: z.array(z.string()).optional(),
});

type MessageFormData = z.infer<typeof messageSchema>;

export const MessageCenterPage: React.FC = () => {
    const queryClient = useQueryClient();
    const page = 0;
    const [editingMessage, setEditingMessage] = useState<AdminMessage | null>(null);

    const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<MessageFormData>({
        resolver: zodResolver(messageSchema),
        defaultValues: {
            title: "",
            content: "",
            target_type: "ALL",
            target_value: "",
            channels: ["telegram"],
        },
    });

    const watchedTargetType = useWatch({
        control,
        name: "target_type",
    });

    const { data: messages, isLoading } = useQuery({
        queryKey: ["admin", "messages", page],
        queryFn: () => fetchMessages(page * 50, 50),
    });

    const { data: segmentRules } = useQuery({
        queryKey: ["admin", "segment-rules"],
        queryFn: fetchSegmentRules,
        staleTime: 1000 * 60 * 5,
    });

    const distinctSegments = useMemo(() => {
        if (!segmentRules) return [];
        return Array.from(new Set(segmentRules.map(r => r.segment))).sort();
    }, [segmentRules]);

    const sendMutation = useMutation({
        mutationFn: (payload: SendMessagePayload) => sendMessage(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
            reset();
        },
    });

    const updateMutation = useMutation({
        mutationFn: (vars: { id: number; payload: UpdateMessagePayload }) => updateMessage(vars.id, vars.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
            handleCancelEdit();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (messageId: number) => deleteMessage(messageId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
        },
    });

    const handleEdit = (msg: AdminMessage) => {
        setEditingMessage(msg);
        setValue("title", msg.title);
        setValue("content", msg.content);
        setValue("target_type", msg.target_type);
        setValue("target_value", msg.target_value || "");
    };

    const handleCancelEdit = () => {
        setEditingMessage(null);
        reset();
    };

    const onSubmit = (data: MessageFormData) => {
        if (editingMessage) {
            updateMutation.mutate({
                id: editingMessage.id,
                payload: {
                    title: data.title,
                    content: data.content
                }
            });
        } else {
            const payload: SendMessagePayload = {
                title: data.title,
                content: data.content,
                target_type: data.target_type,
                target_value: data.target_value || undefined,
                channels: data.channels,
            };
            sendMutation.mutate(payload);
        }
    };

    return (
        <section className="admin-page-container space-y-10 pb-20">
            <header className="flex flex-col gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-admin-text-base tracking-tight uppercase">
                        硫붿떆吏 ?쇳꽣 <span className="text-admin-brand/40">Messages</span>
                    </h1>
                </div>
                <p className="text-admin-body text-admin-text-secondary font-medium">
                    ?뚯썝?먭쾶 硫붿떆吏瑜??꾩넚?섍퀬 ?꾩넚 ?댁뿭???ㅼ떆媛꾩쑝濡?議고쉶?⑸땲??
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form Area */}
                <div className="lg:col-span-2 space-y-8">
                    <form onSubmit={handleSubmit(onSubmit)} className="admin-card-premium p-8 space-y-8">
                        <div className="border-b border-admin-border pb-6">
                            <h2 className="text-admin-subtitle font-black text-admin-text-primary flex items-center gap-2">
                                {editingMessage ? (
                                    <>
                                        <Edit3 className="h-5 w-5 text-admin-brand" />
                                        硫붿떆吏 ?댁뿭 ?섏젙
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-5 w-5 text-admin-brand" />
                                        硫붿떆吏 ?꾩넚 ??
                                    </>
                                )}
                            </h2>
                            <p className="text-xs text-admin-text-secondary mt-1">
                                {editingMessage ? "?대? 諛쒖넚??硫붿떆吏???댁슜???섏젙?⑸땲?? ?좎? ?몃컯?ㅼ뿉??利됱떆 諛섏쁺?⑸땲??" : "諛쒖넚 ??곴낵 ?댁슜???뺥솗???낅젰?????꾩넚?섏꽭??"}
                            </p>
                        </div>

                        {/* Title */}
                        <div className="space-y-3">
                            <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest pl-1">硫붿떆吏 ?쒕ぉ</label>
                            <Controller
                                name="title"
                                control={control}
                                render={({ field }) => (
                                    <input
                                        {...field}
                                        type="text"
                                        placeholder="硫붿떆吏 ?쒕ぉ???낅젰?섏꽭??
                                        className="admin-input w-full h-11"
                                    />
                                )}
                            />
                            {errors.title && (
                                <p className="text-xs text-admin-danger flex items-center gap-1 pl-1">
                                    <AlertCircle className="h-3 w-3" /> {errors.title.message}
                                </p>
                            )}
                        </div>

                        {/* Content */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest pl-1">硫붿떆吏 ?댁슜</label>
                                <Controller
                                    name="content"
                                    control={control}
                                    render={({ field }) => (
                                        <span className={`text-[10px] font-bold ${field.value.length > 500 ? "text-admin-danger" : "text-admin-text-muted"}`}>
                                            {field.value.length} / 1000??
                                        </span>
                                    )}
                                />
                            </div>
                            <Controller
                                name="content"
                                control={control}
                                render={({ field }) => (
                                    <textarea
                                        {...field}
                                        placeholder="硫붿떆吏 ?댁슜???낅젰?섏꽭??(理쒕? 1000??"
                                        className="admin-textarea w-full resize-none custom-scrollbar"
                                    />
                                )}
                            />
                            {errors.content && (
                                <p className="text-xs text-admin-danger flex items-center gap-1 pl-1">
                                    <AlertCircle className="h-3 w-3" /> {errors.content.message}
                                </p>
                            )}
                        </div>

                        {/* Target Type */}
                        <div
                            className={`space-y-3 ${editingMessage ? "opacity-80 pointer-events-none" : ""}`}
                            title={editingMessage ? "?섏젙 ??諛쒖넚 ???蹂寃쎌? 遺덇??ν빀?덈떎." : ""}
                        >
                            <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest pl-1">諛쒖넚 ???/label>
                            <Controller
                                name="target_type"
                                control={control}
                                render={({ field }) => (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { value: "ALL" as const, label: "?꾩껜", icon: Users },
                                            { value: "SEGMENT" as const, label: "?멸렇癒쇳듃", icon: Users },
                                            { value: "TAG" as const, label: "?쒓렇", icon: Tag },
                                            { value: "USER" as const, label: "媛쒕퀎", icon: User },
                                        ].map((option) => {
                                            const Icon = option.icon;
                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    disabled={!!editingMessage}
                                                    onClick={() => {
                                                        field.onChange(option.value);
                                                        if (option.value === "ALL") {
                                                            setValue("target_value", "");
                                                        }
                                                    }}
                                                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${field.value === option.value
                                                        ? "border-admin-brand bg-admin-brand/10 shadow-admin-glow"
                                                        : "border-admin-border bg-admin-sidebar/30 hover:border-admin-border/50"
                                                        }`}
                                                >
                                                    <Icon className={`h-5 w-5 ${field.value === option.value ? "text-admin-brand" : "text-admin-text-secondary"}`} />
                                                    <p className={`text-xs font-black ${field.value === option.value ? "text-admin-brand" : "text-admin-text-secondary"}`}>
                                                        {option.label}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            />
                        </div>

                        {/* Target Value (Conditional) */}
                        <div className={`${editingMessage ? "opacity-80 pointer-events-none" : ""}`}>
                            <Controller
                                name="target_value"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-3">
                                        <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest pl-1">
                                            ????앸퀎??{editingMessage ? "(蹂寃?遺덇?)" : ""}
                                        </label>
                                        
                                        {watchedTargetType === "SEGMENT" ? (
                                            <div className="relative">
                                                <select
                                                    {...field}
                                                    className="admin-input w-full h-11 appearance-none cursor-pointer bg-admin-sidebar hover:border-admin-brand/50 transition-colors"
                                                >
                                                    <option value="">?멸렇癒쇳듃瑜??좏깮?섏꽭??/option>
                                                    {distinctSegments.map((seg) => (
                                                        <option key={seg} value={seg}>{seg}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-admin-text-secondary">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="m6 9 6 6 6-6"/>
                                                    </svg>
                                                </div>
                                            </div>
                                        ) : (
                                            <input
                                                {...field}
                                                type="text"
                                                readOnly={!!editingMessage}
                                                disabled={watchedTargetType === "ALL"}
                                                placeholder={
                                                    watchedTargetType === "ALL"
                                                        ? "?꾩껜 諛쒖넚? ????앸퀎?먭? ?꾩슂 ?놁뒿?덈떎."
                                                        : watchedTargetType === "TAG" 
                                                            ? "?쒓렇紐??낅젰 (?? VIP, BLACKLIST)"
                                                            : "?ъ슜??ID (濡쒓렇??ID ?먮뒗 怨좎쑀踰덊샇)"
                                                }
                                                className={`admin-input w-full h-11 ${(!!editingMessage || watchedTargetType === "ALL")
                                                    ? "bg-admin-sidebar/50"
                                                    : ""
                                                    }`}
                                            />
                                        )}
                                    </div>
                                )}
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4">
                            {editingMessage && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="flex-1 btn-admin-secondary h-12 flex items-center justify-center gap-2 text-base font-black"
                                >
                                    痍⑥냼
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={sendMutation.isPending || updateMutation.isPending}
                                className={`flex-[2] btn-admin-primary h-12 flex items-center justify-center gap-2 text-base font-black shadow-admin-glow disabled:opacity-50 ${editingMessage ? "bg-admin-brand" : ""}`}
                            >
                                {(sendMutation.isPending || updateMutation.isPending) ? (
                                    <>
                                        <RefreshCw className="h-5 w-5 animate-spin" /> {editingMessage ? "?섏젙 以?.." : "?꾩넚 以?.."}
                                    </>
                                ) : (
                                    <>
                                        {editingMessage ? <Edit3 className="h-5 w-5" /> : <Send className="h-5 w-5" />}
                                        {editingMessage ? "?섏젙 ?ы빆 ?곸슜" : "硫붿떆吏 ?꾩넚"}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sidebar: Status */}
                <div className="lg:col-span-1 space-y-6">
                    {sendMutation.isSuccess && (
                        <div className="admin-card-premium p-6 border-l-4 border-admin-accent animate-in slide-in-from-right-4">
                            <div className="flex items-center gap-2 text-admin-accent mb-2">
                                <CheckCircle2 className="h-5 w-5" />
                                <h3 className="text-admin-subtitle font-black">?꾩넚 ?꾨즺</h3>
                            </div>
                            <p className="text-xs text-admin-text-secondary">硫붿떆吏媛 ?깃났?곸쑝濡?諛쒖넚?섏뿀?듬땲??</p>
                        </div>
                    )}

                    {sendMutation.isError && (
                        <div className="admin-card-premium p-6 border-l-4 border-admin-danger">
                            <div className="flex items-center gap-2 text-admin-danger mb-2">
                                <AlertCircle className="h-5 w-5" />
                                <h3 className="text-admin-subtitle font-black">?꾩넚 ?ㅽ뙣</h3>
                            </div>
                            <p className="text-xs text-admin-text-secondary">
                                {sendMutation.error instanceof Error ? sendMutation.error.message : "?????녿뒗 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎."}
                            </p>
                        </div>
                    )}

                    <div className="admin-card-premium p-6">
                        <h4 className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest mb-4">?꾩넚 媛?대뱶</h4>
                        <div className="space-y-3 text-xs text-admin-text-secondary leading-relaxed">
                            <p>???꾩껜 諛쒖넚 ??紐⑤뱺 ?쒖꽦 ?뚯썝?먭쾶 硫붿떆吏媛 ?꾩넚?⑸땲??</p>
                            <p>???멸렇癒쇳듃/?쒓렇 諛쒖넚 ???대떦 洹몃９???뚯썝留??섏떊?⑸땲??</p>
                            <p>??媛쒕퀎 諛쒖넚 ???ъ슜??ID瑜??뺥솗???낅젰?댁＜?몄슂.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Message History */}
            <div className="space-y-6">
                <div className="flex items-center justify-between pl-1">
                    <h2 className="text-admin-subtitle font-black text-admin-text-primary flex items-center gap-2">
                        <Clock className="h-5 w-5 text-admin-brand" /> 硫붿떆吏 ?꾩넚 ?댁뿭
                    </h2>
                    <button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "messages"] })}
                        className="btn-admin-secondary flex items-center gap-2 px-4 py-2 h-auto"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> ?덈줈怨좎묠
                    </button>
                </div>

                <div className="admin-card-premium overflow-hidden">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <RefreshCw className="h-8 w-8 text-admin-brand animate-spin" />
                            <p className="text-admin-meta text-admin-text-secondary">?곗씠??濡쒕뵫 以?..</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="admin-table">
                                <thead>
                                    <tr className="admin-th">
                                        <th className="px-4 py-3.5 text-left">ID</th>
                                        <th className="px-4 py-3.5 text-left">?쒕ぉ</th>
                                        <th className="px-4 py-3.5 text-left">諛쒖넚 ???/th>
                                        <th className="px-4 py-3.5 text-right">?????/th>
                                        <th className="px-4 py-3.5 text-right">?쎌쓬 ??/th>
                                        <th className="px-4 py-3.5 text-right">諛쒖넚 ?쒓컖</th>
                                        <th className="px-4 py-3.5 text-center">?≪뀡</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {messages?.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-10 text-center text-admin-text-muted text-sm">
                                                議고쉶??硫붿떆吏媛 ?놁뒿?덈떎.
                                            </td>
                                        </tr>
                                    ) : (
                                        messages?.map((msg: AdminMessage) => (
                                            <tr key={msg.id} className="admin-td group">
                                                <td className="px-4 py-4 font-mono text-admin-text-primary text-sm">{msg.id}</td>
                                                <td className="px-4 py-4">
                                                    <p className="text-admin-text-primary font-bold text-xs line-clamp-1">{msg.title}</p>
                                                    <p className="text-admin-text-muted text-[10px] line-clamp-1 mt-0.5">{msg.content}</p>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="px-2 py-0.5 rounded-full bg-admin-brand/10 text-admin-brand text-[10px] font-black uppercase">
                                                        {msg.target_type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right text-admin-text-primary font-black tabular-nums">{msg.recipient_count}</td>
                                                <td className="px-4 py-4 text-right text-admin-accent font-black tabular-nums">{msg.read_count}</td>
                                                <td className="px-4 py-4 text-right text-admin-text-secondary text-xs tabular-nums">
                                                    {formatKstDateTime(msg.created_at)}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEdit(msg)}
                                                            aria-label={`硫붿떆吏 ?섏젙 (ID: ${msg.id})`}
                                                            title={`硫붿떆吏 ?섏젙 (ID: ${msg.id})`}
                                                            className="p-2 rounded-lg hover:bg-admin-brand/10 text-admin-brand transition-colors"
                                                        >
                                                            <Edit3 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { if (confirm("?뺣쭚 ??젣?섏떆寃좎뒿?덇퉴? (?좎? ?⑦븿?먯꽌???щ씪吏묐땲??")) deleteMutation.mutate(msg.id); }}
                                                            disabled={deleteMutation.isPending}
                                                            aria-label={`硫붿떆吏 ??젣 (ID: ${msg.id})`}
                                                            title={`硫붿떆吏 ??젣 (ID: ${msg.id})`}
                                                            className="p-2 rounded-lg hover:bg-admin-danger/10 text-admin-danger transition-colors disabled:opacity-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default MessageCenterPage;

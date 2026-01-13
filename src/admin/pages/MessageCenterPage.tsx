import { useState } from "react";
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

const messageSchema = z.object({
    title: z.string().min(1, "제목을 입력해주세요"),
    content: z.string().min(1, "내용을 입력해주세요"),
    target_type: z.enum(["ALL", "SEGMENT", "TAG", "USER"] as const),
    target_value: z.string().optional(),
    channels: z.array(z.string()).optional(),
});

type MessageFormData = z.infer<typeof messageSchema>;

const MessageCenterPage: React.FC = () => {
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
                        메시지 센터 <span className="text-admin-brand/40">Messages</span>
                    </h1>
                </div>
                <p className="text-admin-body text-admin-text-secondary font-medium">
                    회원에게 메시지를 전송하고 전송 내역을 실시간으로 조회합니다.
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
                                        메시지 내역 수정
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-5 w-5 text-admin-brand" />
                                        메시지 전송 폼
                                    </>
                                )}
                            </h2>
                            <p className="text-xs text-admin-text-secondary mt-1">
                                {editingMessage ? "이미 발송된 메시지의 내용을 수정합니다. 유저 인박스에도 즉시 반영됩니다." : "발송 대상과 내용을 정확히 입력한 후 전송하세요."}
                            </p>
                        </div>

                        {/* Title */}
                        <div className="space-y-3">
                            <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest pl-1">메시지 제목</label>
                            <Controller
                                name="title"
                                control={control}
                                render={({ field }) => (
                                    <input
                                        {...field}
                                        type="text"
                                        placeholder="메시지 제목을 입력하세요"
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
                                <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest pl-1">메시지 내용</label>
                                <Controller
                                    name="content"
                                    control={control}
                                    render={({ field }) => (
                                        <span className={`text-[10px] font-bold ${field.value.length > 500 ? "text-admin-danger" : "text-admin-text-muted"}`}>
                                            {field.value.length} / 1000자
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
                                        placeholder="메시지 내용을 입력하세요 (최대 1000자)"
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
                            title={editingMessage ? "수정 시 발송 대상 변경은 불가능합니다." : ""}
                        >
                            <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest pl-1">발송 대상</label>
                            <Controller
                                name="target_type"
                                control={control}
                                render={({ field }) => (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { value: "ALL" as const, label: "전체", icon: Users },
                                            { value: "SEGMENT" as const, label: "세그먼트", icon: Users },
                                            { value: "TAG" as const, label: "태그", icon: Tag },
                                            { value: "USER" as const, label: "개별", icon: User },
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
                                            대상 식별자 {editingMessage ? "(변경 불가)" : ""}
                                        </label>
                                        <input
                                            {...field}
                                            type="text"
                                            readOnly={!!editingMessage}
                                            disabled={watchedTargetType === "ALL"}
                                            placeholder={
                                                watchedTargetType === "ALL"
                                                    ? "전체 발송은 대상 식별자가 필요 없습니다."
                                                    : "세그먼트명, 태그명, 또는 사용자 ID"
                                            }
                                            className={`admin-input w-full h-11 ${(!!editingMessage || watchedTargetType === "ALL")
                                                ? "bg-admin-sidebar/50"
                                                : ""
                                                }`}
                                        />
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
                                    취소
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={sendMutation.isPending || updateMutation.isPending}
                                className={`flex-[2] btn-admin-primary h-12 flex items-center justify-center gap-2 text-base font-black shadow-admin-glow disabled:opacity-50 ${editingMessage ? "bg-admin-brand" : ""}`}
                            >
                                {(sendMutation.isPending || updateMutation.isPending) ? (
                                    <>
                                        <RefreshCw className="h-5 w-5 animate-spin" /> {editingMessage ? "수정 중..." : "전송 중..."}
                                    </>
                                ) : (
                                    <>
                                        {editingMessage ? <Edit3 className="h-5 w-5" /> : <Send className="h-5 w-5" />}
                                        {editingMessage ? "수정 사항 적용" : "메시지 전송"}
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
                                <h3 className="text-admin-subtitle font-black">전송 완료</h3>
                            </div>
                            <p className="text-xs text-admin-text-secondary">메시지가 성공적으로 발송되었습니다.</p>
                        </div>
                    )}

                    {sendMutation.isError && (
                        <div className="admin-card-premium p-6 border-l-4 border-admin-danger">
                            <div className="flex items-center gap-2 text-admin-danger mb-2">
                                <AlertCircle className="h-5 w-5" />
                                <h3 className="text-admin-subtitle font-black">전송 실패</h3>
                            </div>
                            <p className="text-xs text-admin-text-secondary">
                                {sendMutation.error instanceof Error ? sendMutation.error.message : "알 수 없는 오류가 발생했습니다."}
                            </p>
                        </div>
                    )}

                    <div className="admin-card-premium p-6">
                        <h4 className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest mb-4">전송 가이드</h4>
                        <div className="space-y-3 text-xs text-admin-text-secondary leading-relaxed">
                            <p>• 전체 발송 시 모든 활성 회원에게 메시지가 전송됩니다.</p>
                            <p>• 세그먼트/태그 발송 시 해당 그룹의 회원만 수신합니다.</p>
                            <p>• 개별 발송 시 사용자 ID를 정확히 입력해주세요.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Message History */}
            <div className="space-y-6">
                <div className="flex items-center justify-between pl-1">
                    <h2 className="text-admin-subtitle font-black text-admin-text-primary flex items-center gap-2">
                        <Clock className="h-5 w-5 text-admin-brand" /> 메시지 전송 내역
                    </h2>
                    <button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "messages"] })}
                        className="btn-admin-secondary flex items-center gap-2 px-4 py-2 h-auto"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> 새로고침
                    </button>
                </div>

                <div className="admin-card-premium overflow-hidden">
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <RefreshCw className="h-8 w-8 text-admin-brand animate-spin" />
                            <p className="text-admin-meta text-admin-text-secondary">데이터 로딩 중...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="admin-table">
                                <thead>
                                    <tr className="admin-th">
                                        <th className="px-4 py-3.5 text-left">ID</th>
                                        <th className="px-4 py-3.5 text-left">제목</th>
                                        <th className="px-4 py-3.5 text-left">발송 대상</th>
                                        <th className="px-4 py-3.5 text-right">대상 수</th>
                                        <th className="px-4 py-3.5 text-right">읽음 수</th>
                                        <th className="px-4 py-3.5 text-right">발송 시각</th>
                                        <th className="px-4 py-3.5 text-center">액션</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {messages?.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-10 text-center text-admin-text-muted text-sm">
                                                조회된 메시지가 없습니다.
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
                                                            aria-label={`메시지 수정 (ID: ${msg.id})`}
                                                            title={`메시지 수정 (ID: ${msg.id})`}
                                                            className="p-2 rounded-lg hover:bg-admin-brand/10 text-admin-brand transition-colors"
                                                        >
                                                            <Edit3 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { if (confirm("정말 삭제하시겠습니까? (유저 함함에서도 사라집니다)")) deleteMutation.mutate(msg.id); }}
                                                            disabled={deleteMutation.isPending}
                                                            aria-label={`메시지 삭제 (ID: ${msg.id})`}
                                                            title={`메시지 삭제 (ID: ${msg.id})`}
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

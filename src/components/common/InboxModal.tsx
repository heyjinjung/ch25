import React, { useState } from "react";
import { X, CheckCircle, Loader2 } from "lucide-react";
import dayjs from "dayjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMyInbox, markMessageAsRead } from "../../api/userMessageApi";

interface InboxModalProps {
    onClose: () => void;
}

const InboxModal: React.FC<InboxModalProps> = ({ onClose }) => {
    const queryClient = useQueryClient();
    const { data: messages = [], isLoading } = useQuery({
        queryKey: ["my-inbox"],
        queryFn: fetchMyInbox,
    });

    const readMutation = useMutation({
        mutationFn: markMessageAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["my-inbox"] });
        },
    });

    const [expandedId, setExpandedId] = useState<number | null>(null);

    const handleExpand = (id: number, isRead: boolean) => {
        if (expandedId === id) {
            setExpandedId(null);
        } else {
            setExpandedId(id);
            if (!isRead) {
                readMutation.mutate(id);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-lg rounded-2xl border border-emerald-800 bg-slate-900 shadow-2xl shadow-emerald-900/50">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-gray-400 hover:text-white"
                >
                    <X size={24} />
                </button>

                <header className="border-b border-emerald-900/50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-xl font-bold text-emerald-100">
                        <img src="/assets/icon_alarm_normal.png" className="w-8 h-8 object-contain" alt="" />
                        메시지 보관함
                    </h2>
                </header>

                <div className="max-h-[60vh] overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-thumb-emerald-800">
                    {isLoading ? (
                        <div className="py-12 text-center text-gray-400">
                            <Loader2 className="animate-spin mx-auto mb-2" />
                            로딩 중...
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">
                            받은 메시지가 없습니다.
                        </div>
                    ) : (
                        <ul className="space-y-3 py-2">
                            {messages.map((msg) => (
                                <li
                                    key={msg.id}
                                    className={`rounded-lg border transition-all ${msg.is_read
                                        ? "border-slate-800 bg-slate-800/50 text-gray-400"
                                        : "border-emerald-700/50 bg-emerald-950/20 text-emerald-100 shadow-md shadow-emerald-900/10"
                                        }`}
                                >
                                    <div
                                        onClick={() => handleExpand(msg.id, msg.is_read)}
                                        className="flex cursor-pointer items-start justify-between p-4"
                                    >
                                        <div className="flex-1 pr-4">
                                            <div className="flex items-center gap-2">
                                                {!msg.is_read && (
                                                    <img src="/assets/icon_alarm_unread.png" className="w-5 h-5 object-contain shadow-[0_0_10px_rgba(255,200,0,0.3)]" alt="Unread" />
                                                )}
                                                <span className={`font-semibold ${msg.is_read ? "" : "text-emerald-300"}`}>
                                                    {msg.title}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-xs text-gray-500">
                                                {dayjs(msg.created_at).format("YYYY-MM-DD HH:mm")}
                                            </div>
                                        </div>
                                        {msg.is_read && <CheckCircle size={16} className="text-slate-600 mt-1" />}
                                    </div>

                                    {expandedId === msg.id && (
                                        <div className="border-t border-slate-800 px-4 py-4 text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
                                            {msg.content}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InboxModal;

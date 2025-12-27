
import React, { useState } from "react";
import { Send, Clock, Users, Tag, Target } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMessages, sendMessage, SendMessagePayload } from "../api/adminMessageApi";
import { useToast } from "../../components/common/ToastProvider";

const MessageCenterPage: React.FC = () => {
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const { data: messages, isLoading } = useQuery({
        queryKey: ["admin", "messages"],
        queryFn: () => fetchMessages(0, 50),
    });

    const [form, setForm] = useState<SendMessagePayload>({
        title: "",
        content: "",
        target_type: "ALL",
        target_value: "",
        channels: ["INBOX"],
    });

    const sendMutation = useMutation({
        mutationFn: (payload: SendMessagePayload) => sendMessage(payload),
        onSuccess: () => {
            addToast("메시지가 발송되었습니다.", "success");
            setForm({
                title: "",
                content: "",
                target_type: "ALL",
                target_value: "",
                channels: ["INBOX"],
            });
            queryClient.invalidateQueries({ queryKey: ["admin", "messages"] });
        },
        onError: (err: any) => {
            addToast(err.response?.data?.detail || "발송 실패", "error");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.content) {
            addToast("제목과 내용은 필수입니다.", "error");
            return;
        }
        sendMutation.mutate(form);
    };

    return (
        <section className="space-y-6 max-w-6xl mx-auto">
            <header>
                <h2 className="text-2xl font-bold text-[#91F402]">메시지 센터</h2>
                <p className="mt-1 text-sm text-gray-400">
                    사용자에게 인앱 메시지 및 알림을 발송합니다.
                </p>
            </header>

            {/* Compose Config */}
            <div className="rounded-lg border border-[#333333] bg-[#111111] p-6 shadow-md">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Send size={18} className="text-[#91F402]" /> 새 메시지 작성
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Configuring Target */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">수신 대상 (Target)</label>
                            <select
                                value={form.target_type}
                                onChange={(e) => setForm(p => ({ ...p, target_type: e.target.value as any }))}
                                className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                            >
                                <option value="ALL">전체 사용자 (All Users)</option>
                                <option value="SEGMENT">세그먼트 (Segment)</option>
                                <option value="TAG">태그 (Tag)</option>
                                <option value="USER">특정 사용자 (User IDs)</option>
                            </select>
                        </div>

                        {form.target_type !== "ALL" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    {form.target_type === "SEGMENT" && "세그먼트 이름 (예: WHALE)"}
                                    {form.target_type === "TAG" && "태그 이름 (예: VIP)"}
                                    {form.target_type === "USER" && "User IDs (콤마 구분)"}
                                </label>
                                <input
                                    type="text"
                                    value={form.target_value}
                                    onChange={(e) => setForm(p => ({ ...p, target_value: e.target.value }))}
                                    className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                                    placeholder="대상 값 입력"
                                    required
                                />
                            </div>
                        )}
                    </div>

                    {/* Channels - Hardcoded to INBOX for now */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">발송 채널</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                <input type="checkbox" checked readOnly className="rounded border-gray-600 bg-[#1A1A1A] text-[#91F402] focus:ring-[#2D6B3B]" />
                                <span>In-App Inbox</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-not-allowed">
                                <input type="checkbox" disabled className="rounded border-gray-600 bg-[#1A1A1A]" />
                                <span>Telegram (준비중)</span>
                            </label>
                        </div>
                    </div>

                    <hr className="border-[#333333]" />

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">제목</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                            className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                            placeholder="메시지 제목..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">내용</label>
                        <textarea
                            value={form.content}
                            onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))}
                            rows={4}
                            className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                            placeholder="메시지 내용..."
                            required
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={sendMutation.isPending}
                            className="flex items-center gap-2 rounded-md bg-[#2D6B3B] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#91F402] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {sendMutation.isPending ? "발송 중..." : <><Send size={16} /> 메시지 발송</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* History */}
            <div className="rounded-lg border border-[#333333] bg-[#111111] shadow-md">
                <div className="border-b border-[#333333] px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <Clock size={18} className="text-gray-400" /> 발송 기록
                    </h3>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center text-gray-400">로딩 중...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#1A1A1A] text-left text-xs uppercase text-gray-400">
                                <tr>
                                    <th className="px-6 py-3 font-medium">ID</th>
                                    <th className="px-6 py-3 font-medium">제목</th>
                                    <th className="px-6 py-3 font-medium">대상</th>
                                    <th className="px-6 py-3 font-medium text-center">수신자 수</th>
                                    <th className="px-6 py-3 font-medium text-center">읽음 수</th>
                                    <th className="px-6 py-3 font-medium text-right">일시</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#333333] text-sm text-gray-200">
                                {messages?.map((msg) => (
                                    <tr key={msg.id} className="hover:bg-[#1A1A1A]">
                                        <td className="px-6 py-3 text-gray-500">{msg.id}</td>
                                        <td className="px-6 py-3 font-medium text-white">{msg.title}</td>
                                        <td className="px-6 py-3">
                                            <span className="inline-flex items-center gap-1 rounded bg-[#333333] px-2 py-0.5 text-xs text-gray-300">
                                                {msg.target_type === "ALL" && <Users size={10} />}
                                                {msg.target_type === "SEGMENT" && <Target size={10} />}
                                                {msg.target_type === "TAG" && <Tag size={10} />}
                                                {msg.target_type}
                                                {msg.target_value && `: ${msg.target_value}`}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-center">{msg.recipient_count}</td>
                                        <td className="px-6 py-3 text-center text-gray-400">{msg.read_count}</td>
                                        <td className="px-6 py-3 text-right text-gray-500">
                                            {new Date(msg.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {(!messages || messages.length === 0) && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            발송 기록이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
};

export default MessageCenterPage;

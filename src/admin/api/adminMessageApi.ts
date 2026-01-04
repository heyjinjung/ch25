
import { adminApi } from "./httpClient";

export interface AdminMessage {
    id: number;
    sender_admin_id: number;
    title: string;
    content: string;
    target_type: "ALL" | "SEGMENT" | "TAG" | "USER";
    target_value?: string;
    channels: string[];
    recipient_count: number;
    read_count: number;
    created_at: string;
}

export interface SendMessagePayload {
    title: string;
    content: string;
    target_type: "ALL" | "SEGMENT" | "TAG" | "USER";
    target_value?: string;
    channels?: string[];
}

export interface UpdateMessagePayload {
    title?: string;
    content?: string;
}

export async function fetchMessages(skip: number = 0, limit: number = 50) {
    const { data } = await adminApi.get<AdminMessage[]>(`/admin/api/crm/messages?skip=${skip}&limit=${limit}`);
    return data;
}

export async function sendMessage(payload: SendMessagePayload) {
    const { data } = await adminApi.post<AdminMessage>("/admin/api/crm/messages", payload);
    return data;
}

export async function updateMessage(messageId: number, payload: UpdateMessagePayload) {
    const { data } = await adminApi.put<AdminMessage>(`/admin/api/crm/messages/${messageId}`, payload);
    return data;
}

export async function deleteMessage(messageId: number) {
    const { data } = await adminApi.delete<{ status: string; message_id: number }>(`/admin/api/crm/messages/${messageId}`);
    return data;
}

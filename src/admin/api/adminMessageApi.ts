
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

export async function fetchMessages(skip: number = 0, limit: number = 50) {
    const { data } = await adminApi.get<AdminMessage[]>(`/admin/api/crm/messages?skip=${skip}&limit=${limit}`);
    return data;
}

export async function sendMessage(payload: SendMessagePayload) {
    const { data } = await adminApi.post<AdminMessage>("/admin/api/crm/messages", payload);
    return data;
}

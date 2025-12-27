import axios from "axios";

// Helper to get auth headers (assuming same pattern as other APIs)
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface InboxMessage {
    id: number;
    title: string;
    content: string;
    created_at: string;
    is_read: boolean;
    read_at?: string;
}

export const fetchMyInbox = async (): Promise<InboxMessage[]> => {
    const response = await axios.get(`${API_BASE_URL}/crm/messages/inbox`, {
        headers: getAuthHeaders(),
    });
    return response.data;
};

export const markMessageAsRead = async (messageId: number): Promise<void> => {
    await axios.post(`${API_BASE_URL}/crm/messages/${messageId}/read`, {}, {
        headers: getAuthHeaders(),
    });
};

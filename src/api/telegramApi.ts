import apiClient from './apiClient';

export interface TelegramAuthResponse {
    access_token: string;
    token_type: string;
    is_new_user: boolean;
    user: {
        id: number;
        external_id: string;
        nickname?: string;
        status?: string;
        level?: number;
    };
}

export const telegramApi = {
    auth: async (initData: string): Promise<TelegramAuthResponse> => {
        const response = await apiClient.post<TelegramAuthResponse>('/api/v1/telegram/auth', {
            init_data: initData,
        });
        return response.data;
    },
    link: async (initData: string): Promise<TelegramAuthResponse> => {
        const response = await apiClient.post<TelegramAuthResponse>('/api/v1/telegram/auth/link', {
            init_data: initData,
        });
        return response.data;
    },
};

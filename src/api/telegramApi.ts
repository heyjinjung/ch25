import apiClient from './apiClient';

export interface TelegramAuthResponse {
    access_token: string;
    token_type: string;
    is_new_user: boolean;
    linked_to_existing?: boolean;
    user: {
        id: number;
        external_id: string;
        nickname?: string;
        status?: string;
        level?: number;
    };
}

export const telegramApi = {
    auth: async (initData: string, startParam?: string): Promise<TelegramAuthResponse> => {
        const response = await apiClient.post<TelegramAuthResponse>('/api/telegram/auth', {
            init_data: initData,
            start_param: startParam,
        });
        return response.data;
    },
};

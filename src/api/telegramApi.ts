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
    auth: async (initData: string, startParam?: string): Promise<TelegramAuthResponse> => {
        const response = await apiClient.post<TelegramAuthResponse>('/api/telegram/auth', {
            init_data: initData,
            start_param: startParam,
        });
        return response.data;
    },
    link: async (initData: string): Promise<TelegramAuthResponse> => {
        const response = await apiClient.post<TelegramAuthResponse>('/api/telegram/link', {
            init_data: initData,
        });
        return response.data;
    },
    getBridgeToken: async (): Promise<{ bridge_token: string }> => {
        const response = await apiClient.get('/api/telegram/bridge-token');
        return response.data;
    },
    manualLink: async (initData: string, externalId: string, password: string): Promise<TelegramAuthResponse> => {
        const response = await apiClient.post<TelegramAuthResponse>('/api/telegram/manual-link', {
            init_data: initData,
            external_id: externalId,
            password: password,
        });
        return response.data;
    },
    adminGetBridgeToken: async (userId: number): Promise<{ bridge_token: string }> => {
        const response = await apiClient.get(`/api/telegram/admin/bridge-token/${userId}`);
        return response.data;
    },
};

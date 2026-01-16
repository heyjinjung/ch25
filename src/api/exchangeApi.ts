import userApi from "./httpClient";

export interface CraftResponse {
    result: string;
    reward_token: string;
    reward_amount: number;
    used_token: string;
    used_amount: number;
}

export const craftItem = async (targetTokenType: string): Promise<CraftResponse> => {
    const response = await userApi.post<CraftResponse>("/api/exchange/craft", {
        target_token_type: targetTokenType,
    });
    return response.data;
};

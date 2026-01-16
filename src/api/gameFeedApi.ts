import userApi from "./httpClient";

export interface LiveWinItem {
    id: string;
    user: string;
    action: string;
    amount: number;
    type: "WIN" | "JACKPOT";
    game: string;
    created_at: string;
}

export const fetchRecentWins = async (): Promise<LiveWinItem[]> => {
    const { data } = await userApi.get<LiveWinItem[]>("/api/game/recent-wins");
    return data;
};

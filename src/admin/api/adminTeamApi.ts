import { adminApi } from "./httpClient";

// Types
export interface TeamSeason {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    status: string;
}

export interface Team {
    id: number;
    season_id: number;
    name: string;
    color: string;
}

export interface TeamScoreLog {
    id: number;
    team_id: number;
    amount: number;
    reason: string;
    created_at: string;
}

const BASE_URL = "/api/admin/team-battle";

export const fetchTeamSeasons = async (params?: {
    is_active?: boolean;
    page?: number;
    size?: number;
}): Promise<{ items: TeamSeason[]; total: number }> => {
    const { data } = await adminApi.get<{ items: TeamSeason[]; total: number }>(`${BASE_URL}/seasons`, { params });
    return data;
};

export const fetchTeams = async (params?: {
    season_id?: number;
    page?: number;
    size?: number;
}): Promise<{ items: Team[]; total: number }> => {
    const { data } = await adminApi.get<{ items: Team[]; total: number }>(`${BASE_URL}/teams`, { params });
    return data;
};

import { adminApi } from "./httpClient";

export interface AdminUserMissionDetail {
    mission_id: number;
    title: string;
    logic_key: string;
    category: string;
    target_value: number;
    current_value: number;
    is_completed: boolean;
    is_claimed: boolean;
    approval_status: string;
    reset_date: string;
}

export interface AdminUserMissionUpdatePayload {
    current_value?: number;
    is_completed?: boolean;
    is_claimed?: boolean;
    approval_status?: string;
}

export const fetchUserMissions = async (userId: number): Promise<AdminUserMissionDetail[]> => {
    const response = await adminApi.get<AdminUserMissionDetail[]>(`/admin/api/user-missions/${userId}`);
    return response.data;
};

export const updateUserMission = async (userId: number, missionId: number, payload: AdminUserMissionUpdatePayload) => {
    const response = await adminApi.put(`/admin/api/user-missions/${userId}/${missionId}`, payload);
    return response.data;
};

// src/admin/api/adminMissionApi.ts
import { adminApi } from "./httpClient";

export interface AdminMission {
    id: number;
    title: string;
    description: string;
    category: "DAILY" | "WEEKLY" | "SPECIAL";
    target_value: number;
    reward_type: string;
    reward_amount: number;
    xp_reward: number;
    logic_key: string;
    action_type: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface AdminMissionPayload {
    title: string;
    description: string;
    category: "DAILY" | "WEEKLY" | "SPECIAL";
    target_value: number;
    reward_type: string;
    reward_amount: number;
    xp_reward: number;
    logic_key: string;
    action_type: string;
    is_active?: boolean;
}

export async function fetchMissions() {
    const { data } = await adminApi.get<AdminMission[]>("/api/admin-mission/");
    return data;
}

export async function createMission(payload: AdminMissionPayload) {
    const { data } = await adminApi.post<AdminMission>("/api/admin-mission/", payload);
    return data;
}

export async function updateMission(missionId: number, payload: Partial<AdminMissionPayload>) {
    const { data } = await adminApi.put<AdminMission>(`/api/admin-mission/${missionId}`, payload);
    return data;
}

export async function deleteMission(missionId: number) {
    const { data } = await adminApi.delete<{ success: boolean; message: string }>(`/api/admin-mission/${missionId}`);
    return data;
}

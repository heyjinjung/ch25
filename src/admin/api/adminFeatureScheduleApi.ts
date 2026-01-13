// src/admin/api/adminFeatureScheduleApi.ts
import { adminApi } from "./httpClient";

// Types
export interface FeatureSchedule {
    id: number;
    target_date: string; // YYYY-MM-DD
    feature_type: string;
    is_active: boolean;
    start_time?: string;
    end_time?: string;
    description?: string;
}

export interface FetchFeatureSchedulesParams {
    start_date: string;
    end_date: string;
}

export const fetchFeatureSchedules = async (
    params: FetchFeatureSchedulesParams
): Promise<FeatureSchedule[]> => {
    const { data } = await adminApi.get<FeatureSchedule[]>("/admin/api/feature-schedule/", { params });
    return data;
};

export const upsertFeatureSchedule = async (
    date: string,
    payload: Partial<FeatureSchedule>
): Promise<FeatureSchedule> => {
    const { data } = await adminApi.put<FeatureSchedule>(`/admin/api/feature-schedule/${date}`, payload);
    return data;
};

export const deleteFeatureSchedule = async (date: string): Promise<void> => {
    await adminApi.delete(`/admin/api/feature-schedule/${date}`);
};


import { adminApi } from "./httpClient";

export interface CrmStats {
    total_users: number;
    active_users: number;
    paying_users: number;
    whale_count: number;
    conversion_rate: number;
    retention_rate: number;
    empty_tank_count: number;

    // Advanced
    churn_rate: number;
    ltv: number;
    arpu: number;
    new_user_growth: number;
    message_open_rate: number;
    segments: Record<string, number>;
}

export async function fetchCrmStats() {
    const { data } = await adminApi.get<CrmStats>("/admin/api/crm/stats");
    return data;
}

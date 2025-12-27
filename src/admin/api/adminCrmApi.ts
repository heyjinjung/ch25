
import { adminApi } from "./httpClient";

export interface CrmStats {
    total_users: number;
    active_users: number;
    paying_users: number;
    whale_count: number;
    conversion_rate: number;
    retention_rate: number;
    empty_tank_count: number;
}

export async function fetchCrmStats() {
    const { data } = await adminApi.get<CrmStats>("/admin/api/crm/stats");
    return data;
}

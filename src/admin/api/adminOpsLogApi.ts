import { adminApi } from "./httpClient";
import { OpsLogCategory, OpsLogTargetModel } from "./opsLogKeys";

export { OpsLogCategory };
export type { OpsLogTargetModel };

export type OpsLogEntry = {
    id: number;
    daily_log_date: string;
    timestamp: string;
    category: OpsLogCategory;
    action_code: string;
    target_model: OpsLogTargetModel;
    target_id?: string;
    meta_data: Record<string, unknown>;
    is_automated: boolean;
    actor_id: number;
    ref_id?: string;
};

export type OpsDailyLog = {
    date: string;
    theme_title?: string;
    manager_id?: number;
    status: string;
    summary_md?: string;
    kpi_snapshot?: Record<string, unknown> | null;
};

export type OpsDailyLogUpsert = {
    theme_title?: string | null;
    summary_md?: string | null;
    status?: string | null;
};

export type OpsLogCreate = {
    date: string;
    category: OpsLogCategory;
    action_code: string;
    target_model: OpsLogTargetModel;
    target_id?: string;
    meta_data: Record<string, unknown>;
    ref_id?: string;
    is_automated?: boolean;
};

export type OpsLogCsvImportError = {
    row_number: number;
    reason: string;
};

export type OpsLogCsvImportResponse = {
    total_rows: number;
    imported: number;
    duplicates: number;
    failed: number;
    errors: OpsLogCsvImportError[];
};

export type CreateOpsLogEntryOptions = {
    confirm?: boolean;
};

const BASE_PATH = "/admin/api/ops";

export async function fetchOpsDailyLog(date: string) {
    const { data } = await adminApi.get<OpsDailyLog>(`${BASE_PATH}/daily-log/${date}`);
    return data;
}

export async function upsertOpsDailyLog(date: string, payload: OpsDailyLogUpsert) {
    const { data } = await adminApi.put<OpsDailyLog>(`${BASE_PATH}/daily-log/${date}`, payload);
    return data;
}

export async function exportOpsDailyLog(date: string) {
    const res = await adminApi.get<string>(`${BASE_PATH}/daily-log/${date}/export`, {
        responseType: "text",
    });
    return res.data;
}

export async function fetchOpsLogEntries(params: {
    date: string;
    category?: OpsLogCategory;
    action_code?: string;
    actor_id?: number;
    limit?: number;
}) {
    const { data } = await adminApi.get<OpsLogEntry[]>(`${BASE_PATH}/log-entry`, { params });
    return data;
}

export async function createOpsLogEntry(payload: OpsLogCreate) {
    const { data } = await adminApi.post<OpsLogEntry>(`${BASE_PATH}/log-entry`, payload);
    return data;
}

export async function createOpsLogEntryWithOptions(payload: OpsLogCreate, options?: CreateOpsLogEntryOptions) {
    const confirm = options?.confirm ? true : undefined;
    const { data } = await adminApi.post<OpsLogEntry>(
        `${BASE_PATH}/log-entry`,
        payload,
        { params: confirm ? { confirm: true } : undefined }
    );
    return data;
}

export async function importOpsLogCsv(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await adminApi.post<OpsLogCsvImportResponse>(
        `${BASE_PATH}/import-csv`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
}

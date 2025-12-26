import adminApi from "./httpClient";

export type AdminUiConfigResponse = {
  readonly key: string;
  readonly value: Record<string, unknown> | null;
  readonly updated_at: string | null;
};

export type AdminUiConfigUpsertRequest = {
  readonly value: Record<string, unknown> | null;
};

export const fetchAdminUiConfig = async (key: string): Promise<AdminUiConfigResponse> => {
  const response = await adminApi.get<AdminUiConfigResponse>(`/ui-config/${encodeURIComponent(key)}`);
  return response.data;
};

export const upsertAdminUiConfig = async (
  key: string,
  payload: AdminUiConfigUpsertRequest
): Promise<AdminUiConfigResponse> => {
  const response = await adminApi.put<AdminUiConfigResponse>(`/ui-config/${encodeURIComponent(key)}`,
    payload
  );
  return response.data;
};

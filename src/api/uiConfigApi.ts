import userApi from "./httpClient";

export type UiConfigResponse = {
  readonly key: string;
  readonly value: Record<string, unknown> | null;
  readonly updated_at: string | null;
};

export const getUiConfig = async (key: string): Promise<UiConfigResponse> => {
  const response = await userApi.get<UiConfigResponse>(`/api/ui-config/${encodeURIComponent(key)}`);
  return response.data;
};

import { v2Client } from "./client";

export interface UiConfigResponse {
  readonly key: string;
  readonly value: Record<string, any> | null;
  readonly updated_at: string | null;
}

export const getV2UiConfig = async (key: string): Promise<UiConfigResponse> => {
  const response = await v2Client.get<UiConfigResponse>(
    `/api/ui-config/${encodeURIComponent(key)}`,
  );
  return response.data;
};

import { adminApi } from "./httpClient";

export type Ch25RawLogImportResponse = {
  total_lines: number;
  chunks: number;
  source: string;
  file_name?: string | null;
};

const BASE_PATH = "/api/admin/ch25";

export async function importCh25RawLogs(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await adminApi.post<Ch25RawLogImportResponse>(
    `${BASE_PATH}/raw-logs/import`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

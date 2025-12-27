// src/admin/api/adminUserApi.ts
import { adminApi } from "./httpClient";

export interface AdminUserPayload {
  external_id: string;
  nickname?: string;
  level?: number;
  xp?: number;
  status?: string;
  password?: string;
  season_level?: number;
}

export interface AdminUserProfile {
  real_name?: string;
  phone_number?: string;
  telegram_id?: string;
  tags?: string[];
  memo?: string;
}

export interface AdminUser extends AdminUserPayload {
  id: number;
  created_at: string;
  updated_at: string;
  admin_profile?: AdminUserProfile;
}

export interface ImportResult {
  total_processed: number;
  success_count: number;
  failed_count: number;
  errors: string[];
}

export async function fetchUsers() {
  const { data } = await adminApi.get<AdminUser[]>("/admin/api/users/");
  return data;
}

export async function createUser(payload: AdminUserPayload) {
  const { data } = await adminApi.post<AdminUser>("/admin/api/users/", payload);
  return data;
}

export async function updateUser(userId: number, payload: Partial<AdminUserPayload>) {
  const { data } = await adminApi.put<AdminUser>(`/admin/api/users/${userId}`, payload);
  return data;
}

export async function deleteUser(userId: number) {
  await adminApi.delete(`/admin/api/users/${userId}`);
}

export async function importProfiles(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await adminApi.post<ImportResult>("/admin/api/crm/import-profiles", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

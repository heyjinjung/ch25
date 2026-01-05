// src/admin/api/adminUserApi.ts
import { adminApi } from "./httpClient";

import type { AdminUserResolveResponse } from "../types/adminUserSummary";

export interface AdminUserPayload {
  external_id: string;
  nickname?: string;
  level?: number;
  xp?: number;
  status?: string;
  password?: string;
  season_level?: number;
  admin_profile?: AdminUserProfile;
  telegram_id?: number | null;
  telegram_username?: string | null;
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
  telegram_id?: number | null;
  telegram_username?: string | null;
}

export interface ImportResult {
  total_processed: number;
  success_count: number;
  failed_count: number;
  errors: string[];
}

export async function fetchUsers(query?: string) {
  const params = query ? { q: query } : undefined;
  const { data } = await adminApi.get<AdminUser[]>("/admin/api/users/", { params });
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

export async function purgeUser(userId: number) {
  await adminApi.post(`/admin/api/users/${userId}/purge`);
}

export async function importProfiles(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await adminApi.post<ImportResult>("/admin/api/crm/import-profiles", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function resolveAdminUser(identifier: string) {
  const { data } = await adminApi.get<AdminUserResolveResponse>("/admin/api/users/resolve", {
    params: { identifier },
  });
  return data;
}

export type { AdminUserSummary, AdminUserResolveResponse } from "../types/adminUserSummary";

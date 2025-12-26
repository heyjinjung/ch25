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

export interface AdminUser extends AdminUserPayload {
  id: number;
  created_at: string;
  updated_at: string;
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

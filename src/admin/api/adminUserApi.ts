// src/admin/api/adminUserApi.ts
import { adminApi } from "./httpClient";

export interface AdminUserPayload {
  external_id: string;
  nickname?: string;
  level?: number;
  status?: string;
  password?: string;
}

export interface AdminUser extends AdminUserPayload {
  id: number;
  created_at: string;
  updated_at: string;
}

export async function fetchUsers() {
  const { data } = await adminApi.get<AdminUser[]>("/users");
  return data;
}

export async function createUser(payload: AdminUserPayload) {
  const { data } = await adminApi.post<AdminUser>("/users", payload);
  return data;
}

export async function updateUser(userId: number, payload: Partial<AdminUserPayload>) {
  const { data } = await adminApi.put<AdminUser>(`/users/${userId}`, payload);
  return data;
}

export async function deleteUser(userId: number) {
  await adminApi.delete(`/users/${userId}`);
}

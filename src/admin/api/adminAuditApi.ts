// src/admin/api/adminAuditApi.ts
import { adminApi } from "./httpClient";

export type AdminAuditLogEntry = {
  id: number;
  admin_id: number;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  created_at: string;
};

export async function fetchAuditLogsByUserId(userId: number, limit: number = 50, offset: number = 0) {
  const params: Record<string, any> = { limit, offset };
  const { data } = await adminApi.get<AdminAuditLogEntry[]>(`/admin/api/audit/users/${userId}`, { params });
  return data;
}

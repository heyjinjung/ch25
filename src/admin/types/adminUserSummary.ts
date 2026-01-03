export interface AdminUserSummary {
  id: number;
  external_id?: string | null;
  nickname?: string | null;
  tg_id?: number | null;
  tg_username?: string | null;
  real_name?: string | null;
  phone_number?: string | null;
  tags?: string[] | null;
  memo?: string | null;
}

export interface AdminUserResolveResponse {
  identifier: string;
  user: AdminUserSummary;
}

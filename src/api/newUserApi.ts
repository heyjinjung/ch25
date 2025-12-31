import userApi from "./httpClient";

export type NewUserStatusResponse = {
  readonly eligible: boolean;
  readonly reason?: string | null;
  readonly is_new_user_window_active: boolean;
  readonly window_ends_at_utc?: string | null;
  readonly seconds_left?: number | null;

  readonly telegram_linked: boolean;
  readonly existing_member_by_external_deposit: boolean;
  readonly deposit_amount: number;
  readonly total_play_count: number;

  readonly bonus_cap: number;
  readonly progress: {
    readonly deposit_confirmed: boolean;
    readonly play_1: boolean;
    readonly play_3: boolean;
    readonly share_or_join: boolean;
    readonly next_day_login: boolean;
  };
};

export const getNewUserStatus = async (): Promise<NewUserStatusResponse> => {
  const response = await userApi.get<NewUserStatusResponse>("/api/new-user/status");
  return response.data;
};

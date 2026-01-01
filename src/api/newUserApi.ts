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
  readonly missions: {
    readonly id: number;
    readonly logic_key: string;
    readonly action_type: string | null;
    readonly title: string;
    readonly description: string | null;
    readonly target_value: number;
    readonly current_value: number;
    readonly is_completed: boolean;
    readonly is_claimed: boolean;
    readonly reward_type: string;
    readonly reward_amount: number;
  }[];
};

export const getNewUserStatus = async (): Promise<NewUserStatusResponse> => {
  const response = await userApi.get<NewUserStatusResponse>("/api/new-user/status");
  return response.data;
};

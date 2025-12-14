import userApi from "./httpClient";
import { AuthUser } from "../auth/authStore";

export interface LoginRequest {
  readonly user_id?: number;
  readonly external_id?: string;
  readonly password?: string;
}

export interface LoginResponse {
  readonly access_token: string;
  readonly token_type?: string;
  readonly user: AuthUser;
}

export const login = async (payload: LoginRequest): Promise<LoginResponse> => {
  const response = await userApi.post<LoginResponse>("/api/auth/token", payload);
  return response.data;
};

// src/api/httpClient.ts
import axios from "axios";

export const userApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

userApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // TODO: attach user token once auth is available
    // Log error for debugging; replace with structured logger if needed
    // eslint-disable-next-line no-console
    console.error("[userApi] response error", error);
    return Promise.reject(error);
  }
);

export default userApi;

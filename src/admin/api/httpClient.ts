// src/admin/api/httpClient.ts
import axios from "axios";

export const adminApi = axios.create({
  baseURL: import.meta.env.VITE_ADMIN_API_BASE_URL,
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // TODO: inject admin auth token (e.g., JWT) when auth flow is implemented
    // eslint-disable-next-line no-console
    console.error("[adminApi] response error", error);
    return Promise.reject(error);
  }
);

export default adminApi;

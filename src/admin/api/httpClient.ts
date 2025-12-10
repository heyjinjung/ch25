// src/admin/api/httpClient.ts
import axios from "axios";

// Prefer explicit admin base URL; fall back to VITE_ADMIN_API_URL, then localhost.
const adminBaseURL =
  import.meta.env.VITE_ADMIN_API_BASE_URL ??
  import.meta.env.VITE_ADMIN_API_URL ??
  "http://localhost:8000/admin/api";

export const adminApi = axios.create({
  baseURL: adminBaseURL,
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

// src/admin/api/httpClient.ts
import axios from "axios";

const apiBase = import.meta.env.VITE_ADMIN_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
// If base URL does not already include /admin, append admin prefix for admin API routes.
const adminBaseURL = apiBase.includes("/admin") ? apiBase : `${apiBase.replace(/\/$/, "")}/admin/api`;

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

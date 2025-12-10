// src/admin/api/httpClient.ts
import axios from "axios";

// Prefer explicit admin base URL; if not set, derive from current origin (replace :3000 -> :8000) then fallback to localhost.
const derivedAdminBase =
  typeof window !== "undefined"
    ? `${window.location.origin.replace(/:3000$/, ":8000")}/admin/api`
    : "http://localhost:8000/admin/api";

const adminBaseURL =
  import.meta.env.VITE_ADMIN_API_BASE_URL ??
  import.meta.env.VITE_ADMIN_API_URL ??
  derivedAdminBase;

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

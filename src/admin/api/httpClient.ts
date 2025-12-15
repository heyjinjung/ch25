// src/admin/api/httpClient.ts
import axios from "axios";
import { clearAdminToken, getAdminToken } from "../../auth/adminAuth";

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

adminApi.interceptors.request.use((config) => {
  const token =
    getAdminToken() ||
    (typeof localStorage !== "undefined"
      ? localStorage.getItem("xmas_access_token") || localStorage.getItem("token")
      : null);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // eslint-disable-next-line no-console
    console.error("[adminApi] response error", error);

    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      clearAdminToken();
      if (typeof window !== "undefined" && window.location.pathname !== "/admin/login") {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(error);
  }
);

export default adminApi;

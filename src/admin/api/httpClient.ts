// src/admin/api/httpClient.ts
import axios from "axios";
import { clearAdminToken, getAdminToken } from "../../auth/adminAuth";

// Prefer explicit admin base URL; otherwise derive at runtime.
// - localhost/127.0.0.1: talk to backend on :8000
// - non-local host: use same-origin (expects reverse proxy)
const envAdminBase = (
  import.meta.env.VITE_ADMIN_API_BASE_URL ||
  import.meta.env.VITE_ADMIN_API_URL ||
  ""
).trim();

const derivedAdminBase = (() => {
  if (typeof window === "undefined") return "";
  const { protocol, hostname, origin } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
  const base = isLocalHost ? `${protocol}//${hostname}:8000` : origin;
  return `${base.replace(/\/+$/, "")}/admin/api`;
})();

const adminBaseURL = (envAdminBase || derivedAdminBase).replace(/\/+$/, "");

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

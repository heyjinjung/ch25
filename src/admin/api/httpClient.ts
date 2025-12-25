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

const resolvedBaseURL = (() => {
  // 1. If explicitly provided via env, use it.
  if (envAdminBase) return envAdminBase.replace(/\/+$/, "");

  // 2. In browser (production/development)
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

    // On localhost, we need to point to the backend port (8000)
    if (isLocalHost) return `${protocol}//${hostname}:8000/admin/api`;

    // In production (on the server), use relative path to let NGINX handle it over HTTPS.
    return "/admin/api";
  }

  return "";
})();

export const adminApi = axios.create({
  baseURL: resolvedBaseURL,
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

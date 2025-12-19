// src/api/httpClient.ts
import axios from "axios";
import { clearAuth, getAuthToken } from "../auth/authStore";

// Note: Do NOT append /api here; API paths already include /api prefix.
// Resolution priority:
// 1) Explicit env (VITE_API_BASE_URL or VITE_API_URL)
// 2) Runtime-derived: localhost -> :8000, otherwise same-origin (expects reverse proxy)
const envBase = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").trim();

const derivedBase = (() => {
  if (typeof window === "undefined") return "";
  const { protocol, hostname, origin } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
  return isLocalHost ? `${protocol}//${hostname}:8000` : origin;
})();

const resolvedBaseURL = (envBase || derivedBase).replace(/\/+$/, "");

export const userApi = axios.create({
  baseURL: resolvedBaseURL,
});

// Attach bearer token if present in storage; keeps compatibility with existing `token` key.
userApi.interceptors.request.use((config) => {
  const token = getAuthToken() || (typeof localStorage !== "undefined" ? localStorage.getItem("token") : null);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

userApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // eslint-disable-next-line no-console
    console.error("[userApi] response error", error);
    // Handle 401/403 by redirecting to home or login (when login page exists)
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      clearAuth();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default userApi;

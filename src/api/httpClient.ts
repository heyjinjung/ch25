// src/api/httpClient.ts
import axios from "axios";
import { clearAuth, getAuthToken } from "../auth/authStore";

const normalizeApiBase = (url: string) => {
  const trimmed = url.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

// Resolve API base URL with explicit warning when falling back to localhost.
const rawBase =
  import.meta.env.VITE_API_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  "http://localhost:8000";

if (!import.meta.env.VITE_API_BASE_URL && !import.meta.env.VITE_API_URL) {
  // eslint-disable-next-line no-console
  console.warn("[httpClient] Using default localhost API base URL; set VITE_API_BASE_URL for stage/prod.");
}

const resolvedBaseURL = normalizeApiBase(rawBase);

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

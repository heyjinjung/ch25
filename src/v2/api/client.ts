/// <reference types="vite/client" />
import axios, { InternalAxiosRequestConfig, AxiosRequestHeaders } from "axios";
import { getAuthToken, clearAuth } from "../../auth/authStore";
import { getAdminToken, clearAdminToken } from "../../auth/adminAuth";

// Fix for TypeScript errors regarding import.meta.env
const getEnv = (key: string): string => {
  const env = import.meta.env;
  return env?.[key] || "";
};

// V2 API Base URL logic
const rawEnvBase = (
  getEnv("VITE_API_BASE_URL") ||
  getEnv("VITE_API_URL") ||
  ""
).trim();

const normalizeApiBase = (base: string) => {
  const trimmed = base.replace(/\/+$/, "");
  return trimmed.replace(/\/api$/, "");
};

const envBase = normalizeApiBase(rawEnvBase);

const resolvedBaseURL = (() => {
  if (envBase) return envBase.replace(/\/+$/, "");
  return "";
})();

const DEFAULT_TIMEOUT_MS = 15000;
const resolvedTimeoutMs = (() => {
  const raw = String(getEnv("VITE_API_TIMEOUT_MS") || "").trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
})();

export const v2Client = axios.create({
  baseURL: resolvedBaseURL,
  timeout: resolvedTimeoutMs,
});

// Request Interceptor: Attach Token
v2Client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!config.headers) {
    config.headers = {} as AxiosRequestHeaders;
  }
  
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const url = String(config.url ?? "");
  const isV2AdminPath = pathname.startsWith("/admin") || url.startsWith("/api/v2/admin/");

  const token = isV2AdminPath
    ? getAdminToken() || getAuthToken() || (typeof localStorage !== "undefined" ? localStorage.getItem("token") : null)
    : getAuthToken() || (typeof localStorage !== "undefined" ? localStorage.getItem("token") : null);

  if (
    url.endsWith("/api/v2/auth/token") ||
    url.endsWith("/api/v2/dev/login") ||
    url.endsWith("/api/auth/token")
  ) {
    return config;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Error Handling
v2Client.interceptors.response.use(
  (response) => response,
  (error) => {
    const code = error?.response?.data?.error?.code;
    const detail = error?.response?.data?.detail;
    if (code !== "NO_FEATURE_TODAY" && detail !== "NO_FEATURE_TODAY") {
      console.error("[v2Client] response error", error);
    }

    if (error?.response?.status === 401) {
      clearAdminToken();
      clearAuth();
      if (typeof window !== "undefined") {
        const pathname = window.location.pathname || "";
        const target = pathname.startsWith("/admin") ? "/admin/login" : "/login";
        if (pathname !== target) window.location.href = target;
      }
    }
    return Promise.reject(error);
  },
);

export default v2Client;

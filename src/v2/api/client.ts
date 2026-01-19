/// <reference types="vite/client" />
import axios from "axios";
import { getAuthToken, clearAuth } from "../../auth/authStore"; // Reuse auth store for now as it handles token storage

// V2 API Base URL logic - mirroring V1 for now but isolated for future changes
const rawEnvBase = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").trim();

const normalizeApiBase = (base: string) => {
  const trimmed = base.replace(/\/+$/, "");
  return trimmed.replace(/\/api$/, "");
};

const envBase = normalizeApiBase(rawEnvBase);

const resolvedBaseURL = (() => {
  if (envBase) return envBase.replace(/\/+$/, "");
  
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
    if (isLocalHost) return `${protocol}//${hostname}:8000`;
    return "";
  }
  return "";
})();

const DEFAULT_TIMEOUT_MS = 15000;
const resolvedTimeoutMs = (() => {
  const raw = String(import.meta.env.VITE_API_TIMEOUT_MS ?? "").trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
})();

export const v2Client = axios.create({
  baseURL: resolvedBaseURL,
  timeout: resolvedTimeoutMs,
});

// Request Interceptor: Attach Token
v2Client.interceptors.request.use((config) => {
  const token = getAuthToken() || (typeof localStorage !== "undefined" ? localStorage.getItem("token") : null);
  const url = String(config.url ?? "");
  
  // Skip auth for public endpoints if any (currently mostly auth'd)
  if (url.endsWith("/api/auth/token")) {
    return config;
  }

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Error Handling
v2Client.interceptors.response.use(
  (response) => response,
  (error) => {
    // eslint-disable-next-line no-console
    console.error("[v2Client] response error", error);
    
    const status = error?.response?.status;
    
    if (status === 401) {
      const hadAuthHeader = Boolean(
        error?.config?.headers?.Authorization ||
        error?.config?.headers?.authorization ||
        error?.config?.headers?.AUTHORIZATION
      );
      const currentToken = getAuthToken() || (typeof localStorage !== "undefined" ? localStorage.getItem("token") : null);

      if (hadAuthHeader || currentToken) {
        clearAuth();
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
           // Basic redirect for now, maybe use a custom event or router later
           window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default v2Client;

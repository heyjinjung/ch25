// src/api/apiClient.ts
import axios from "axios";
import { clearAuth, getAuthToken } from "../auth/authStore";

// Backend routes already include the /api prefix where needed (e.g., /api/team-battle, /admin/api/*)
// so the base URL should stop at the host.
const rawEnvBase = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ""
).trim();

const normalizeUserApiBase = (base: string) => {
  const trimmed = base.replace(/\/+$/, "");
  return trimmed.replace(/\/api$/, "");
};

const envBase = normalizeUserApiBase(rawEnvBase);

const normalizeHttps = (base: string) => {
  if (!base) return base;

  // If the site is served over HTTPS and the configured base is HTTP, upgrade to HTTPS to avoid mixed-content blocks.
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    base.startsWith("http://")
  ) {
    try {
      const url = new URL(base, window.location.origin);
      url.protocol = "https:";
      return url.toString().replace(/\/+$/, "");
    } catch {
      return `https://${base.slice("http://".length).replace(/\/+$/, "")}`;
    }
  }

  return base.replace(/\/+$/, "");
};

const derivedBase = (() => {
  if (typeof window === "undefined") return "";
  const { protocol, hostname, origin, port } = window.location;

  // If the frontend is served from a dev port (e.g. 3000/5173), default API to :8000
  // even when hostname is a LAN IP or a device name (mobile testing).
  const devPorts = new Set(["3000", "5173", "4173"]);
  if (devPorts.has(port)) return `${protocol}//${hostname}:8000`;

  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
  return isLocalHost ? `${protocol}//${hostname}:8000` : origin;
})();

const API_URL = normalizeHttps(envBase || derivedBase);

const DEFAULT_TIMEOUT_MS = 15000;
const resolvedTimeoutMs = (() => {
  const raw = String(import.meta.env.VITE_API_TIMEOUT_MS ?? "").trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
})();

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: resolvedTimeoutMs,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: use shared auth store and legacy fallback keys.
apiClient.interceptors.request.use(
  (config) => {
    const token =
      getAuthToken() ||
      (typeof localStorage !== "undefined"
        ? localStorage.getItem("xmas_access_token") ||
          localStorage.getItem("token")
        : null);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: clear auth on 401 to avoid stale tokens.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const hadAuthHeader = Boolean(
        error?.config?.headers?.Authorization ||
        error?.config?.headers?.authorization ||
        error?.config?.headers?.AUTHORIZATION,
      );
      const currentToken =
        getAuthToken() ||
        (typeof localStorage !== "undefined"
          ? localStorage.getItem("xmas_access_token") ||
            localStorage.getItem("token")
          : null);

      if (hadAuthHeader || currentToken) {
        clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;

// src/admin/api/httpClient.ts
import axios from "axios";
import { clearAdminToken, getAdminToken } from "../../auth/adminAuth";

// Prefer explicit admin base URL; otherwise derive at runtime.
// Canonical backend prefix is /admin/api.
// - localhost/127.0.0.1: talk to backend on :8000/admin/api
// - non-local host: use same-origin /admin/api via reverse proxy
const envAdminBase = (
  // @ts-ignore
  import.meta.env.VITE_ADMIN_API_BASE_URL ||
  // @ts-ignore
  import.meta.env.VITE_ADMIN_API_URL ||
  ""
).trim();

// E2E test mode: run admin UI without login flows, and prefer same-origin API via nginx.
// This flag is compile-time for Vite builds.
// @ts-ignore
const isE2ETestMode = (import.meta.env.VITE_TEST_MODE ?? "false") === "true";

const normalizeHttps = (base: string) => {
  if (!base) return base;

  // If we are in the browser on HTTPS and the provided base is HTTP, upgrade to HTTPS to avoid mixed content.
  if (typeof window !== "undefined" && window.location.protocol === "https:" && base.startsWith("http://")) {
    try {
      const url = new URL(base, window.location.origin);
      url.protocol = "https:";
      return url.toString().replace(/\/+$/, "");
    } catch {
      // Fallback string replace if URL construction fails (e.g., invalid URL but still usable as axios base)
      return `https://${base.slice("http://".length).replace(/\/+$/, "")}`;
    }
  }

  return base.replace(/\/+$/, "");
};

const normalizeAdminApiBase = (base: string) => {
  const trimmed = base.replace(/\/+$/, "");
  // Strip both /admin/api and /api to ensure we start at the host root.
  return trimmed.replace(/\/admin\/api$/, "").replace(/\/api$/, "");
};

const resolvedBaseURL = (() => {
  // 1. If explicitly provided via env, use it (with HTTPS normalization).
  if (envAdminBase) return normalizeHttps(normalizeAdminApiBase(envAdminBase));

  // 2. In browser: prefer same-origin.
  // - Production: nginx proxies /admin/api to backend.
  // - Local dev: Vite dev server proxies /admin/api to backend (see vite.config.ts).
  // This avoids CORS/preflight failures in test environments.
  if (typeof window !== "undefined") {
    // In E2E test mode, we also prefer same-origin.
    if (isE2ETestMode) return "";

    return "";
  }

  return "";
})();

const DEFAULT_TIMEOUT_MS = 15000;
const resolvedTimeoutMs = (() => {
  // @ts-ignore
  const raw = String(import.meta.env.VITE_ADMIN_API_TIMEOUT_MS ?? import.meta.env.VITE_API_TIMEOUT_MS ?? "").trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
})();

export const adminApi = axios.create({
  baseURL: resolvedBaseURL,
  timeout: resolvedTimeoutMs,
});

adminApi.interceptors.request.use((config) => {
  const url = String(config.url ?? "");
  // Do not attach Authorization to login endpoint.
  if (url.endsWith("/api/auth/token")) {
    return config;
  }
  const token =
    getAdminToken() ||
    (typeof localStorage !== "undefined"
      ? localStorage.getItem("xmas_access_token") || localStorage.getItem("token")
      : null);
  if (token) {
    (config as any).headers = {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`
    };
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
      // In E2E test mode, avoid redirecting to /admin/login, which breaks Cypress flows.
      if (isE2ETestMode) {
        return Promise.reject(error);
      }
      const hadAuthHeader = Boolean(
        error?.config?.headers?.Authorization ||
        error?.config?.headers?.authorization ||
        error?.config?.headers?.AUTHORIZATION
      );
      const currentToken =
        getAdminToken() ||
        (typeof localStorage !== "undefined"
          ? localStorage.getItem("xmas_access_token") || localStorage.getItem("token")
          : null);

      if (hadAuthHeader || currentToken) {
        clearAdminToken();
        if (typeof window !== "undefined" && window.location.pathname !== "/admin/login") {
          window.location.href = "/admin/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default adminApi;

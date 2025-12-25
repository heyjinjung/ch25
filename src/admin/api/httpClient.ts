// src/admin/api/httpClient.ts
import axios from "axios";
import { clearAdminToken, getAdminToken } from "../../auth/adminAuth";

// Prefer explicit admin base URL; otherwise derive at runtime.
// Backend prefix is /api/admin (fastapi router), so defaults honor that.
// - localhost/127.0.0.1: talk to backend on :8000/api/admin
// - non-local host: use same-origin /api/admin via reverse proxy
const envAdminBase = (
  import.meta.env.VITE_ADMIN_API_BASE_URL ||
  import.meta.env.VITE_ADMIN_API_URL ||
  ""
).trim();

const normalizeHttps = (base: string) => {
  if (!base) return base;

  // If we are in the browser on HTTPS and the provided base is HTTP, upgrade to HTTPS to avoid mixed content.
  if (typeof window !== "undefined" && window.location.protocol === "https:" && base.startsWith("http://")) {
    try {
      const url = new URL(base, window.location.origin);
      url.protocol = "https:";
      return url.toString().replace(/\/+$/, "");
    } catch (err) {
      // Fallback string replace if URL construction fails (e.g., invalid URL but still usable as axios base)
      return `https://${base.slice("http://".length).replace(/\/+$/, "")}`;
    }
  }

  return base.replace(/\/+$/, "");
};

const resolvedBaseURL = (() => {
  // 1. If explicitly provided via env, use it (with HTTPS normalization when the page is served over TLS).
  if (envAdminBase) return normalizeHttps(envAdminBase);

  // 2. In browser (production/development)
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

    // On localhost, we need to point to the backend port (8000)
    if (isLocalHost) return `${protocol}//${hostname}:8000/api/admin`;

    // In production (on the server), use relative path to let NGINX handle it over HTTPS.
    return "/api/admin";
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

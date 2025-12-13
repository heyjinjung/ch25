// Simple auth store without external dependencies.
import { useEffect, useState } from "react";

export interface AuthUser {
  readonly id: number;
  readonly external_id: string;
  readonly nickname?: string;
  readonly status?: string;
  readonly level?: number;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
}

type Listener = () => void;

const ACCESS_TOKEN_KEY = "xmas_access_token";
const ACCESS_USER_KEY = "xmas_user";
const AUTH_VERSION_KEY = "xmas_auth_version";
const CURRENT_AUTH_VERSION = "v2";
const LEGACY_KEYS = ["access_token", "token"];

const isBrowser = typeof window !== "undefined" && typeof localStorage !== "undefined";

const hydrateFromStorage = (): AuthState => {
  if (!isBrowser) return { token: null, user: null };

  const storedVersion = localStorage.getItem(AUTH_VERSION_KEY);
  if (storedVersion !== CURRENT_AUTH_VERSION) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(ACCESS_USER_KEY);
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(AUTH_VERSION_KEY, CURRENT_AUTH_VERSION);
    return { token: null, user: null };
  }

  const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY) ?? LEGACY_KEYS.map((k) => localStorage.getItem(k)).find(Boolean) ?? null;
  const storedUser = localStorage.getItem(ACCESS_USER_KEY);
  return {
    token: storedToken,
    user: storedUser ? (JSON.parse(storedUser) as AuthUser) : null,
  };
};

const state: AuthState = hydrateFromStorage();
const listeners = new Set<Listener>();

const notify = () => listeners.forEach((listener) => listener());

export const getAuthToken = (): string | null => state.token;
export const getAuthUser = (): AuthUser | null => state.user;

export const setAuth = (token: string, user: AuthUser | null): void => {
  state.token = token;
  state.user = user;
  if (isBrowser) {
    localStorage.setItem(AUTH_VERSION_KEY, CURRENT_AUTH_VERSION);
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    // Legacy key for backward compatibility with older API clients.
    localStorage.setItem("token", token);
    if (user) {
      localStorage.setItem(ACCESS_USER_KEY, JSON.stringify(user));
    }
  }
  notify();
};

export const clearAuth = (): void => {
  state.token = null;
  state.user = null;
  if (isBrowser) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(ACCESS_USER_KEY);
    localStorage.removeItem("token");
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  }
  notify();
};

export const subscribeAuth = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useAuth = () => {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const unsub = subscribeAuth(() => forceUpdate((n) => n + 1));
    return () => unsub();
  }, []);

  return {
    token: state.token,
    user: state.user,
    login: setAuth,
    logout: clearAuth,
  };
};

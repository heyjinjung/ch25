// src/auth/adminAuth.ts
// Simple admin auth helpers using localStorage. In production, replace with secure token management.
export const ADMIN_TOKEN_KEY = "admin_token";

// @ts-ignore
const isE2ETestMode = (): boolean => (import.meta.env.VITE_TEST_MODE ?? "false") === "true";

export const getAdminToken = (): string | null => {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
};

export const setAdminToken = (token: string): void => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
};

export const clearAdminToken = (): void => {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
};

export const isAdminAuthenticated = (): boolean => {
  if (isE2ETestMode()) return true;
  return getAdminToken() !== null;
};


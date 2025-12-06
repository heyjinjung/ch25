// src/auth/userAuth.ts
// User auth helpers using localStorage. In production, consider secure token management.

export const USER_TOKEN_KEY = "access_token";
export const LEGACY_TOKEN_KEY = "token";

export const getUserToken = (): string | null => {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(USER_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
};

export const setUserToken = (token: string): void => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(USER_TOKEN_KEY, token);
};

export const clearUserToken = (): void => {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
};

export const isUserAuthenticated = (): boolean => getUserToken() !== null;

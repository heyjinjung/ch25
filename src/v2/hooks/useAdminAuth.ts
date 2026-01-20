import { useAuth } from "../../auth/authStore";
import { getAdminToken } from "../../auth/adminAuth";

function decodeJwtPayload(token: string): any | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  try {
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function getRoleFromToken(token: string | null): string | null {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const roles = payload.roles;
  if (
    Array.isArray(roles) &&
    roles.length > 0 &&
    typeof roles[0] === "string"
  ) {
    return roles[0];
  }

  const role = payload.role;
  if (typeof role === "string") return role;
  if (Array.isArray(role) && role.length > 0 && typeof role[0] === "string")
    return role[0];
  return null;
}

export function useAdminAuth() {
  const { user, token } = useAuth();
  const adminToken = typeof window !== "undefined" ? getAdminToken() : null;

  const tokenRole = getRoleFromToken(adminToken || token);
  const role = (tokenRole || user?.role || "ADMIN").toUpperCase();

  return {
    isAdmin: true, // If they are in this hook at all, they are likely in admin context
    isSuperAdmin: role === "SUPER_ADMIN",
    isOperator: role === "OPERATOR" || role === "SUPER_ADMIN",
    role,
    canEdit: role === "OPERATOR" || role === "SUPER_ADMIN",
    canDelete: role === "SUPER_ADMIN",
    canAdjustWallet: role === "SUPER_ADMIN",
  };
}

export function useCanEdit() {
  const { canEdit } = useAdminAuth();
  return canEdit;
}

export function useCanDelete() {
  const { canDelete } = useAdminAuth();
  return canDelete;
}

export function useCanAdjustWallet() {
  const { canAdjustWallet } = useAdminAuth();
  return canAdjustWallet;
}

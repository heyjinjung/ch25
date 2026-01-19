import { useAuth } from "../../auth/authStore";

export function useAdminAuth() {
  const { user } = useAuth();
  
  const role = user?.role?.toUpperCase() || "ADMIN"; // Default to ADMIN if role not present but is in admin path
  
  return {
    isAdmin: true, // If they are in this hook at all, they are likely in admin context
    isSuperAdmin: role === "SUPER_ADMIN",
    isOperator: role === "OPERATOR" || role === "SUPER_ADMIN",
    role,
    canEdit: role === "OPERATOR" || role === "SUPER_ADMIN",
    canDelete: role === "SUPER_ADMIN",
    canAdjustWallet: role === "SUPER_ADMIN"
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

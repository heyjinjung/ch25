// src/components/routing/ProtectedRoute.tsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAdminAuthenticated } from "../../auth/adminAuth";

type ProtectedRouteProps = {
  redirectTo?: string;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ redirectTo = "/admin/login" }) => {
  const location = useLocation();

  if (!isAdminAuthenticated()) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;


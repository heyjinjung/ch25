// src/router/AppRouter.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import UserRoutes from "./UserRoutes";
import AdminRoutes from "./AdminRoutes";
import V2AdminRoutes from "../v2/router/V2AdminRoutes";
import V2UserRoutes from "../v2/router/V2UserRoutes";

const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* V2 (Primary) */}
      <Route path="/admin/*" element={<V2AdminRoutes />} />
      <Route path="/*" element={<V2UserRoutes />} />

      {/* V1 (Legacy Isolation) */}
      <Route path="/v1/admin/*" element={<AdminRoutes />} />
      <Route path="/v1/*" element={<UserRoutes />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;

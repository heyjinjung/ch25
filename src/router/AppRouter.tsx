// src/router/AppRouter.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import UserRoutes from "./UserRoutes";
import AdminRoutes from "./AdminRoutes";
import V2AdminRoutes from "./V2AdminRoutes";

const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/*" element={<UserRoutes />} />
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="/v2/admin/*" element={<V2AdminRoutes />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;

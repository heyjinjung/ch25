import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../v2/admin/layouts/AdminLayout";
import MarketingCenterPage from "../v2/admin/pages/dashboard/MarketingCenterPage";
import UserListPage from "../v2/admin/pages/users/UserListPage";

const V2AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="dashboard" element={<MarketingCenterPage />} />
        <Route path="users" element={<UserListPage />} />
        <Route path="economy" element={<div className="p-10">Economy (Pending)</div>} />
        <Route path="settings" element={<div className="p-10">Settings (Pending)</div>} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export default V2AdminRoutes;

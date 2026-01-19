import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../v2/admin/layouts/AdminLayout";

// Placeholder components for Step 1 verification
const OpsDashboard = () => <div className="p-10 text-2xl font-bold">Ops Dashboard (Pending)</div>;
const UserList = () => <div className="p-10 text-2xl font-bold">User List (Pending)</div>;

const V2AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="dashboard" element={<OpsDashboard />} />
        <Route path="users" element={<UserList />} />
        <Route path="economy" element={<div className="p-10">Economy (Pending)</div>} />
        <Route path="settings" element={<div className="p-10">Settings (Pending)</div>} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export default V2AdminRoutes;

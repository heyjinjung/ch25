// src/router/AdminRoutes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// V2 Imports
import CCDepositPage from "../v2/admin/pages/economy/CCDepositPage";
import VaultControlPage from "../v2/admin/pages/economy/VaultControlPage";
import TicketInventoryTabPage from "../v2/admin/pages/economy/TicketInventoryTabPage";
import UserManagementTabPage from "../v2/admin/pages/users/UserManagementTabPage";
import MarketingTabPage from "../v2/admin/pages/marketing/MarketingTabPage";

const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="economy/deposits" element={<CCDepositPage />} />
      <Route path="economy/vault" element={<VaultControlPage />} />
      <Route path="inventory/tickets" element={<TicketInventoryTabPage />} />
      <Route
        path="game-token-logs"
        element={<Navigate to="/admin/game-tokens" replace />}
      />
      <Route path="users" element={<UserManagementTabPage />} />
      <Route path="marketing/messages" element={<MarketingTabPage />} />
    </Routes>
  );
};

export default AdminRoutes;

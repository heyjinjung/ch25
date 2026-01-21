import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Outlet } from "react-router-dom";
import AdminLayout from "../admin/layouts/AdminLayout";
import OpsDashboard from "../admin/pages/dashboard/OpsDashboard";
import MarketingCenterPage from "../admin/pages/dashboard/MarketingCenterPage";
import CrisisRadarPage from "../admin/pages/dashboard/CrisisRadarPage";
import GoldenRealTimePage from "../admin/pages/dashboard/GoldenRealTimePage";

import VaultControlPage from "../admin/pages/economy/VaultControlPage";
import CCDepositPage from "../admin/pages/economy/CCDepositPage";
import ShopMissionTabPage from "../admin/pages/economy/ShopMissionTabPage";
import LevelConfigPage from "../admin/pages/game/LevelConfigPage";
import RouletteConfigPage from "../admin/pages/game/RouletteConfigPage";
import DiceConfigPage from "../admin/pages/game/DiceConfigPage";
import LotteryConfigPage from "../admin/pages/game/LotteryConfigPage";
import TicketInventoryTabPage from "../admin/pages/economy/TicketInventoryTabPage";
import MarketingTabPage from "../admin/pages/marketing/MarketingTabPage";
import UserManagementTabPage from "../admin/pages/users/UserManagementTabPage";
import ModalControlPage from "../admin/pages/game/ModalControlPage";
import {
  AdminTeamBattlePage,
  AdminGoldenHourPage,
} from "../admin/pages/placeholders";

import { isAdminAuthenticated } from "../../auth/adminAuth";
import V2AdminLoginPage from "../admin/pages/auth/V2AdminLoginPage";

const V2AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="login" element={<V2AdminLoginPage />} />
      <Route element={<RequireV2AdminAuth />}>
        <Route element={<AdminLayout />}>
          <Route
            index
            element={<Navigate to="/v2/admin/dashboard" replace />}
          />
          <Route path="dashboard" element={<OpsDashboard />} />
          <Route path="dashboard/radar" element={<CrisisRadarPage />} />
          <Route path="dashboard/golden" element={<GoldenRealTimePage />} />
          <Route path="marketing" element={<MarketingCenterPage />} />

          {/* Users - Tabbed */}
          <Route path="users" element={<UserManagementTabPage />} />

          {/* Economy */}
          <Route path="economy/vault" element={<VaultControlPage />} />
          <Route path="economy/deposits" element={<CCDepositPage />} />

          {/* Shop & Mission - Tabbed */}
          <Route path="economy/shop" element={<ShopMissionTabPage />} />

          {/* Game Ops */}
          <Route path="game/level" element={<LevelConfigPage />} />
          <Route path="game/roulette" element={<RouletteConfigPage />} />
          <Route path="game/dice" element={<DiceConfigPage />} />
          <Route path="game/lottery" element={<LotteryConfigPage />} />
          <Route path="game/team-battle" element={<AdminTeamBattlePage />} />
          <Route path="game/golden-hour" element={<AdminGoldenHourPage />} />
          <Route path="game/modals" element={<ModalControlPage />} />

          {/* Inventory */}
          <Route path="inventory/tickets" element={<TicketInventoryTabPage />} />

          {/* Marketing - Tabbed */}
          <Route path="marketing/messages" element={<MarketingTabPage />} />
          <Route
            path="*"
            element={<Navigate to="/v2/admin/dashboard" replace />}
          />
        </Route>
      </Route>
    </Routes>
  );
};

function RequireV2AdminAuth() {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/v2/admin/login" replace />;
  }
  return <Outlet />;
}

export default V2AdminRoutes;

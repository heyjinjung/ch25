import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Outlet } from "react-router-dom";
import AdminLayout from "../admin/layouts/AdminLayout";
import OpsDashboard from "../admin/pages/dashboard/OpsDashboard";
import MarketingCenterPage from "../admin/pages/dashboard/MarketingCenterPage";
import CrisisRadarPage from "../admin/pages/dashboard/CrisisRadarPage";
import GoldenRealTimePage from "../admin/pages/dashboard/GoldenRealTimePage";
import CSVImportPage from "../admin/pages/ops/CSVImportPage";
import AnalyticsDashboard from "../admin/pages/ops/AnalyticsDashboard";
import AuditLogPage from "../admin/pages/ops/AuditLogPage";
import StockManagementPage from "../admin/pages/ops/StockManagementPage";

import VaultControlPage from "../admin/pages/economy/VaultControlPage";
import VaultAnalyticsPage from "../admin/pages/economy/VaultAnalyticsPage";
import CCDepositPage from "../admin/pages/economy/CCDepositPage";
import LatencySurvivalPage from "../admin/pages/economy/LatencySurvivalPage";
import CircuitBreakerPage from "../admin/pages/economy/CircuitBreakerPage";
import ShopMissionTabPage from "../admin/pages/economy/ShopMissionTabPage";
import LevelConfigPage from "../admin/pages/game/LevelConfigPage";
import RouletteConfigPage from "../admin/pages/game/RouletteConfigPage";
import DiceConfigPage from "../admin/pages/game/DiceConfigPage";
import LotteryConfigPage from "../admin/pages/game/LotteryConfigPage";
import TicketInventoryTabPage from "../admin/pages/economy/TicketInventoryTabPage";
import MarketingTabPage from "../admin/pages/marketing/MarketingTabPage";
import UserManagementTabPage from "../admin/pages/users/UserManagementTabPage";
import ModalControlPage from "../admin/pages/game/ModalControlPage";
import AdminTeamBattlePage from "../admin/pages/game/AdminTeamBattlePage";
import { AdminGoldenHourPage } from "../admin/pages/placeholders";

import { isAdminAuthenticated } from "../../auth/adminAuth";
import V2AdminLoginPage from "../admin/pages/auth/V2AdminLoginPage";

const V2AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="login" element={<V2AdminLoginPage />} />
      <Route element={<RequireV2AdminAuth />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<OpsDashboard />} />
          <Route path="dashboard/radar" element={<CrisisRadarPage />} />
          <Route path="dashboard/golden" element={<GoldenRealTimePage />} />
          <Route path="ops/csv-import" element={<CSVImportPage />} />
          <Route path="ops/analytics" element={<AnalyticsDashboard />} />
          <Route path="ops/audit-logs" element={<AuditLogPage />} />
          <Route path="marketing" element={<MarketingCenterPage />} />

          {/* Users - Tabbed */}
          <Route path="users" element={<UserManagementTabPage />} />

          {/* Economy */}
          <Route path="economy/vault" element={<VaultControlPage />} />
          <Route
            path="economy/vault-analytics"
            element={<VaultAnalyticsPage />}
          />
          <Route path="economy/deposits" element={<CCDepositPage />} />
          <Route path="economy/latency" element={<LatencySurvivalPage />} />
          <Route
            path="economy/circuit-breaker"
            element={<CircuitBreakerPage />}
          />

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
          <Route
            path="inventory/tickets"
            element={<TicketInventoryTabPage />}
          />
          <Route path="inventory/stock" element={<StockManagementPage />} />

          {/* Marketing - Tabbed */}
          <Route path="marketing/messages" element={<MarketingTabPage />} />
          <Route
            path="*"
            element={<Navigate to="/admin/dashboard" replace />}
          />
        </Route>
      </Route>
    </Routes>
  );
};

function RequireV2AdminAuth() {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
}

export default V2AdminRoutes;

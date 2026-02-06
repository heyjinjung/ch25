import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Outlet } from "react-router-dom";
import AdminLayout from "../admin/layouts/AdminLayout";
import MarketingCenterPage from "../admin/pages/dashboard/MarketingCenterPage";
import AnalyticsDashboard from "../admin/pages/ops/AnalyticsDashboard";
import ProspectLinkingPage from "../admin/pages/prospect/ProspectLinkingPage";
import GoldenCRMPage from "../admin/pages/dashboard/GoldenCRMPage";
import SegmentDetailPage from "../admin/pages/users/SegmentDetailPage";
import RoiDashboardPage from "../admin/pages/analytics/RoiDashboardPage";

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

import ControlCenterPage from "../admin/pages/dashboard/ControlCenterPage";
import SystemSecurityPage from "../admin/pages/ops/SystemSecurityPage";
import OpsPlansPage from "../admin/pages/ops/OpsPlansPage";

const V2AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="login" element={<V2AdminLoginPage />} />
      <Route element={<RequireV2AdminAuth />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/control" replace />} />

          {/* New Consolidated Pages */}
          <Route path="control" element={<ControlCenterPage />} />
          <Route path="system" element={<SystemSecurityPage />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="analytics/roi" element={<RoiDashboardPage />} />
          <Route path="ops" element={<OpsPlansPage />} />

          {/* Legacy Redirects for bookmarks */}
          <Route
            path="dashboard"
            element={<Navigate to="/admin/control" replace />}
          />
          <Route
            path="dashboard/radar"
            element={<Navigate to="/admin/control" replace />}
          />
          <Route
            path="dashboard/golden"
            element={<Navigate to="/admin/control" replace />}
          />
          <Route
            path="economy/circuit-breaker"
            element={<Navigate to="/admin/system" replace />}
          />
          <Route
            path="economy/latency"
            element={<Navigate to="/admin/system" replace />}
          />
          <Route
            path="ops/csv-import"
            element={<Navigate to="/admin/system" replace />}
          />
          <Route
            path="ops/audit-logs"
            element={<Navigate to="/admin/system" replace />}
          />
          <Route
            path="ops/analytics"
            element={<Navigate to="/admin/analytics" replace />}
          />

          <Route path="marketing" element={<MarketingCenterPage />} />

          {/* Users - Tabbed */}
          <Route path="users" element={<UserManagementTabPage />} />

          {/* Segment Detail */}
          <Route path="segments/:segment" element={<SegmentDetailPage />} />

          {/* Prospect Linking */}
          <Route path="prospect/linking" element={<ProspectLinkingPage />} />

          {/* Golden CRM */}
          <Route path="golden/crm" element={<GoldenCRMPage />} />

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

          {/* Marketing - Tabbed */}
          <Route path="marketing/messages" element={<MarketingTabPage />} />

          {/* Prospect Linking */}
          <Route path="prospect/linking" element={<ProspectLinkingPage />} />

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

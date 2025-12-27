// src/router/AdminRoutes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLoginPage from "../admin/pages/AdminLoginPage";
import AdminDashboardPage from "../admin/pages/AdminDashboardPage";
import SurveyAdminPage from "../admin/pages/SurveyAdminPage";
import SeasonListPage from "../admin/pages/SeasonListPage";

import RouletteConfigPage from "../admin/pages/RouletteConfigPage";
import DiceConfigPage from "../admin/pages/DiceConfigPage";
import LotteryConfigPage from "../admin/pages/LotteryConfigPage";
import ExternalRankingPage from "../admin/pages/ExternalRankingPage";
import TicketManagerPage from "../admin/pages/TicketManagerPage";
import UserAdminPage from "../admin/pages/UserAdminPage";
import AdminTeamBattlePage from "../admin/pages/AdminTeamBattlePage";
import UserSegmentsPage from "../admin/pages/UserSegmentsPage";
import SegmentRulesPage from "../admin/pages/SegmentRulesPage";
import NewMemberDiceEligibilityPage from "../admin/pages/NewMemberDiceEligibilityPage";
import UiConfigTicketZeroPage from "../admin/pages/UiConfigTicketZeroPage";
import VaultAdminPage from "../admin/pages/VaultAdminPage";
import AdminLayout from "../admin/components/AdminLayout";
import ProtectedRoute from "../components/routing/ProtectedRoute";

const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="login" element={<AdminLoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="" element={<AdminDashboardPage />} />
          <Route path="seasons" element={<SeasonListPage />} />

          <Route path="surveys" element={<SurveyAdminPage />} />
          <Route path="roulette" element={<RouletteConfigPage />} />
          <Route path="dice" element={<DiceConfigPage />} />
          <Route path="lottery" element={<LotteryConfigPage />} />
          <Route path="external-ranking" element={<ExternalRankingPage />} />
          <Route path="game-tokens" element={<TicketManagerPage />} />
          <Route path="game-token-logs" element={<Navigate to="/admin/game-tokens" replace />} />
          <Route path="users" element={<UserAdminPage />} />
          <Route path="user-segments" element={<UserSegmentsPage />} />
          <Route path="segment-rules" element={<SegmentRulesPage />} />
          <Route path="team-battle" element={<AdminTeamBattlePage />} />
          <Route path="new-member-dice" element={<NewMemberDiceEligibilityPage />} />
          <Route path="ui-config" element={<UiConfigTicketZeroPage />} />
          <Route path="vault" element={<VaultAdminPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default AdminRoutes;

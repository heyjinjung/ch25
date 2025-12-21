// src/router/AdminRoutes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLoginPage from "../admin/pages/AdminLoginPage";
import AdminDashboardPage from "../admin/pages/AdminDashboardPage";
import SurveyAdminPage from "../admin/pages/SurveyAdminPage";
import SeasonListPage from "../admin/pages/SeasonListPage";
import FeatureSchedulePage from "../admin/pages/FeatureSchedulePage";
import RouletteConfigPage from "../admin/pages/RouletteConfigPage";
import DiceConfigPage from "../admin/pages/DiceConfigPage";
import LotteryConfigPage from "../admin/pages/LotteryConfigPage";
import ExternalRankingPage from "../admin/pages/ExternalRankingPage";
import GameTokenGrantPage from "../admin/pages/GameTokenGrantPage";
import GameTokenLogsPage from "../admin/pages/GameTokenLogsPage";
import UserAdminPage from "../admin/pages/UserAdminPage";
import AdminTeamBattlePage from "../admin/pages/AdminTeamBattlePage";
import UserSegmentsPage from "../admin/pages/UserSegmentsPage";
import SegmentRulesPage from "../admin/pages/SegmentRulesPage";
import NewMemberDiceEligibilityPage from "../admin/pages/NewMemberDiceEligibilityPage";
import UiConfigTicketZeroPage from "../admin/pages/UiConfigTicketZeroPage";
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
          <Route path="feature-schedule" element={<FeatureSchedulePage />} />
          <Route path="surveys" element={<SurveyAdminPage />} />
          <Route path="roulette" element={<RouletteConfigPage />} />
          <Route path="dice" element={<DiceConfigPage />} />
          <Route path="lottery" element={<LotteryConfigPage />} />
          <Route path="external-ranking" element={<ExternalRankingPage />} />
          <Route path="game-tokens" element={<GameTokenGrantPage />} />
          <Route path="game-token-logs" element={<GameTokenLogsPage />} />
          <Route path="users" element={<UserAdminPage />} />
          <Route path="user-segments" element={<UserSegmentsPage />} />
          <Route path="segment-rules" element={<SegmentRulesPage />} />
          <Route path="team-battle" element={<AdminTeamBattlePage />} />
          <Route path="new-member-dice" element={<NewMemberDiceEligibilityPage />} />
          <Route path="ui-config" element={<UiConfigTicketZeroPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default AdminRoutes;

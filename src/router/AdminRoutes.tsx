// src/router/AdminRoutes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLoginPage from "../admin/pages/AdminLoginPage";
import AdminDashboardPage from "../admin/pages/AdminDashboardPage";
import SurveyAdminPage from "../admin/pages/SurveyAdminPage";
import SurveyDetailEditorPage from "../admin/pages/SurveyDetailEditorPage";
import SurveyResponsePage from "../admin/pages/SurveyResponsePage";
import SeasonListPage from "../admin/pages/SeasonListPage";

import RouletteConfigPage from "../admin/pages/RouletteConfigPage";
import DiceConfigPage from "../admin/pages/DiceConfigPage";
import LotteryConfigPage from "../admin/pages/LotteryConfigPage";
import ExternalRankingPage from "../admin/pages/ExternalRankingPage";
import TicketManagerPage from "../admin/pages/TicketManagerPage";
import UserAdminPage from "../admin/pages/UserAdminPage";
import MessageCenterPage from "../admin/pages/MessageCenterPage";
import MarketingDashboardPage from "../admin/pages/MarketingDashboardPage";
import AdminTeamBattlePage from "../admin/pages/AdminTeamBattlePage";
import UserSegmentsPage from "../admin/pages/UserSegmentsPage";
import SegmentRulesPage from "../admin/pages/SegmentRulesPage";
import UiConfigTicketZeroPage from "../admin/pages/UiConfigTicketZeroPage";
import VaultAdminPage from "../admin/pages/VaultAdminPage";
import AdminMissionPage from "../admin/pages/AdminMissionPage";
import AdminShopPage from "../admin/pages/AdminShopPage";
import StreakRewardsAdminPage from "../admin/pages/StreakRewardsAdminPage";
import RewardTypesPage from "../admin/pages/RewardTypesPage";
import GameHubPage from "../admin/pages/GameHubPage";
import AdminPlaceholderPage from "../admin/pages/AdminPlaceholderPage";
import AdminOpsLogPage from "../admin/pages/AdminOpsLogPage";
import AdminOpsPage from "../admin/pages/AdminOpsPage";
import AdminOpsPlanPage from "../admin/pages/AdminOpsPlanPage";
import AdminSystemHealthPage from "../admin/pages/AdminSystemHealthPage";
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
          <Route path="missions" element={<AdminMissionPage />} />

          <Route path="surveys" element={<SurveyAdminPage />} />
          <Route path="surveys/new" element={<SurveyDetailEditorPage />} />
          <Route path="surveys/:id" element={<SurveyDetailEditorPage />} />
          <Route path="surveys/:id/responses" element={<SurveyResponsePage />} />
          <Route path="roulette" element={<RouletteConfigPage />} />
          <Route path="dice" element={<DiceConfigPage />} />
          <Route path="lottery" element={<LotteryConfigPage />} />
          <Route path="external-ranking" element={<ExternalRankingPage />} />
          <Route path="game-tokens" element={<TicketManagerPage />} />
          <Route path="game-token-logs" element={<Navigate to="/admin/game-tokens" replace />} />
          <Route path="users" element={<UserAdminPage />} />
          <Route path="marketing" element={<MarketingDashboardPage />} />
          <Route path="messages" element={<MessageCenterPage />} />
          <Route path="user-segments" element={<UserSegmentsPage />} />
          <Route path="segment-rules" element={<SegmentRulesPage />} />
          <Route path="team-battle" element={<AdminTeamBattlePage />} />
          <Route path="ui-config" element={<UiConfigTicketZeroPage />} />
          <Route path="vault" element={<VaultAdminPage />} />
          <Route path="shop" element={<AdminShopPage />} />
          <Route path="system-health" element={<AdminSystemHealthPage />} />
          <Route path="streak-rewards" element={<StreakRewardsAdminPage />} />
          <Route path="reward-types" element={<RewardTypesPage />} />

          <Route path="ops" element={<AdminOpsPage />}>
            <Route index element={<AdminOpsPlanPage />} />
            <Route path="logs" element={<AdminOpsLogPage />} />
          </Route>

          {/* Grouped & Placeholder Routes */}
          <Route path="games" element={<GameHubPage />} />
          <Route path="features" element={<AdminPlaceholderPage title="이벤트 일정 및 국가 관리" description="글로벌 이벤트 일정 및 기능별 활성화 상태를 관리하게 될 예정입니다." />} />
          <Route path="config" element={<AdminPlaceholderPage title="시스템 전역 설정" description="전역 변수, 점검 모드, 보안 설정 등을 통합적으로 관리하는 페이지입니다." />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default AdminRoutes;

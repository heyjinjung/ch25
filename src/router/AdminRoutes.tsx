// src/router/AdminRoutes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLoginPage from "../admin/pages/AdminLoginPage";
import AdminDashboardPage from "../admin/pages/AdminDashboardPage";
import SeasonListPage from "../admin/pages/SeasonListPage";
import FeatureSchedulePage from "../admin/pages/FeatureSchedulePage";
import RouletteConfigPage from "../admin/pages/RouletteConfigPage";
import DiceConfigPage from "../admin/pages/DiceConfigPage";
import LotteryConfigPage from "../admin/pages/LotteryConfigPage";
import RankingAdminPage from "../admin/pages/RankingAdminPage";
import GameTokenGrantPage from "../admin/pages/GameTokenGrantPage";
import GameTokenLogsPage from "../admin/pages/GameTokenLogsPage";
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
          <Route path="roulette" element={<RouletteConfigPage />} />
          <Route path="dice" element={<DiceConfigPage />} />
          <Route path="lottery" element={<LotteryConfigPage />} />
          <Route path="ranking" element={<RankingAdminPage />} />
          <Route path="game-tokens" element={<GameTokenGrantPage />} />
          <Route path="game-token-logs" element={<GameTokenLogsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default AdminRoutes;

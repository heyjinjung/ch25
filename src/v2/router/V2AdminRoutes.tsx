import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../admin/layouts/AdminLayout";
import OpsDashboard from "../admin/pages/dashboard/OpsDashboard";
import MarketingCenterPage from "../admin/pages/dashboard/MarketingCenterPage";
import UserListPage from "../admin/pages/users/UserListPage";
import CrisisRadarPage from "../admin/pages/dashboard/CrisisRadarPage";


import VaultControlPage from "../admin/pages/economy/VaultControlPage";
import CCDepositPage from "../admin/pages/economy/CCDepositPage";
import ShopManagerPage from "../admin/pages/economy/ShopManagerPage";
import MissionManagerPage from "../admin/pages/game/MissionManagerPage";
import LevelConfigPage from "../admin/pages/game/LevelConfigPage";
import RouletteConfigPage from "../admin/pages/game/RouletteConfigPage";
import DiceConfigPage from "../admin/pages/game/DiceConfigPage";
import LotteryConfigPage from "../admin/pages/game/LotteryConfigPage";
import TicketInventoryPage from "../admin/pages/economy/TicketInventoryPage";
import MessageSenderPage from "../admin/pages/marketing/MessageSenderPage";
import UserSegmentPage from "../admin/pages/marketing/UserSegmentPage";
import SurveyPage from "../admin/pages/marketing/SurveyPage";
import HealthPage from "../admin/pages/system/HealthPage";
import ModalControlPage from "../admin/pages/system/ModalControlPage";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { ShieldAlert } from "lucide-react";

const V2AdminRoutes: React.FC = () => {
  const { isSuperAdmin } = useAdminAuth();

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="dashboard" element={<OpsDashboard />} />
        <Route path="dashboard/radar" element={<CrisisRadarPage />} />
        <Route path="marketing" element={<MarketingCenterPage />} />
        <Route path="users" element={<UserListPage />} />
        {/* Economy */}
        <Route path="economy/vault" element={
            isSuperAdmin ? <VaultControlPage /> : <AccessDenied />
        } />
        <Route path="economy/deposits" element={<CCDepositPage />} />
        <Route path="economy/shop" element={<ShopManagerPage />} />

        {/* Game Ops */}
        <Route path="game/missions" element={<MissionManagerPage />} />
        <Route path="game/level" element={<LevelConfigPage />} />
        <Route path="game/roulette" element={<RouletteConfigPage />} />
        <Route path="game/dice" element={<DiceConfigPage />} />
        <Route path="game/lottery" element={<LotteryConfigPage />} />

        {/* Inventory */}
        <Route path="inventory/tickets" element={<TicketInventoryPage />} />

        {/* Marketing */}
        <Route path="marketing/messages" element={<MessageSenderPage />} />
        <Route path="marketing/segments" element={<UserSegmentPage />} />
        <Route path="marketing/surveys" element={<SurveyPage />} />

        {/* System */}
        <Route path="system/health" element={<HealthPage />} />
        <Route path="system/modals" element={<ModalControlPage />} />
        <Route path="settings" element={<div className="p-10">Total Settings (Pending)</div>} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
};

function AccessDenied() {
    return (
        <div className="h-full flex flex-col items-center justify-center p-20 text-zinc-500">
            <ShieldAlert className="w-16 h-16 mb-4 text-red-500/50" />
            <h2 className="text-xl font-bold text-white mb-2">접근 권한 없음</h2>
            <p>이 페이지에 접근하려면 SUPER_ADMIN 권한이 필요합니다.</p>
        </div>
    );
}

export default V2AdminRoutes;

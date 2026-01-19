import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../v2/admin/layouts/AdminLayout";
import MarketingCenterPage from "../v2/admin/pages/dashboard/MarketingCenterPage";
import UserListPage from "../v2/admin/pages/users/UserListPage";

import VaultControlPage from "../v2/admin/pages/economy/VaultControlPage";
import CCDepositPage from "../v2/admin/pages/economy/CCDepositPage";
import ShopManagerPage from "../v2/admin/pages/economy/ShopManagerPage";
import MissionManagerPage from "../v2/admin/pages/game/MissionManagerPage";
import LevelConfigPage from "../v2/admin/pages/game/LevelConfigPage";
import RouletteConfigPage from "../v2/admin/pages/game/RouletteConfigPage";
import DiceConfigPage from "../v2/admin/pages/game/DiceConfigPage";
import LotteryConfigPage from "../v2/admin/pages/game/LotteryConfigPage";
import TicketInventoryPage from "../v2/admin/pages/inventory/TicketInventoryPage";
import MessageSenderPage from "../v2/admin/pages/marketing/MessageSenderPage";
import SurveyPage from "../v2/admin/pages/marketing/SurveyPage";
import ModalControlPage from "../v2/admin/pages/system/ModalControlPage";

const V2AdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="dashboard" element={<MarketingCenterPage />} />
        <Route path="users" element={<UserListPage />} />
        {/* Economy */}
        <Route path="economy/vault" element={<VaultControlPage />} />
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
        <Route path="marketing/surveys" element={<SurveyPage />} />

        {/* System */}
        <Route path="system/modals" element={<ModalControlPage />} />
        <Route path="settings" element={<div className="p-10">Total Settings (Pending)</div>} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export default V2AdminRoutes;

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../admin/layouts/AdminLayout";
import MarketingCenterPage from "../admin/pages/dashboard/MarketingCenterPage";
import UserListPage from "../admin/pages/users/UserListPage";

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
import SurveyPage from "../admin/pages/marketing/SurveyPage";
import ModalControlPage from "../admin/pages/system/ModalControlPage";

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

import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import V2AppLayout from "../components/layout/V2AppLayout";

// Lazy load pages - Auth
const DevLoginPage = lazy(() => import("../pages/auth/V2UserLoginPage"));
const TelegramLoginPage = lazy(() => import("../pages/auth/V2TelegramLoginPage"));
const TelegramTestLoginPage = lazy(() => import("../pages/auth/V2TelegramTestLoginPage"));
const HomePage = lazy(() => import("../pages/home/HomePage"));
const GamedashPage = lazy(() => import("../pages/game/GamedashPage"));
const VaultPage = lazy(() => import("../pages/vault/VaultPage"));
const RoulettePage = lazy(() => import("../pages/game/RoulettePage"));
const DicePage = lazy(() => import("../pages/game/DicePage"));
const LotteryPage = lazy(() => import("../pages/game/LotteryPage"));
const ExchangePage = lazy(() => import("../pages/shop/ExchangePage"));
const InventoryPage = lazy(() => import("../pages/inventory/InventoryPage"));
const MissionsPage = lazy(() => import("../pages/missions/MissionsPage"));
const TeamBattlePage = lazy(() => import("../pages/game/TeamBattlePage"));
const LevelTowerPage = lazy(() => import("../pages/game/LevelTowerPage"));
const EventPage = lazy(() => import("../pages/event/EventPage"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-black">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#30FF75] border-t-transparent" />
      <p className="text-sm font-semibold text-white/80">Loading...</p>
    </div>
  </div>
);

export const V2UserRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth - Telegram Login */}
        <Route path="/login" element={<TelegramTestLoginPage />} />
        {/* 프로덕션용 (정식 오픈 후 /login으로 변경) */}
        <Route path="/login/prod" element={<TelegramLoginPage />} />
        {/* 기존 개발용 로그인 (레거시) */}
        <Route path="/login/dev" element={<DevLoginPage />} />

        {/* App Layout (V1-style bottom nav) */}
        <Route element={<V2AppLayout />}>
          {/* Home */}
          <Route path="/home" element={<HomePage />} />

          {/* Game Dashboard */}
          <Route path="/game" element={<GamedashPage />} />
          <Route path="/vault" element={<VaultPage />} />
          <Route path="/shop" element={<ExchangePage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/event" element={<EventPage />} />

          {/* Game Routes */}
          <Route path="/game/roulette" element={<RoulettePage />} />
          <Route path="/game/dice" element={<DicePage />} />
          <Route path="/game/lottery" element={<LotteryPage />} />

          {/* Missions & Events - Canonical routes */}
          <Route path="/v2/missions" element={<MissionsPage />} />
          {/* Legacy redirect (3주 유지 후 제거) - 2026-02-16 */}
          <Route
            path="/missions"
            element={<Navigate to="/v2/missions" replace />}
          />

          <Route path="/v2/team-battle" element={<TeamBattlePage />} />
          {/* Legacy redirect (3주 유지 후 제거) - 2026-02-16 */}
          <Route
            path="/team-battle"
            element={<Navigate to="/v2/team-battle" replace />}
          />

          <Route path="/v2/level" element={<LevelTowerPage />} />
          {/* Legacy redirect (3주 유지 후 제거) - 2026-02-16 */}
          <Route path="/level" element={<Navigate to="/v2/level" replace />} />
        </Route>

        {/* Default redirect to Home */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
};

export default V2UserRoutes;

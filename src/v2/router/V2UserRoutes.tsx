import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import V2AppLayout from "../components/layout/V2AppLayout";

// Lazy load pages
const LoginPage = lazy(() => import("../pages/auth/V2UserLoginPage"));
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
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />

        {/* App Layout (V1-style bottom nav) */}
        <Route element={<V2AppLayout />}>
          {/* Home */}
          <Route path="/home" element={<HomePage />} />

          {/* Game Dashboard */}
          <Route path="/game" element={<GamedashPage />} />
          <Route path="/vault" element={<VaultPage />} />
          <Route path="/shop" element={<ExchangePage />} />
          <Route path="/inventory" element={<InventoryPage />} />

          {/* Game Routes */}
          <Route path="/game/roulette" element={<RoulettePage />} />
          <Route path="/game/dice" element={<DicePage />} />
          <Route path="/game/lottery" element={<LotteryPage />} />
          
          {/* Missions & Events */}
          <Route path="/missions" element={<MissionsPage />} />
          <Route path="/team-battle" element={<TeamBattlePage />} />
        </Route>

        {/* Default redirect to Home */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
};

export default V2UserRoutes;

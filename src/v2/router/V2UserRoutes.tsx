import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Lazy load pages
const LoginPage = lazy(() => import("../pages/auth/V2UserLoginPage"));
const HomePage = lazy(() => import("../pages/home/HomePage"));
const GameHubPage = lazy(() => import("../pages/game/GameHubPage"));
const RoulettePage = lazy(() => import("../pages/game/RoulettePage"));
const DicePage = lazy(() => import("../pages/game/DicePage"));
const LotteryPage = lazy(() => import("../pages/game/LotteryPage"));

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

        {/* Home */}
        <Route path="/home" element={<HomePage />} />

        {/* Game Hub */}
        <Route path="/game" element={<GameHubPage />} />

        {/* Game Routes */}
        <Route path="/game/roulette" element={<RoulettePage />} />
        <Route path="/game/dice" element={<DicePage />} />
        <Route path="/game/lottery" element={<LotteryPage />} />

        {/* Default redirect to Home */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
};

export default V2UserRoutes;

// src/router/UserRoutes.tsx
import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import UserLayout from "../components/layout/UserLayout";
import SidebarAppLayout from "../components/layout/SidebarAppLayout";
import RequireAuth from "../components/routing/RequireAuth";


// Lazy load heavy pages for performance optimization
const RoulettePage = React.lazy(() => import("../pages/RoulettePage"));
const DicePage = React.lazy(() => import("../pages/DicePage"));
const LotteryPage = React.lazy(() => import("../pages/LotteryPage"));
const RankingPage = React.lazy(() => import("../pages/RankingPage"));
const SurveyListPage = React.lazy(() => import("../pages/SurveyListPage"));
const SurveyRunnerPage = React.lazy(() => import("../pages/SurveyRunnerPage"));
const NewMemberDicePage = React.lazy(() => import("../pages/NewMemberDicePage"));
const ConnectPage = React.lazy(() => import("../pages/ConnectPage"));
const HomePage = React.lazy(() => import("../pages/HomePage"));
const FigmaLandingTablet = React.lazy(() => import("../pages/FigmaLandingTablet"));
const FigmaLandingMobile = React.lazy(() => import("../pages/FigmaLandingMobile"));
const LevelTowerPage = React.lazy(() => import("../pages/LevelTowerPage"));
const GuidePage = React.lazy(() => import("../pages/GuidePage"));
const TeamBattlePage = React.lazy(() => import("../pages/TeamBattlePage"));
const GameLobbyPage = React.lazy(() => import("../pages/GameLobbyPage"));
const VaultPage = React.lazy(() => import("../pages/VaultPage"));
const MissionPage = React.lazy(() => import("../pages/MissionPage"));
const EventDashboardPage = React.lazy(() => import("../pages/EventDashboardPage"));

// Simple loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-white rounded-full animate-spin" />
      <p className="text-sm text-slate-400 font-medium">Loading...</p>
    </div>
  </div>
);

const UserRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/connect" element={<ConnectPage />} />

        {/* Primary experience starts at landing/home */}
        <Route path="/" element={<Navigate to="/landing" replace />} />
        <Route path="/tablet" element={<Navigate to="/landing/tablet" replace />} />
        <Route path="/mobile" element={<Navigate to="/landing/mobile" replace />} />

        {/* Primary user experience with sidebar */}
        <Route element={<SidebarAppLayout />}>
          <Route element={<RequireAuth />}>
            <Route path="/landing" element={<HomePage />} />
            <Route path="/landing/tablet" element={<FigmaLandingTablet />} />
            <Route path="/landing/mobile" element={<FigmaLandingMobile />} />
            <Route path="/vault" element={<VaultPage />} />
            <Route path="/events" element={<EventDashboardPage />} />
            <Route path="/season-pass" element={<LevelTowerPage />} />
            <Route path="/missions" element={<MissionPage />} />
            <Route path="/team-battle" element={<TeamBattlePage />} />
            <Route path="/games" element={<GameLobbyPage />} />
            <Route path="/roulette" element={<RoulettePage />} />
            <Route path="/dice" element={<DicePage />} />
            <Route path="/lottery" element={<LotteryPage />} />
            <Route path="/guide" element={<GuidePage />} />
          </Route>
        </Route>

        <Route element={<UserLayout />}>
          <Route element={<RequireAuth />}>
            <Route path="/home" element={<Navigate to="/landing" replace />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/surveys" element={<SurveyListPage />} />
            <Route path="/surveys/:surveyId" element={<SurveyRunnerPage />} />
            <Route path="/new-member/dice" element={<NewMemberDicePage />} />
            <Route path="/app" element={<Navigate to="/landing" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    </Suspense>
  );
};

export default UserRoutes;

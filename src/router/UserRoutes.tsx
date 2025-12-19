// src/router/UserRoutes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import RoulettePage from "../pages/RoulettePage";
import DicePage from "../pages/DicePage";
import LotteryPage from "../pages/LotteryPage";
import RankingPage from "../pages/RankingPage";
import SurveyListPage from "../pages/SurveyListPage";
import SurveyRunnerPage from "../pages/SurveyRunnerPage";
import LoginPage from "../pages/LoginPage";
import TeamBattlePage from "../pages/TeamBattlePage";
import NewMemberDicePage from "../pages/NewMemberDicePage";
import FigmaLanding from "../pages/FigmaLanding";
import FigmaLandingTablet from "../pages/FigmaLandingTablet";
import FigmaLandingMobile from "../pages/FigmaLandingMobile";
import SeasonPassFigmaPage from "../pages/SeasonPassFigmaPage";
import UserLayout from "../components/layout/UserLayout";
import RequireAuth from "../components/routing/RequireAuth";

const UserRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Login-first flow */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/tablet" element={<Navigate to="/login" replace />} />
      <Route path="/mobile" element={<Navigate to="/login" replace />} />

      {/* Figma landing pages (authenticated) */}
      <Route element={<RequireAuth />}>
        <Route path="/landing" element={<FigmaLanding />} />
        <Route path="/landing/tablet" element={<FigmaLandingTablet />} />
        <Route path="/landing/mobile" element={<FigmaLandingMobile />} />
        <Route path="/season-pass" element={<SeasonPassFigmaPage />} />
      </Route>
      <Route element={<UserLayout />}>
        <Route element={<RequireAuth />}>
          <Route path="/home" element={<Navigate to="/landing" replace />} />
          <Route path="/roulette" element={<RoulettePage />} />
          <Route path="/dice" element={<DicePage />} />
          <Route path="/lottery" element={<LotteryPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/surveys" element={<SurveyListPage />} />
          <Route path="/surveys/:surveyId" element={<SurveyRunnerPage />} />
          <Route path="/team-battle" element={<TeamBattlePage />} />
          <Route path="/new-member/dice" element={<NewMemberDicePage />} />
          <Route path="/app" element={<Navigate to="/landing" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default UserRoutes;

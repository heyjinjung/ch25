// src/router/UserRoutes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "../pages/HomePage";
import RoulettePage from "../pages/RoulettePage";
import DicePage from "../pages/DicePage";
import LotteryPage from "../pages/LotteryPage";
import RankingPage from "../pages/RankingPage";
import SeasonPassPage from "../pages/SeasonPassPage";
import SurveyListPage from "../pages/SurveyListPage";
import SurveyRunnerPage from "../pages/SurveyRunnerPage";
import LoginPage from "../pages/LoginPage";
import TeamBattlePage from "../pages/TeamBattlePage";
import NewMemberDicePage from "../pages/NewMemberDicePage";
import UserLayout from "../components/layout/UserLayout";
import RequireAuth from "../components/routing/RequireAuth";

const UserRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<UserLayout />}>
        <Route element={<RequireAuth />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/roulette" element={<RoulettePage />} />
          <Route path="/dice" element={<DicePage />} />
          <Route path="/lottery" element={<LotteryPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/season-pass" element={<SeasonPassPage />} />
          <Route path="/surveys" element={<SurveyListPage />} />
          <Route path="/surveys/:surveyId" element={<SurveyRunnerPage />} />
          <Route path="/team-battle" element={<TeamBattlePage />} />
          <Route path="/new-member/dice" element={<NewMemberDicePage />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default UserRoutes;

// src/components/layout/UserLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import MainLayout from "./MainLayout";
import SeasonPassBar from "../season-pass/SeasonPassBar";
import SurveyPromptBanner from "../survey/SurveyPromptBanner";
import DowntimeBanner from "../common/DowntimeBanner";

const UserLayout: React.FC = () => {
  const location = useLocation();
  const isLanding = location.pathname.startsWith("/landing");
  const isGamePage = location.pathname === "/roulette" || location.pathname === "/dice" || location.pathname === "/lottery";
  const isSeasonPass = location.pathname === "/season-pass";
  const isTeamBattle = location.pathname === "/team-battle";
  const hideTopBars = isLanding || isGamePage || isSeasonPass || isTeamBattle;

  return (
    <MainLayout>
      <div className="space-y-6">
        <DowntimeBanner />
        {!hideTopBars && <SurveyPromptBanner />}
        {!hideTopBars && <SeasonPassBar />}
        <Outlet />
      </div>
    </MainLayout>
  );
};

export default UserLayout;

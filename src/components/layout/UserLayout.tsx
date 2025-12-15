// src/components/layout/UserLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import MainLayout from "./MainLayout";
import SeasonPassBar from "../season-pass/SeasonPassBar";
import SurveyPromptBanner from "../survey/SurveyPromptBanner";

const UserLayout: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === "/home";

  return (
    <MainLayout>
      <div className="space-y-6">
        {!isHome && <SurveyPromptBanner />}
        {!isHome && <SeasonPassBar />}
        <Outlet />
      </div>
    </MainLayout>
  );
};

export default UserLayout;

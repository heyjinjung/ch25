// src/components/layout/UserLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import MainLayout from "./MainLayout";
import SeasonPassBar from "../season-pass/SeasonPassBar";

const UserLayout: React.FC = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <SeasonPassBar />
        <Outlet />
      </div>
    </MainLayout>
  );
};

export default UserLayout;

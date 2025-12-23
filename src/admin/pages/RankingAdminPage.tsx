// src/admin/pages/RankingAdminPage.tsx
import React from "react";
import { Navigate } from "react-router-dom";

const RankingAdminPage: React.FC = () => {
  return <Navigate to="/admin/external-ranking" replace />;
};

export default RankingAdminPage;

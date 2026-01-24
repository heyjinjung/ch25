// src/router/UserRoutes.tsx
import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Cleaned up for V2 - No V1 dependencies
// Redirects specific legacy paths to new V2 paths
const UserRoutes: React.FC = () => {
  return (
    <Suspense fallback={<div className="bg-black text-white h-screen flex items-center justify-center">Loading...</div>}>
      <Routes>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  );
};
export default UserRoutes;

// src/components/layout/MainLayout.tsx
import React from "react";
import AppHeader from "./AppHeader";

interface MainLayoutProps {
  readonly children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-slate-100">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
        {/* Header removed per user request */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;

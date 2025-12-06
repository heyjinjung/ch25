// src/components/layout/MainLayout.tsx
import React from "react";

interface MainLayoutProps {
  readonly children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-emerald-700/40 bg-slate-900/70 px-6 py-4 shadow-lg shadow-emerald-900/40">
          <div className="text-center sm:text-left">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">🎄 Xmas Week</p>
            <h1 className="text-2xl font-bold">XMAS Event System</h1>
            <p className="text-sm text-slate-400">Holiday features and season pass hub</p>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;

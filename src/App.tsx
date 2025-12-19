// src/App.tsx
import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppRouter from "./router/AppRouter";
import ToastProvider from "./components/common/ToastProvider";
import ErrorBoundary from "./components/common/ErrorBoundary";
import ChristmasMusic from "./components/common/ChristmasMusic";
import Snowfall from "./components/common/Snowfall";

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isLandingRoute = ["/landing", "/landing/tablet", "/landing/mobile"].includes(location.pathname);
  const isLoginRoute = location.pathname === "/login";

  const navItems = useMemo(
    () => [
      { label: "홈", path: "/landing" },
      { label: "팀 배틀", path: "/team-battle" },
      { label: "레벨", path: "/season-pass" },
      { label: "설문", path: "/surveys" },
    ],
    []
  );

  const isAdminRoute = location.pathname.startsWith("/admin");
  const shellClass = isAdminRoute
    ? "mx-auto flex min-h-screen w-full max-w-7xl px-4 sm:px-6 lg:px-10 py-8"
    : "mx-auto flex min-h-screen max-w-5xl px-4 py-8";

  if (isLandingRoute) {
    return (
      <ErrorBoundary>
        <div className="landing-font min-h-screen bg-black text-white">
          <AppRouter />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-slate-100">
        {!isAdminRoute && !isLoginRoute && <Snowfall />}
        {!isAdminRoute && !isLoginRoute && <ChristmasMusic />}
        <div className={`${shellClass} flex-col relative z-10`}>
          {!isLoginRoute && (
            <header className="mb-8 rounded-2xl border border-emerald-700/40 bg-slate-900/80 px-6 py-4 shadow-lg shadow-emerald-900/40 backdrop-blur-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">🎄 Christmas Event</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {navItems.map((item) => {
                    const active = location.pathname === item.path;
                    return (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => navigate(item.path)}
                        className={`rounded-full px-3 py-2 text-sm font-semibold transition border ${
                          active
                            ? "border-gold-400 bg-gradient-to-r from-emerald-600 to-gold-500 text-white shadow-gold-500/30"
                            : "border-emerald-700/60 bg-slate-800/80 text-emerald-100 hover:border-emerald-400/70"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </header>
          )}
          <main className="flex-1">
            <ToastProvider>
              <AppRouter />
            </ToastProvider>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;

// src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppRouter from "./router/AppRouter";
import ToastProvider from "./components/common/ToastProvider";
import ErrorBoundary from "./components/common/ErrorBoundary";
import ChristmasMusic from "./components/common/ChristmasMusic";
import Snowfall from "./components/common/Snowfall";

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showSnow, setShowSnow] = useState<boolean>(() => {
    const saved = localStorage.getItem("xmas_show_snow");
    return saved !== "false"; // default on
  });
  const [showMusic, setShowMusic] = useState<boolean>(() => {
    const saved = localStorage.getItem("xmas_show_music");
    return saved !== "false"; // default on (component 내부에서 다시 플레이 제어)
  });

  useEffect(() => {
    localStorage.setItem("xmas_show_snow", showSnow.toString());
  }, [showSnow]);

  useEffect(() => {
    localStorage.setItem("xmas_show_music", showMusic.toString());
  }, [showMusic]);

  const navItems = useMemo(
    () => [
      { label: "홈", path: "/" },
      { label: "팀 배틀", path: "/team-battle" },
      { label: "시즌패스", path: "/season-pass" },
      { label: "설문", path: "/surveys" },
    ],
    []
  );

  const isAdminRoute = location.pathname.startsWith("/admin");
  const shellClass = isAdminRoute
    ? "mx-auto flex min-h-screen w-full max-w-7xl px-4 sm:px-6 lg:px-10 py-8"
    : "mx-auto flex min-h-screen max-w-5xl px-4 py-8";

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-slate-100">
        {/* 크리스마스 효과 (토글 가능) */}
        {showSnow && <Snowfall />}
        {showMusic && <ChristmasMusic />}
        
        <div className={`${shellClass} flex-col relative z-10`}>
          <header className="mb-8 rounded-2xl border border-emerald-700/40 bg-slate-900/80 px-6 py-4 shadow-lg shadow-emerald-900/40 backdrop-blur-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">🎄 Christmas Event</p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-emerald-100">
                  <span className="rounded-full border border-emerald-500/50 bg-emerald-900/40 px-3 py-1">12/15 시작 · Asia/Seoul</span>
                  <span className="rounded-full border border-red-400/50 bg-red-900/30 px-3 py-1">Merry CC-Mas!</span>
                </div>
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
                <div className="flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-800/80 px-3 py-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowSnow((v) => !v)}
                    className={`rounded-full px-2 py-1 font-semibold transition ${showSnow ? "bg-emerald-700 text-white" : "bg-slate-700 text-slate-200"}`}
                    title="눈 효과 토글"
                  >
                    ❄️ Snow
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMusic((v) => !v)}
                    className={`rounded-full px-2 py-1 font-semibold transition ${showMusic ? "bg-red-700 text-white" : "bg-slate-700 text-slate-200"}`}
                    title="캐롤 토글"
                  >
                    🎵 Music
                  </button>
                </div>
              </div>
            </div>
          </header>
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

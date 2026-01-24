// src/App.tsx
import React from "react";
import AppRouter from "./router/AppRouter";
import ToastProvider from "./components/common/ToastProvider";
import ErrorBoundary from "./components/common/ErrorBoundary";
import Ch25EventsListener from "./components/common/Ch25EventsListener";

import { useLocation } from "react-router-dom";
import { useSound } from "./hooks/useSound";

const App: React.FC = () => {
  const location = useLocation();
  const { playPageTransition, startMainBgm, stopBgm } = useSound();

  // Play sound on route change
  React.useEffect(() => {
    playPageTransition();
  }, [location.pathname, playPageTransition]);

  // BGM: auto-start in user area only (exclude /admin)
  React.useEffect(() => {
    const isAdmin = location.pathname.startsWith("/admin");
    if (isAdmin) {
      stopBgm();
      return;
    }
    startMainBgm();
  }, [location.pathname, startMainBgm, stopBgm]);

  return (
    <ErrorBoundary>
      <div className="min-h-[100dvh]">
        <ToastProvider>
          <Ch25EventsListener />
          <AppRouter />
        </ToastProvider>
      </div>
    </ErrorBoundary>
  );
};

export default App;

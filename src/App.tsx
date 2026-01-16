// src/App.tsx
import React from "react";
import AppRouter from "./router/AppRouter";
import ToastProvider from "./components/common/ToastProvider";
import ErrorBoundary from "./components/common/ErrorBoundary";

import { useLocation } from "react-router-dom";
import { useSound } from "./hooks/useSound";

const App: React.FC = () => {
  const location = useLocation();
  const { playPageTransition, startMainBgm } = useSound();

  // [BGM Logic] Start BGM globally unless on specific pages
  React.useEffect(() => {
    const isLogin = location.pathname === "/login";
    const isAdmin = location.pathname.startsWith("/admin");
    
    if (!isLogin && !isAdmin) {
        startMainBgm();
    }
  }, [location.pathname, startMainBgm]);

  // Play sound on route change
  React.useEffect(() => {
    playPageTransition();
  }, [location.pathname, playPageTransition]);

  return (
    <ErrorBoundary>
      <div className="min-h-[100dvh]">
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </div>
    </ErrorBoundary>
  );
};

export default App;

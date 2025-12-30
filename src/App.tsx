// src/App.tsx
import React from "react";
import AppRouter from "./router/AppRouter";
import ToastProvider from "./components/common/ToastProvider";
import ErrorBoundary from "./components/common/ErrorBoundary";

import { useAuth } from "./auth/authStore";
import { useTelegram } from "./providers/TelegramProvider";
import { useLocation, useNavigate } from "react-router-dom";
import { useSound } from "./hooks/useSound";

const App: React.FC = () => {
  const { initData, isReady } = useTelegram();
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { playPageTransition } = useSound();

  // Play sound on route change
  React.useEffect(() => {
    playPageTransition();
  }, [location.pathname, playPageTransition]);

  React.useEffect(() => {
    // If we're in TMA (initData exists) but not logged in (no token),
    // and we're NOT already on the /connect page, redirect to it.
    if (isReady && initData && !token && location.pathname !== "/connect") {
      navigate("/connect", { replace: true });
    }
  }, [initData, isReady, token, location.pathname, navigate]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </div>
    </ErrorBoundary>
  );
};

export default App;

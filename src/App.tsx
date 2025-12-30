// src/App.tsx
import React from "react";
import AppRouter from "./router/AppRouter";
import ToastProvider from "./components/common/ToastProvider";
import ErrorBoundary from "./components/common/ErrorBoundary";

import { useAuth } from "./auth/authStore";
import { useTelegram } from "./providers/TelegramProvider";
import { useLocation, useNavigate } from "react-router-dom";
import { useSound } from "./hooks/useSound";
import { telegramApi } from "./api/telegramApi";

const App: React.FC = () => {
  const { initData, startParam, isReady } = useTelegram();
  const { token, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { playPageTransition } = useSound();
  const [isAuthAttempted, setIsAuthAttempted] = React.useState(false);

  // Play sound on route change
  React.useEffect(() => {
    playPageTransition();
  }, [location.pathname, playPageTransition]);

  React.useEffect(() => {
    // 1. Handle Magic Link Auto-Auth (One-click Bridge)
    if (isReady && initData && !token && startParam && !isAuthAttempted) {
      const attemptAutoAuth = async () => {
        setIsAuthAttempted(true);
        try {
          console.log("[TMA] Attempting auto-binding with startParam:", startParam);
          const response = await telegramApi.auth(initData, startParam);
          login(response.access_token, response.user);
          // Auto-login successful! No redirect needed.
        } catch (err) {
          console.error("[TMA] Auto-binding failed", err);
          navigate("/connect", { replace: true });
        }
      };
      attemptAutoAuth();
      return;
    }

    // 2. Normal Connect Redirect (If no startParam)
    if (isReady && initData && !token && !startParam && location.pathname !== "/connect") {
      navigate("/connect", { replace: true });
    }
  }, [initData, isReady, token, startParam, location.pathname, navigate, login, isAuthAttempted]);

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

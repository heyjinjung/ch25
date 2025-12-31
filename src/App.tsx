// src/App.tsx
import React from "react";
import AppRouter from "./router/AppRouter";
import ToastProvider from "./components/common/ToastProvider";
import ErrorBoundary from "./components/common/ErrorBoundary";

import { useAuth } from "./auth/authStore";
import { useTelegram } from "./providers/TelegramProvider";
import { useLocation } from "react-router-dom";
import { useSound } from "./hooks/useSound";
import { telegramApi } from "./api/telegramApi";

const App: React.FC = () => {
  const { initData, startParam, isReady } = useTelegram();
  const { token, login } = useAuth();
  const location = useLocation();
  const { playPageTransition } = useSound();
  const [isAuthAttempted, setIsAuthAttempted] = React.useState(false);

  // Play sound on route change
  React.useEffect(() => {
    playPageTransition();
  }, [location.pathname, playPageTransition]);

  React.useEffect(() => {
    // Single Entry Point: Auto-Auth for all Telegram Users
    if (isReady && initData && !token && !isAuthAttempted) {
      const attemptAutoAuth = async () => {
        setIsAuthAttempted(true);
        try {
          console.log("[TMA] Authenticating via Telegram Native Flow...");
          const response = await telegramApi.auth(initData, startParam);
          login(response.access_token, response.user);
        } catch (err) {
          console.error("[TMA] Authentication failed", err);
          // Optional: Show a "Contact Support" or "Retry" screen if serious error
        }
      };
      attemptAutoAuth();
    }
  }, [initData, isReady, token, startParam, login, isAuthAttempted]);

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

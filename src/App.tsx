// src/App.tsx
import React from "react";
import AppRouter from "./router/AppRouter";
import ToastProvider from "./components/common/ToastProvider";
import ErrorBoundary from "./components/common/ErrorBoundary";

import { useAuth } from "./auth/authStore";
import { useTelegram } from "./providers/TelegramProvider";
import { telegramApi } from "./api/telegramApi";

const App: React.FC = () => {
  const { initData, isReady } = useTelegram();
  const { login, token } = useAuth();

  React.useEffect(() => {
    const performTelegramLogin = async () => {
      if (initData && !token) {
        try {
          const response = await telegramApi.auth(initData);
          login(response.access_token, response.user);
          console.log("[TELEGRAM] Auto-login successful");
        } catch (error) {
          console.error("[TELEGRAM] Auto-login failed", error);
        }
      }
    };

    if (isReady) {
      performTelegramLogin();
    }
  }, [initData, isReady, token, login]);

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

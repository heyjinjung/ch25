// src/App.tsx
import React from "react";
import AppRouter from "./router/AppRouter";
import ToastProvider from "./components/common/ToastProvider";
import ErrorBoundary from "./components/common/ErrorBoundary";

import { useLocation } from "react-router-dom";
import { useSound } from "./hooks/useSound";

const App: React.FC = () => {
  const location = useLocation();
  const { playPageTransition } = useSound();

  // Play sound on route change
  React.useEffect(() => {
    playPageTransition();
  }, [location.pathname, playPageTransition]);

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

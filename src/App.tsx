// src/App.tsx
import React from "react";
import { useLocation } from "react-router-dom";
import AppRouter from "./router/AppRouter";
import ToastProvider from "./components/common/ToastProvider";
import ErrorBoundary from "./components/common/ErrorBoundary";
import ChristmasMusic from "./components/common/ChristmasMusic";
import Snowfall from "./components/common/Snowfall";

const App: React.FC = () => {
  const location = useLocation();
  const isLoginRoute = location.pathname === "/login";
  const isAdminRoute = location.pathname.startsWith("/admin");
  const showDecorations = !isAdminRoute && !isLoginRoute;

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        {showDecorations && <Snowfall />}
        {showDecorations && <ChristmasMusic />}
        <ToastProvider>
          <AppRouter />
        </ToastProvider>
      </div>
    </ErrorBoundary>
  );
};

export default App;

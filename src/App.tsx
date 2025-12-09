// src/App.tsx
import React from "react";
import AppRouter from "./router/AppRouter";
import ToastProvider from "./components/common/ToastProvider";
import ErrorBoundary from "./components/common/ErrorBoundary";

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-slate-100">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8">
          <header className="mb-8 flex items-center justify-center rounded-2xl border border-emerald-700/40 bg-slate-900/70 px-6 py-4 shadow-lg shadow-emerald-900/40">
            <div className="text-center">
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">🎄 크리스마스 위크</p>
              <h1 className="text-2xl font-bold">이벤트 & 시즌패스 포털</h1>
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
